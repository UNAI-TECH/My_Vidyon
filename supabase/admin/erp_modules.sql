-- Comprehensive ERP Modules Infrastructure

-- 1. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present', -- 'present', 'absent', 'late', 'half-day'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(student_id, date)
);

-- 2. Fees & Payments
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Annual Tuition Fee"
  amount DECIMAL(12,2) NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES public.fee_structures(id),
  amount_paid DECIMAL(12,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'failed'
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Exams & Marks
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Final Term"
  date DATE,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.exam_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id),
  marks_obtained DECIMAL(5,2),
  max_marks DECIMAL(5,2) DEFAULT 100.00,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(exam_id, student_id, subject_id)
);

-- 4. Announcements / Notice Board
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT NOT NULL, -- Can be 'PLATFORM' for global notices
  title TEXT NOT NULL,
  content TEXT,
  target_audience TEXT DEFAULT 'all', -- 'all', 'faculty', 'students', 'parents'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 6. Basic Policies
CREATE POLICY "Allow read for auth" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for auth" ON public.fee_structures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for auth" ON public.fee_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for auth" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for auth" ON public.exam_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for auth" ON public.announcements FOR SELECT TO authenticated USING (true);

-- 7. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- 8. Add Logging Triggers for important events
CREATE OR REPLACE FUNCTION public.tr_log_new_payment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_platform_activity(
    'Fee Payment Received',
    'Amount: ₹' || NEW.amount_paid,
    'success',
    jsonb_build_object('payment_id', NEW.id, 'student_id', NEW.student_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_payment_created
  AFTER INSERT ON public.fee_payments
  FOR EACH ROW EXECUTE PROCEDURE public.tr_log_new_payment();

CREATE OR REPLACE FUNCTION public.tr_log_new_announcement()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_platform_activity(
    'New Announcement',
    NEW.title,
    'info',
    jsonb_build_object('announcement_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_announcement_created
  AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE PROCEDURE public.tr_log_new_announcement();

-- 9. Timetable
CREATE TABLE IF NOT EXISTS public.timetable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id),
  subject_id UUID REFERENCES public.subjects(id),
  faculty_id UUID REFERENCES public.profiles(id),
  day_of_week TEXT NOT NULL, -- 'Monday', etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 10. Library Management
CREATE TABLE IF NOT EXISTS public.library_books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  quantity INTEGER DEFAULT 1,
  available_quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.library_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.library_books(id),
  user_id UUID REFERENCES public.profiles(id),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  return_date DATE,
  status TEXT DEFAULT 'issued', -- 'issued', 'returned', 'overdue'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 11. Transport Management
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  stops JSONB DEFAULT '[]'::jsonb,
  fare DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  driver_name TEXT,
  driver_phone TEXT,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS & Realtime for new modules
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for auth" ON public.timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for auth" ON public.library_books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for auth" ON public.library_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for auth" ON public.transport_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for auth" ON public.transport_vehicles FOR SELECT TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable;
ALTER PUBLICATION supabase_realtime ADD TABLE public.library_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_vehicles;
