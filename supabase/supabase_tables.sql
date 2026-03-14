-- PROFILES TABLE (Used for Staff and other users)
-- Based on fields used in UserDialogs.tsx for Faculty/Staff
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, -- Links to Supabase Auth User
  email text unique not null,
  full_name text,
  role text check (role in ('faculty', 'admin', 'teacher', 'support', 'student', 'parent')),
  institution_id uuid, -- Should reference an institutions table if exists
  staff_id text, -- Specific to staff
  department text, -- Specific to staff
  phone text,
  date_of_birth date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- STUDENTS TABLE
-- Based on fields used in InstitutionUsers.tsx and AddStudentDialog
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  register_number text,
  class_name text,
  section text,
  parent_name text,
  parent_email text,
  parent_phone text,
  parent_contact text, -- Alias for parent_phone if needed, or normalize to one column
  address text,
  dob date,
  gender text,
  institution_id uuid, -- Should reference institutions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.students enable row level security;

-- Policies for Students
create policy "Enable read access for all users" on public.students for select using (true);
create policy "Enable insert for authenticated users only" on public.students for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on public.students for update using (auth.role() = 'authenticated');

-- STAFF SUBJECTS (Optional, as suggested by "Subjects" field in UI)
create table if not exists public.staff_subjects (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.profiles(id) on delete cascade,
  subject_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
