-- ============================================================
-- Migration: SuperAdmin Dropdowns, Master Catalog & Templates
-- Purpose:
--   1. Extend institutions with category, ownership, board/stream, catalog & timetable template IDs
--   2. Create master_institutions_catalog for anti-duplication & pre-configured school/college onboarding
--   3. Create institution_templates for structure, subjects, departments & timetables
--   4. Seed rich master catalog and templates for schools & colleges
-- ============================================================

-- 1. Extend institutions table
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS institution_category TEXT DEFAULT 'school' CHECK (institution_category IN ('school', 'college')),
  ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'private' CHECK (ownership_type IN ('private', 'public')),
  ADD COLUMN IF NOT EXISTS board_or_university TEXT,
  ADD COLUMN IF NOT EXISTS master_catalog_id UUID,
  ADD COLUMN IF NOT EXISTS timetable_template_id TEXT;

-- Clean up any existing duplicate names in legacy data before creating unique index
-- If duplicates exist (e.g. repeated test creations), appends (institution_id) to duplicates
DO $$
BEGIN
  WITH duplicates AS (
    SELECT id,
           institution_id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(TRIM(name)) 
             ORDER BY created_at ASC NULLS LAST, id ASC
           ) as rn
    FROM public.institutions
    WHERE status != 'deleted'
  )
  UPDATE public.institutions i
  SET name = TRIM(i.name) || ' (' || d.institution_id || ')'
  FROM duplicates d
  WHERE i.id = d.id AND d.rn > 1;
END $$;

-- Safe lower unique index to prevent duplicate institution names
CREATE UNIQUE INDEX IF NOT EXISTS uq_institutions_lower_name 
  ON public.institutions (LOWER(TRIM(name))) 
  WHERE status != 'deleted';

-- 2. Create master_institutions_catalog
CREATE TABLE IF NOT EXISTS public.master_institutions_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  institution_category TEXT NOT NULL CHECK (institution_category IN ('school', 'college')),
  ownership_type TEXT NOT NULL CHECK (ownership_type IN ('private', 'public')),
  board_or_university TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  map_link TEXT,
  email TEXT,
  office_phone TEXT,
  guard_phone TEXT,
  transport_phone TEXT,
  has_kg BOOLEAN DEFAULT false,
  academic_stages JSONB DEFAULT '[]'::jsonb,
  default_structure_template_key TEXT,
  default_subject_template_key TEXT,
  default_timetable_template_key TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

ALTER TABLE public.master_institutions_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.master_institutions_catalog;
CREATE POLICY "Allow read access to authenticated users" 
  ON public.master_institutions_catalog 
  FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Allow full access for superadmins" ON public.master_institutions_catalog;
CREATE POLICY "Allow full access for superadmins" 
  ON public.master_institutions_catalog 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('superadmin', 'super_admin')
    )
  );

-- 3. Create institution_templates
CREATE TABLE IF NOT EXISTS public.institution_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  institution_category TEXT NOT NULL CHECK (institution_category IN ('school', 'college')),
  ownership_type TEXT CHECK (ownership_type IN ('private', 'public', 'both')),
  template_type TEXT NOT NULL CHECK (template_type IN ('structure', 'subjects', 'timetable', 'departments', 'full_bundle')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

ALTER TABLE public.institution_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to templates for authenticated" ON public.institution_templates;
CREATE POLICY "Allow read access to templates for authenticated" 
  ON public.institution_templates 
  FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Allow full template access for superadmins" ON public.institution_templates;
CREATE POLICY "Allow full template access for superadmins" 
  ON public.institution_templates 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('superadmin', 'super_admin')
    )
  );

-- 4. Seed initial catalog items
INSERT INTO public.master_institutions_catalog (
  institution_code, name, institution_category, ownership_type, board_or_university,
  address_line_1, address_line_2, city, state, pincode,
  latitude, longitude, map_link, email, office_phone, guard_phone, transport_phone,
  has_kg, academic_stages, default_structure_template_key, default_subject_template_key, default_timetable_template_key
) VALUES
-- Private Schools
(
  'DPS-CHN-01', 'Delhi Public School (DPS) - Chennai Campus', 'school', 'private', 'CBSE',
  'No. 45, Gandhi Road, Velachery', 'Near Phoenix Mall', 'Chennai', 'Tamil Nadu', '600042',
  12.9815, 80.2180, 'https://maps.google.com/?q=12.9815,80.2180', 'info.chennai@dps.edu.in',
  '+91 44 2244 5566', '+91 98401 22334', '+91 98402 33445',
  true, '["pre_primary", "primary", "middle", "secondary", "higher_secondary"]'::jsonb,
  'school_private_k12', 'school_cbse_k12', 'tt_school_private_8p'
),
(
  'NPS-BLR-02', 'National Public School (NPS) - Indiranagar', 'school', 'private', 'CBSE',
  '12th Main Rd, HAL 2nd Stage', 'Opposite BDA Complex', 'Bengaluru', 'Karnataka', '560038',
  12.9719, 77.6412, 'https://maps.google.com/?q=12.9719,77.6412', 'admissions@npsindiranagar.com',
  '+91 80 2528 0611', '+91 98450 11223', '+91 98451 22334',
  true, '["pre_primary", "primary", "middle", "secondary"]'::jsonb,
  'school_private_k10', 'school_cbse_k10', 'tt_school_private_8p'
),
-- Public / Government Schools
(
  'KV-IIT-MDS', 'Kendriya Vidyalaya (KV) - IIT Madras Campus', 'school', 'public', 'CBSE',
  'IIT Madras Campus, Sardar Patel Road', 'Adyar', 'Chennai', 'Tamil Nadu', '600036',
  12.9915, 80.2337, 'https://maps.google.com/?q=12.9915,80.2337', 'kviitchennai@gmail.com',
  '+91 44 2257 0041', '+91 94440 55667', '+91 94441 66778',
  false, '["primary", "middle", "secondary", "higher_secondary"]'::jsonb,
  'school_public_1_12', 'school_cbse_k12', 'tt_school_public_7p'
),
(
  'GHSS-CMB-04', 'Government Higher Secondary School - Town Hall', 'school', 'public', 'State Board',
  'Near Clock Tower, Big Bazaar Street', 'Town Hall', 'Coimbatore', 'Tamil Nadu', '641001',
  11.0018, 76.9629, 'https://maps.google.com/?q=11.0018,76.9629', 'ghss.coimbatore@tn.gov.in',
  '+91 422 2390 123', '+91 94420 12345', '+91 94421 23456',
  false, '["middle", "secondary", "higher_secondary"]'::jsonb,
  'school_public_1_12', 'school_state_1_12', 'tt_school_public_7p'
),
-- Private Colleges
(
  'SSN-ENG-01', 'SSN College of Engineering (Autonomous)', 'college', 'private', 'Engineering & Technology (AICTE / Anna Univ)',
  'Old Mahabalipuram Road (OMR), Kalavakkam', 'Rajiv Gandhi Salai', 'Chennai', 'Tamil Nadu', '603110',
  12.7508, 80.1970, 'https://maps.google.com/?q=12.7508,80.1970', 'admissions@ssn.edu.in',
  '+91 44 2746 9700', '+91 98409 88776', '+91 98408 77665',
  false, '["higher_secondary"]'::jsonb,
  'college_private_engineering', 'college_eng_aicte', 'tt_college_eng_7h'
),
(
  'LOYOLA-ARTS-02', 'Loyola College (Autonomous)', 'college', 'private', 'Arts & Science',
  'Sterling Road, Nungambakkam', 'Near Loyola Railway Station', 'Chennai', 'Tamil Nadu', '600034',
  13.0644, 80.2338, 'https://maps.google.com/?q=13.0644,80.2338', 'contact@loyolacollege.edu',
  '+91 44 2817 8200', '+91 98400 44556', '+91 98401 55667',
  false, '["higher_secondary"]'::jsonb,
  'college_private_arts_science', 'college_arts_ug', 'tt_college_arts_shift1'
),
-- Public / Government Colleges
(
  'CEG-ANNA-01', 'College of Engineering, Guindy (Anna University)', 'college', 'public', 'Engineering & Technology (AICTE / Anna Univ)',
  'Sardar Patel Road, Guindy', 'Anna University Main Campus', 'Chennai', 'Tamil Nadu', '600025',
  13.0102, 80.2354, 'https://maps.google.com/?q=13.0102,80.2354', 'deanceg@annauniv.edu',
  '+91 44 2235 8000', '+91 94442 33445', '+91 94443 44556',
  false, '["higher_secondary"]'::jsonb,
  'college_public_engineering', 'college_eng_aicte', 'tt_college_eng_7h'
),
(
  'PRESIDENCY-02', 'Presidency College (Autonomous - Govt Aided)', 'college', 'public', 'Arts & Science',
  'Kamarajar Salai, Marina Beach Road', 'Chepauk', 'Chennai', 'Tamil Nadu', '600005',
  13.0583, 80.2825, 'https://maps.google.com/?q=13.0583,80.2825', 'principal@presidencycollege.ac.in',
  '+91 44 2854 4894', '+91 94445 66778', '+91 94446 77889',
  false, '["higher_secondary"]'::jsonb,
  'college_public_arts_science', 'college_arts_ug', 'tt_college_arts_shift1'
)
ON CONFLICT (institution_code) DO NOTHING;

-- 5. Seed Core Templates
INSERT INTO public.institution_templates (
  template_key, name, description, institution_category, ownership_type, template_type, payload
) VALUES
-- Structure Template: School Private K-12
(
  'school_private_k12',
  'School: Complete K-12 (Pre-KG to 12th Standard)',
  'Comprehensive structure with Pre-Primary, Primary, Middle, High, and Higher Secondary streams with A, B, C sections',
  'school', 'private', 'structure',
  '[
    {"name": "Pre-Primary (Kindergarten)", "stage": "pre_primary", "classes": [{"name": "Pre-KG", "sections": ["A", "B"]}, {"name": "LKG", "sections": ["A", "B", "C"]}, {"name": "UKG", "sections": ["A", "B", "C"]}]},
    {"name": "Primary School (1st to 5th)", "stage": "primary", "classes": [{"name": "1st Standard", "sections": ["A", "B", "C"]}, {"name": "2nd Standard", "sections": ["A", "B", "C"]}, {"name": "3rd Standard", "sections": ["A", "B", "C"]}, {"name": "4th Standard", "sections": ["A", "B", "C"]}, {"name": "5th Standard", "sections": ["A", "B", "C"]}]},
    {"name": "Middle School (6th to 8th)", "stage": "middle", "classes": [{"name": "6th Standard", "sections": ["A", "B", "C"]}, {"name": "7th Standard", "sections": ["A", "B", "C"]}, {"name": "8th Standard", "sections": ["A", "B", "C"]}]},
    {"name": "High School (9th & 10th)", "stage": "secondary", "classes": [{"name": "9th Standard", "sections": ["A", "B"]}, {"name": "10th Standard", "sections": ["A", "B"], "is_final_class": true}]},
    {"name": "Higher Secondary (11th & 12th)", "stage": "higher_secondary", "classes": [{"name": "11th Standard", "sections": ["A", "B", "C"]}, {"name": "12th Standard", "sections": ["A", "B", "C"], "is_final_class": true}]}
  ]'::jsonb
),
-- Structure Template: College Private Engineering
(
  'college_private_engineering',
  'College: Engineering & Technology (B.E. / B.Tech / M.Tech / MBA)',
  '4-Year UG Degrees (Semesters 1-8) & 2-Year PG Degrees across Core Engineering and Management branches',
  'college', 'private', 'structure',
  '[
    {"name": "UG - B.E. / B.Tech (4 Years)", "stage": "higher_secondary", "classes": [
      {"name": "Year 1 (Semester 1 & 2)", "sections": ["A", "B", "C"]},
      {"name": "Year 2 (Semester 3 & 4)", "sections": ["A", "B", "C"]},
      {"name": "Year 3 (Semester 5 & 6)", "sections": ["A", "B", "C"]},
      {"name": "Year 4 (Semester 7 & 8)", "sections": ["A", "B"], "is_final_class": true}
    ]},
    {"name": "PG - M.E. / M.Tech / MBA (2 Years)", "stage": "higher_secondary", "classes": [
      {"name": "PG Year 1 (Semester 1 & 2)", "sections": ["A", "B"]},
      {"name": "PG Year 2 (Semester 3 & 4)", "sections": ["A", "B"], "is_final_class": true}
    ]}
  ]'::jsonb
),
-- Structure Template: College Private Arts & Science
(
  'college_private_arts_science',
  'College: Arts, Science & Commerce (UG & PG)',
  '3-Year UG Degree Courses (B.Sc, B.Com, B.A, BBA) and 2-Year Post-Graduate Programs',
  'college', 'private', 'structure',
  '[
    {"name": "UG - Arts & Science (3 Years)", "stage": "higher_secondary", "classes": [
      {"name": "UG 1st Year (Sem 1 & 2)", "sections": ["A", "B", "C"]},
      {"name": "UG 2nd Year (Sem 3 & 4)", "sections": ["A", "B", "C"]},
      {"name": "UG 3rd Year (Sem 5 & 6)", "sections": ["A", "B", "C"], "is_final_class": true}
    ]},
    {"name": "PG - Master Degrees (2 Years)", "stage": "higher_secondary", "classes": [
      {"name": "PG 1st Year (Sem 1 & 2)", "sections": ["A", "B"]},
      {"name": "PG 2nd Year (Sem 3 & 4)", "sections": ["A", "B"], "is_final_class": true}
    ]}
  ]'::jsonb
),
-- Timetable Template: School Private 8 Periods
(
  'tt_school_private_8p',
  'School: 8 Periods / Day (08:30 - 15:30)',
  '8 Periods of 45 minutes with morning snack break (15m), lunch break (45m), and afternoon break (10m)',
  'school', 'both', 'timetable',
  '{
    "days_of_week": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "periods_per_day": 8,
    "start_time": "08:30:00",
    "period_duration_minutes": 45,
    "break_configs": [
      {"after_period": 2, "duration": 15, "type": "Short Break"},
      {"after_period": 4, "duration": 45, "type": "Lunch"},
      {"after_period": 6, "duration": 10, "type": "Short Break"}
    ]
  }'::jsonb
),
-- Timetable Template: College Engineering 7 Hours
(
  'tt_college_eng_7h',
  'College: 7 Hours / Day (09:00 - 16:30)',
  '7 Lecture and Laboratory hours of 50 minutes with morning tea break and lunch interval',
  'college', 'both', 'timetable',
  '{
    "days_of_week": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "periods_per_day": 7,
    "start_time": "09:00:00",
    "period_duration_minutes": 50,
    "break_configs": [
      {"after_period": 2, "duration": 15, "type": "Tea Break"},
      {"after_period": 4, "duration": 50, "type": "Lunch"}
    ]
  }'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  payload = EXCLUDED.payload;
