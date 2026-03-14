CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    full_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT CHECK (role IN ('admin', 'institution', 'faculty', 'teacher', 'staff', 'student', 'parent')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    section TEXT DEFAULT 'A',
    academic_year TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(institution_id, name, section, academic_year)
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    class_name TEXT,
    description TEXT,
    credits INTEGER DEFAULT 1,
    instructor_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faculty_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    faculty_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('class_teacher', 'subject_staff')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    class_name TEXT NOT NULL,
    section TEXT DEFAULT 'A',
    roll_number TEXT,
    admission_date DATE,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS public.grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    marks DECIMAL NOT NULL,
    total_marks DECIMAL NOT NULL DEFAULT 100,
    exam_type TEXT,
    date DATE NOT NULL,
    grade_letter TEXT,
    remarks TEXT,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ NOT NULL,
    total_marks DECIMAL DEFAULT 100,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    submission_url TEXT,
    submission_text TEXT,
    grade DECIMAL,
    feedback TEXT,
    status TEXT CHECK (status IN ('pending', 'submitted', 'graded', 'late')) DEFAULT 'submitted',
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'on_leave')),
    check_in_time TIME,
    check_out_time TIME,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(staff_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    fee_type TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
    due_date DATE,
    paid_date DATE,
    payment_method TEXT,
    transaction_id TEXT,
    receipt_url TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    published_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT now(),
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    config_id UUID,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    period_index INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number TEXT,
    is_break BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_institution ON public.students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON public.students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_name, section);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.student_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_institution ON public.student_attendance(institution_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON public.grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_date ON public.grades(date);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_institution ON public.fee_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_fees_status ON public.fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON public.timetable_slots(faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON public.timetable_slots(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON public.timetable_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_events_institution ON public.academic_events(institution_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.academic_events(event_date);

DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('institutions', 'profiles', 'classes', 'subjects', 'faculty_subjects', 'students', 'student_attendance', 'grades', 'assignments', 'submissions', 'leave_requests', 'staff_attendance', 'fee_payments', 'academic_events', 'announcements', 'notifications', 'timetable_slots')
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t_name);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END LOOP;
END $$;

DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('institutions', 'profiles', 'classes', 'subjects', 'faculty_subjects', 'students', 'student_attendance', 'grades', 'assignments', 'submissions', 'leave_requests', 'staff_attendance', 'fee_payments', 'academic_events', 'announcements', 'notifications', 'timetable_slots')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
    END LOOP;
END $$;

DROP POLICY IF EXISTS "Students view own record" ON public.students;
CREATE POLICY "Students view own record" ON public.students FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Parents view children" ON public.students;
CREATE POLICY "Parents view children" ON public.students FOR SELECT TO authenticated USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "Institution manages students" ON public.students;
CREATE POLICY "Institution manages students" ON public.students FOR ALL TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')));

DROP POLICY IF EXISTS "Students view own attendance" ON public.student_attendance;
CREATE POLICY "Students view own attendance" ON public.student_attendance FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Parents view children attendance" ON public.student_attendance;
CREATE POLICY "Parents view children attendance" ON public.student_attendance FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()));

DROP POLICY IF EXISTS "Institution manages attendance" ON public.student_attendance;
CREATE POLICY "Institution manages attendance" ON public.student_attendance FOR ALL TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')));

DROP POLICY IF EXISTS "Students view own grades" ON public.grades;
CREATE POLICY "Students view own grades" ON public.grades FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Parents view children grades" ON public.grades;
CREATE POLICY "Parents view children grades" ON public.grades FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()));

DROP POLICY IF EXISTS "Institution manages grades" ON public.grades;
CREATE POLICY "Institution manages grades" ON public.grades FOR ALL TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')));

DROP POLICY IF EXISTS "Students view assignments" ON public.assignments;
CREATE POLICY "Students view assignments" ON public.assignments FOR SELECT TO authenticated USING (institution_id IN (SELECT institution_id FROM public.students WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Institution manages assignments" ON public.assignments;
CREATE POLICY "Institution manages assignments" ON public.assignments FOR ALL TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')));

DROP POLICY IF EXISTS "Students manage own submissions" ON public.submissions;
CREATE POLICY "Students manage own submissions" ON public.submissions FOR ALL TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers view submissions" ON public.submissions;
CREATE POLICY "Teachers view submissions" ON public.submissions FOR SELECT TO authenticated USING (assignment_id IN (SELECT id FROM public.assignments WHERE teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Students view own fees" ON public.fee_payments;
CREATE POLICY "Students view own fees" ON public.fee_payments FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Parents view children fees" ON public.fee_payments;
CREATE POLICY "Parents view children fees" ON public.fee_payments FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()));

DROP POLICY IF EXISTS "Institution manages fees" ON public.fee_payments;
CREATE POLICY "Institution manages fees" ON public.fee_payments FOR ALL TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin')));

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Institution views profiles" ON public.profiles;
CREATE POLICY "Institution views profiles" ON public.profiles FOR SELECT TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin')));

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students manage leave requests" ON public.leave_requests;
CREATE POLICY "Students manage leave requests" ON public.leave_requests FOR ALL TO authenticated USING (student_id = auth.uid() OR student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()));

DROP POLICY IF EXISTS "Institution manages leave requests" ON public.leave_requests;
CREATE POLICY "Institution manages leave requests" ON public.leave_requests FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')));

DROP POLICY IF EXISTS "Everyone views events" ON public.academic_events;
CREATE POLICY "Everyone views events" ON public.academic_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Institution manages events" ON public.academic_events;
CREATE POLICY "Institution manages events" ON public.academic_events FOR ALL TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin')));

DROP POLICY IF EXISTS "Everyone views announcements" ON public.announcements;
CREATE POLICY "Everyone views announcements" ON public.announcements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Institution manages announcements" ON public.announcements;
CREATE POLICY "Institution manages announcements" ON public.announcements FOR ALL TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin')));

DROP POLICY IF EXISTS "Faculty view own assignments" ON public.faculty_subjects;
CREATE POLICY "Faculty view own assignments" ON public.faculty_subjects FOR SELECT TO authenticated USING (faculty_profile_id = auth.uid());

DROP POLICY IF EXISTS "Institution manages faculty_subjects" ON public.faculty_subjects;
CREATE POLICY "Institution manages faculty_subjects" ON public.faculty_subjects FOR ALL TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin')));

DROP POLICY IF EXISTS "Everyone views timetable" ON public.timetable_slots;
CREATE POLICY "Everyone views timetable" ON public.timetable_slots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Institution manages timetable" ON public.timetable_slots;
CREATE POLICY "Institution manages timetable" ON public.timetable_slots FOR ALL TO authenticated USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')));
