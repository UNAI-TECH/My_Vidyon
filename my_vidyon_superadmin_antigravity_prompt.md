# My Vidyon ERP — Codebase Analysis & Antigravity Master Prompt (SuperAdmin Dropdowns, School/College Onboarding & Timetable Templates)

## 1. Executive Codebase Analysis (`my-vidyon-rebuild`)

An end-to-end inspection of your **My Vidyon** repository (`Expo SDK 57` + `React Native 0.86` + `Expo Router` + `Supabase` + `TanStack Query` + `TypeScript`) reveals how the SuperAdmin portal (`app/(root)/admin/*`) and Onboarding engine (`app/(root)/admin/onboarding/index.tsx`) are currently built and where manual text entry ("entering method") and card-based buttons need to be replaced with dropdown-driven tables and template workflows.

### Current Architecture vs. Required Modifications

| Module / File Path | Current Implementation in Repository | Required Modification |
| :--- | :--- | :--- |
| `app/(root)/admin/onboarding/index.tsx` | 5-step wizard (`Basic Info`, `Admin Account`, `Structure`, `Subjects`, `Review`). `basicInfo.type` is hardcoded to `'school'`. Institution Name, School Code, Address, City, State, Pincode, Group Names, Class Names, Sections, Department Names, and Subject Names use manual `<TextInput>` / `<FormField>` entry. Only has 3 hardcoded school buttons (`Full K-10`, `1st to 10th`, `KG Only`) and zero College templates or Timetable templates. | Convert to a 6-step template-driven workflow with cascading dropdowns: **1) Category Dropdown (`School` vs. `College`) → 2) Sub-Type Dropdown (`Private` vs. `Public / Government`) → 3) Searchable Institution Name Dropdown** (from Master Catalog with anti-duplication lock). Auto-populate school/college details, classes/standards/semesters, sections, departments, subjects, and **timetable templates**, with full ability to add/remove/modify templates via dropdowns before creating the onboarding. |
| `app/(root)/admin/institutions/index.tsx` & `src/components/cards/InstitutionCard.tsx` | Renders institutions as vertical `InstitutionCard` items with 4 separate inline buttons (`Edit`, `Security`, `Toggle Status`, `Delete`). Filter pills only cover `All Stages`, `KG`, `Primary`, `Secondary`. | Replace/augment with `src/components/common/DataTable.tsx` displaying Type (`School`/`College`), Ownership (`Private`/`Public`), Classes, Sections, Subjects, Students, Staff, and Status, with a unified **"Actions ▾" Dropdown** per row (`View Blueprint`, `Edit Details & Templates`, `Manage Stakeholders`, `Reset Admin Security`, `Sync Timetable Template`, `Activate/Deactivate`, `Delete`) and dropdown filters. |
| `app/(root)/admin/users.tsx` & `src/components/stakeholder/StakeholderManagementModal.tsx` | Renders users and password reset requests as cards with separate inline action buttons (`Disable/Activate`, `Remove`, `Approve & Reset`, `Reject`). Adding a stakeholder uses a 4-page modal with manual text inputs and scrollable cards. | Convert User Directory & Password Resets to `DataTable` with a unified **"Actions ▾" Dropdown** in every row (`Assign Role`, `Assign Institution Scope`, `Toggle Report Export`, `Approve/Reset Password`, `Enable/Disable`, `Remove`) and `<Select>` dropdowns for role, scope, department, and institution assignment. |
| `app/(root)/admin/ads/index.tsx`, `app/(root)/admin/communication.tsx`, `app/(root)/admin/promotions/index.tsx` | Uses card lists with separate buttons and free-text inputs for campaign budgets, pricing rates, and announcements. | Use `DataTable` with row-level **"Actions ▾" Dropdowns** and replace manual configuration fields with `<Select>` dropdown presets (Audience, Pricing Model, Target Institution, Budget Tiers, Announcement Templates, Academic Year Transitions). |
| `supabase/migrations/20260112000000_timetable_schema.sql` & `20261003000005_extend_institution_management.sql` | Has `institutions`, `groups`, `classes`, `sections`, `departments`, `subjects`, `timetable_configs`, and `timetable_slots`, but lacks `institution_category` (`school`/`college`), `ownership_type` (`private`/`public`), a master catalog table (`master_institutions_catalog`), and reusable `institution_templates` (including timetable templates). | Add an additive migration creating `master_institutions_catalog` and `institution_templates` (seeded with Private/Public School & College templates for structure, subjects, departments, and timetables) and extending `institutions` with `institution_category`, `ownership_type`, and `board_or_university`. |


## 2. Copy-Paste Master Prompt for Antigravity

Copy the entire prompt block below and paste it directly into **Antigravity** where your `My_Vidyon` repository folder is opened:

```markdown
You are working inside the `My_Vidyon` (`my-vidyon-rebuild`) Expo Router + React Native + Supabase + TypeScript ERP repository.

Analyze and implement a comprehensive upgrade across the SuperAdmin portal (`app/(root)/admin/*`), shared UI components (`src/components/common/*`), data hooks (`src/hooks/*`), and Supabase schema (`supabase/migrations/*`) so that:
1. All manual text-entry ("entering method") workflows and scattered action buttons across SuperAdmin are converted into **Dropdown (`Select` / `ActionDropdown` / `MultiSelectDropdown`)** controls and **Table-based (`DataTable`) row action dropdowns**.
2. The **Institution Onboarding (`app/(root)/admin/onboarding/index.tsx`)** supports a cascading selection flow for **both Schools and Colleges**:
   - First Dropdown: **Institution Category** (`School` or `College`).
   - Second Dropdown (Conditional):
     - If `School` is chosen → **School Type Dropdown** (`Private School` or `Public / Government School`) + **Board/Affiliation Dropdown** (`CBSE`, `ICSE`, `State Board`, `Matriculation`, `IB / IGCSE`, `Cambridge`).
     - If `College` is chosen → **College Type Dropdown** (`Private College` or `Public / Government / Autonomous College`) + **College Stream Dropdown** (`Engineering & Technology`, `Arts & Science`, `Commerce & Management`, `Medical & Allied Health`, `Polytechnic / Diploma`).
   - Third Dropdown: **Institution Name Selection Dropdown** filtered by `(category, ownership_type)` from a master catalog (`master_institutions_catalog` + local fallback catalog) with **Anti-Duplication Enforcement** (institutions already present in `public.institutions` must be badged as `[Already Onboarded]` and disabled from duplicate selection; also provide a controlled `+ Register New Custom Institution` modal option with strict case-insensitive name & code uniqueness checks).
3. As soon as a **School** or **College** name is selected from the dropdown in Onboarding:
   - Automatically populate and display all **Institution Details** (Code, Address Line 1 & 2, City, State, Pincode, Latitude, Longitude, Map Link, Official Email, Office/Guard/Transport Phones, Academic Year, Allowed Modules) and an **Interactive Blueprint Overview Card** showing live counts of **Groups/Streams, Classes/Standards/Semesters, Sections, Departments, Subjects, and Timetable Templates**.
   - Pre-load modifiable templates for **Academic Structure (Groups, Standards/Classes or Degree Years/Semesters, Sections, Departments)**, **Subjects**, and **Timetables (Bell Schedule Configs & Weekly Period Grids)** for both **Schools** and **Colleges**.
   - Allow the SuperAdmin to **add, remove, or swap templates and individual items** (standards/semesters, sections, departments, subjects, and timetable periods/breaks) using dropdowns before clicking **Confirm & Create Onboarding**.

Follow the exact file-by-file specifications below without breaking any existing RLS policies, deletion guards (`trg_prevent_class_delete`, `trg_prevent_section_delete`, `trg_prevent_department_delete`), or audit logging (`log_audit`).


### PHASE 1: Database Migration & Master Catalog / Templates Seed
Create a new non-destructive SQL migration file:
`supabase/migrations/20261016000001_superadmin_dropdowns_and_templates.sql`

1. **Extend `public.institutions`**:
   ```sql
   ALTER TABLE public.institutions
     ADD COLUMN IF NOT EXISTS institution_category TEXT DEFAULT 'school' CHECK (institution_category IN ('school', 'college')),
     ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'private' CHECK (ownership_type IN ('private', 'public')),
     ADD COLUMN IF NOT EXISTS board_or_university TEXT,
     ADD COLUMN IF NOT EXISTS master_catalog_id UUID,
     ADD COLUMN IF NOT EXISTS timetable_template_id TEXT;
   ```
   Also add a unique index on `LOWER(TRIM(name))` where `status != 'deleted'` to prevent duplicate institution names at the database level.

2. **Create `public.master_institutions_catalog`**:
   - Columns: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `institution_code TEXT UNIQUE NOT NULL`, `name TEXT NOT NULL`, `institution_category TEXT NOT NULL CHECK (institution_category IN ('school', 'college'))`, `ownership_type TEXT NOT NULL CHECK (ownership_type IN ('private', 'public'))`, `board_or_university TEXT`, `address_line_1 TEXT`, `address_line_2 TEXT`, `city TEXT`, `state TEXT`, `pincode TEXT`, `latitude DOUBLE PRECISION`, `longitude DOUBLE PRECISION`, `map_link TEXT`, `email TEXT`, `office_phone TEXT`, `guard_phone TEXT`, `transport_phone TEXT`, `has_kg BOOLEAN DEFAULT false`, `academic_stages JSONB DEFAULT '[]'::jsonb`, `default_structure_template_key TEXT`, `default_subject_template_key TEXT`, `default_timetable_template_key TEXT`, `created_at TIMESTAMPTZ DEFAULT timezone('utc', now())`.
   - Enable RLS with `SELECT` for authenticated users and `ALL` for `public.is_super_admin()`.

3. **Create `public.institution_templates`**:
   - Columns: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `template_key TEXT UNIQUE NOT NULL`, `name TEXT NOT NULL`, `description TEXT`, `institution_category TEXT NOT NULL CHECK (institution_category IN ('school', 'college'))`, `ownership_type TEXT CHECK (ownership_type IN ('private', 'public', 'both'))`, `template_type TEXT NOT NULL CHECK (template_type IN ('structure', 'subjects', 'timetable', 'departments', 'full_bundle'))`, `payload JSONB NOT NULL DEFAULT '{}'::jsonb`, `is_system_default BOOLEAN DEFAULT true`, `created_at TIMESTAMPTZ DEFAULT timezone('utc', now())`.
   - Enable RLS with `SELECT` for authenticated users and `ALL` for `public.is_super_admin()`.

4. **Seed Rich Default Catalog & Templates in SQL + TypeScript Fallback (`src/constants/institutionTemplates.ts`)**:
   Create `src/constants/institutionTemplates.ts` so the app works immediately even before or alongside the SQL migration, and seed both SQL and TypeScript with:
   - **Pre-Configured Master Schools (Private & Public)** and **Master Colleges (Private & Public)** with realistic Indian campus metadata (Chennai, Bengaluru, Mumbai, Delhi, Hyderabad, Coimbatore, etc.), auto-codes, coordinates, and mapped template keys.
   - **School Structure Templates**:
     - `school_private_k12`: Pre-Primary (`Pre-KG`, `LKG`, `UKG`), Primary (`1st Standard`–`5th Standard`, Sections `A, B, C`), Middle (`6th Standard`–`8th Standard`, Sections `A, B, C`), High School (`9th Standard`–`10th Standard`, Sections `A, B`), Higher Secondary (`11th Standard`–`12th Standard`, Sections `A, B, C`).
     - `school_private_k10`: Pre-Primary (`Pre-KG`, `LKG`, `UKG`) + `1st Standard` to `10th Standard`.
     - `school_public_1_12`: Government / Public Higher Secondary (`1st Standard` to `12th Standard`, Sections `A, B`).
     - `school_public_1_10`: Government / Public High School (`1st Standard` to `10th Standard`, Sections `A, B`).
     - `school_kg_primary`: Kindergarten & Primary (`Pre-KG` to `5th Standard`).
   - **College Structure Templates**:
     - `college_private_engineering`: UG B.E./B.Tech (`Year 1 - Sem 1 & 2`, `Year 2 - Sem 3 & 4`, `Year 3 - Sem 5 & 6`, `Year 4 - Sem 7 & 8`, Sections `A, B`), PG M.E./M.Tech/MBA (`Year 1`, `Year 2`, Section `A`), with Departments (`CSE`, `AI & DS`, `ECE`, `EEE`, `Mechanical`, `Civil`, `IT`, `MBA`).
     - `college_public_engineering`: Government Engineering College UG/PG structure (`Year 1` to `Year 4`, Sections `A, B`) with Core Engineering & Science Departments.
     - `college_private_arts_science`: UG 3-Year Degrees (`B.Sc Computer Science`, `B.Com General`, `B.A English`, `BBA` — `Year 1`, `Year 2`, `Year 3`, Sections `A, B`) + PG 2-Year Degrees (`M.Sc`, `M.Com`, `M.A`).
     - `college_public_arts_science`: Government Arts & Science College (`Year 1`, `Year 2`, `Year 3`, Shift I & Shift II sections).
     - `college_polytechnic_diploma`: 3-Year Polytechnic Diploma (`Diploma Year 1`, `Diploma Year 2`, `Diploma Year 3`, Sections `A, B`).
   - **School & College Subject Templates**:
     - Complete standard-wise subject lists for Schools (KG Activity subjects, Primary core subjects, Middle/Secondary CBSE/State Board subjects, Higher Secondary streams: `Bio-Maths`, `Computer Science`, `Commerce`, `Arts/Humanities`).
     - Complete department/year-wise subject lists for Colleges (Engineering core courses, Labs, Electives; Arts/Science/Commerce core & allied subjects).
   - **Timetable Templates (`timetable_configs` + weekly period slot templates)**:
     - `tt_school_private_8p`: 8 Periods/Day, `08:30` Start, `45` mins/period, `Monday–Saturday`, Short Break (`15m` after Period 2), Lunch Break (`45m` after Period 4), Afternoon Break (`10m` after Period 6).
     - `tt_school_public_7p`: 7 Periods/Day, `09:15` Start, `45` mins/period, `Monday–Friday`, Short Break (`15m` after Period 2), Lunch Break (`45m` after Period 4), Short Break (`10m` after Period 5).
     - `tt_school_kg_5p`: 5 Periods/Day, `09:00` Start, `40` mins/period, `Monday–Friday`, Snack Break (`20m` after Period 2).
     - `tt_college_eng_7h`: 7 Lecture/Lab Hours/Day, `09:00` Start, `50` mins/period, `Monday–Saturday`, Tea Break (`15m` after Period 2), Lunch (`50m` after Period 4).
     - `tt_college_arts_shift1`: 5 Lectures/Day, `08:30` Start, `55` mins/period, `Monday–Friday`, Break (`20m` after Period 3).
     - `tt_college_arts_shift2`: 5 Lectures/Day, `01:45` Start, `50` mins/period, `Monday–Friday`, Break (`15m` after Period 3).


### PHASE 2: New Reusable Dropdown Components in `src/components/common/`

1. **`src/components/common/ActionDropdown.tsx`**:
   - A clean, reusable dropdown button (`label = "Actions"`, `ChevronDown` icon, or `MoreVertical` icon) designed for `DataTable` rows and page headers.
   - Props:
     ```ts
     export interface ActionDropdownItem {
       id: string;
       label: string;
       subLabel?: string;
       icon?: React.ReactNode;
       variant?: 'default' | 'primary' | 'warning' | 'success' | 'destructive';
       disabled?: boolean;
       onPress: () => void;
     }
     ```
   - Opens a clean modal/popover sheet listing the available actions with icons, descriptions, and color-coded badges, executing `item.onPress()` on selection.

2. **`src/components/common/MultiSelectDropdown.tsx`**:
   - Extends the UX pattern of `src/components/common/Select.tsx` to allow selecting/deselecting **multiple values** from a searchable dropdown modal (e.g., selecting multiple Sections `['A', 'B', 'C']`, multiple Standards/Classes, multiple Subjects, multiple Academic Stages, or multiple Working Days) with `"Select All"`, `"Clear All"`, and removable badge pills so users never have to type comma-separated strings or click tiny individual boxes.


### PHASE 3: Re-Architect Onboarding (`app/(root)/admin/onboarding/index.tsx`)

Update `app/(root)/admin/onboarding/index.tsx` to a **6-Step Dropdown & Template-Driven Onboarding Wizard**:
- **Step 1: `Select & Basic Info` (`Building2` icon)**
- **Step 2: `Admin Account` (`UserCog` icon)**
- **Step 3: `Structure & Depts` (`School` icon)**
- **Step 4: `Subject Templates` (`BookOpen` icon)**
- **Step 5: `Timetable Templates` (`Calendar` / `Clock` icon)**
- **Step 6: `Review & Create` (`Check` icon)**

#### Detailed Behavior for Each Step in `app/(root)/admin/onboarding/index.tsx`:

1. **Step 1 — Cascading Institution Selection & Auto-Populated Details**:
   - **Box 1: Institution Category Dropdown (`<Select>`)**:
     - Options:
       - `{ label: '🏫 School (K-12 / Primary / High / Higher Secondary)', value: 'school' }`
       - `{ label: '🎓 College (Engineering / Arts & Science / Diploma / PG)', value: 'college' }`
   - **Box 2: Ownership / Management Type Dropdown (`<Select>`)** (shown immediately when Category is selected):
     - If `category === 'school'`:
       - `{ label: 'Private School (Self-Financed / Matric / CBSE / ICSE)', value: 'private' }`
       - `{ label: 'Public / Government School (State / Central / Aided)', value: 'public' }`
       - Plus **Board / Affiliation Dropdown (`<Select>`)**: `CBSE`, `ICSE / ISC`, `State Board`, `Matriculation`, `IB / IGCSE`.
     - If `category === 'college'`:
       - `{ label: 'Private College (Self-Financing / Deemed / Autonomous)', value: 'private' }`
       - `{ label: 'Public / Government College (State / Central / Govt Aided)', value: 'public' }`
       - Plus **University / Stream Dropdown (`<Select>`)**: `Engineering & Technology (AICTE / Anna Univ)`, `Arts & Science`, `Commerce & Management`, `Medical & Allied Health`, `Polytechnic / Diploma`.
   - **Box 3: Select Institution Name from Filtered Catalog (`<Select searchable>`)**:
     - Queries `master_institutions_catalog` (merged with `src/constants/institutionTemplates.ts`) filtered by `institution_category` and `ownership_type`, and cross-checks against existing records in `public.institutions`.
     - Any institution whose `institution_code` or `name` already exists in `public.institutions` is marked with `subLabel: '✅ Already Onboarded — Duplicate Blocked'` and prevented from being re-onboarded (unless opened in `mode=edit`).
     - Also includes a final dropdown option: `+ Register New Custom ${category === 'college' ? 'College' : 'School'}...` which reveals controlled fields with live duplicate checking against `public.institutions`.
   - **Auto-Fill & Live Blueprint Summary Card on Selection**:
     - Selecting an institution from Box 3 immediately auto-populates:
       - `basicInfo` (`name`, `school_code`, `type`, `institution_category`, `ownership_type`, `board_or_university`, `address_line_1`, `address_line_2`, `city`, `state`, `pincode`, `latitude`, `longitude`, `map_link`, `email`, `office_phone`, `guard_phone`, `transport_phone`, `academic_year`, `has_kg`, `academic_stages`).
       - `structure` (Groups/Streams, Classes/Standards or College Years/Semesters, and Sections).
       - `departments` (School or College Academic Departments).
       - `subjects` (Standard-wise or Semester/Department-wise Subjects).
       - `timetableTemplate` (Default Bell Schedule & Period Grid for that School/College type).
     - Render an **Interactive Blueprint Preview Card** right inside Step 1 showing:
       - Institution Details (Code, Category, Ownership, Board/Stream, City/State, Contact)
       - Total Groups / Streams (`structure.length`)
       - Total Standards / Classes / Years (`allAvailableClasses.length`)
       - Total Sections (`totalSectionsCount`)
       - Total Subjects (`subjects.length`)
       - Total Departments (`departments.length`)
       - Timetable Template (`selectedTimetableTemplate.name` — e.g., `8 Periods/Day • 08:30–15:30`)
       - Quick Action Buttons on the Blueprint Card: `Customize Structure (Step 3)`, `Customize Subjects (Step 4)`, `Customize Timetables (Step 5)`, or `Jump to Review (Step 6)`.
   - Replace City, State, Pincode, Academic Year, Academic Stages, and Module Permissions inputs with `<Select>` and `<MultiSelectDropdown>` controls.

2. **Step 2 — Admin Account**:
   - Auto-populate `adminInfo.email` based on the selected institution (e.g., `admin@${basicInfo.school_code.toLowerCase()}.vidyon.app`) and provide a **Credential Provisioning Mode Dropdown (`<Select>`)**:
     - `Auto-Generate Official Admin Email & Setup Password`
     - `Select Existing Unassigned Admin User from Directory`
     - `Specify Custom Admin Email & Password`

3. **Step 3 — Modifiable Academic Structure, Standards/Semesters, Sections & Departments (All Dropdown-Driven)**:
   - **Structure Template Selector Dropdown (`<Select>`)**:
     - Dynamically lists School templates (when `category === 'school'`) or College templates (when `category === 'college'`).
     - Selecting a template applies it, or the SuperAdmin can use an **"Apply Template Mode" Dropdown** (`Replace Current Structure` vs. `Merge / Append to Current Structure`).
   - **Add / Remove Groups, Classes/Standards/Semesters, and Sections via Dropdowns**:
     - **Add Group / Stream Dropdown (`<Select>`)**: Pick from standard School stages (`Pre-Primary (KG)`, `Primary (1st–5th)`, `Middle (6th–8th)`, `High School (9th–10th)`, `Higher Secondary (11th–12th)`) or College streams (`UG - B.E. / B.Tech`, `UG - B.Sc / B.Com / B.A`, `PG - M.E. / M.Tech / MBA`, `Diploma`).
     - **Add Class / Standard / Year Dropdown (`<MultiSelectDropdown>`)**: Within any group, select or deselect classes/standards (`Pre-KG`, `LKG`, `UKG`, `1st Standard` … `12th Standard` for Schools; `1st Year (Sem 1-2)`, `2nd Year (Sem 3-4)`, `3rd Year (Sem 5-6)`, `4th Year (Sem 7-8)` for Colleges) from a dropdown instead of typing names manually.
     - **Sections Dropdown (`<MultiSelectDropdown>`)**: Select sections (`A`, `B`, `C`, `D`, `E`, `F`, `Shift-I`, `Shift-II`) per class via dropdown.
     - **Departments Template & Multi-Select Dropdown (`<MultiSelectDropdown>`)**: Load School or College departments from a master dropdown list and allow one-click removal (`X` icon with existing deletion guard `removeDepartmentWithGuard`).

4. **Step 4 — Modifiable Subject Templates (School & College)**:
   - **Subject Template Bundle Dropdown (`<Select>`)**:
     - Allows loading/switching pre-built subject templates (e.g., `CBSE K-10 Standard Subjects`, `State Board 1st–12th Subjects`, `Higher Secondary Bio-Maths / CS / Commerce`, `AICTE Engineering Sem 1–8 Core Subjects`, `Arts & Science UG Core Subjects`).
   - **Add / Remove Subjects via Dropdowns**:
     - Select Target Class/Standard/Year (`<Select>`), Select Section (`<Select>`), Select Stream/Department (`<Select>`), and select one or more subjects from a **Master Subject Catalog `<MultiSelectDropdown>`** (with subject codes auto-mapped, e.g., `MATH101`, `PHY101`, `CS301`).
     - Provide a **"Bulk Apply Subjects to All Classes in Group" Dropdown Action** and individual remove buttons on every subject chip/row.

5. **Step 5 — Timetable Templates ("Templates of Everything — Timetables")**:
   - **Timetable Master Template Dropdown (`<Select>`)**:
     - Lists all School Timetable Templates (if School) or College Timetable Templates (if College).
   - **Scope Selector Dropdown (`<Select>`)**:
     - `Apply to All Classes & Sections in Institution` or `Customize Per Stage / Group (e.g. KG vs Primary vs High School)`.
   - **Dropdown Configuration Controls (No Manual Text Entry Required)**:
     - `Working Days` (`<MultiSelectDropdown>`: `Monday` through `Saturday`)
     - `Periods Per Day` (`<Select>`: `4`, `5`, `6`, `7`, `8`, `9`, `10` periods)
     - `Period Duration` (`<Select>`: `35 mins`, `40 mins`, `45 mins`, `50 mins`, `55 mins`, `60 mins`)
     - `Day Start Time` (`<Select>`: `08:00`, `08:30`, `08:45`, `09:00`, `09:15`, `09:30`, `10:00`, `13:45`)
     - `Short Break Configuration` (`<Select>`: `After Period 2 (15 mins)`, `After Period 3 (15 mins)`, `Two Short Breaks (After P2 & P5)`, `None`)
     - `Lunch Break Configuration` (`<Select>`: `After Period 4 (45 mins)`, `After Period 4 (30 mins)`, `After Period 5 (45 mins)`, `None (Half-Day)`)
     - `Auto-Populate Weekly Subject Slots` (`<Select>`: `Auto-distribute class subjects across weekly periods` vs. `Create bell-schedule time grid only`)
   - **Interactive Timetable Template Preview & Slot Editor**:
     - Shows the calculated daily time grid (Period 1 to Period N + Breaks/Lunch with exact start/end times) and a sample weekly schedule table where each slot's type (`Regular Period`, `Lab Session`, `Short Break`, `Lunch Break`, `PT / Library / Activity`) and default subject can be changed via `<Select>` dropdowns or periods can be added/removed.
   - **Database Persistence on Save / Submit (`handleSaveStep(5)` and `handleSubmit()`)**:
     - For every onboarded class and section, upsert into `public.timetable_configs`:
       - `institution_id`, `class_id`, `section`, `days_of_week`, `periods_per_day`, `start_time`, `period_duration_minutes`, `lunch_start_time`, `lunch_duration_minutes`, `break_configs`.
     - When `Auto-Populate Weekly Subject Slots` is enabled, also generate and upsert default weekly rows in `public.timetable_slots` (linking `config_id`, `day_of_week`, `period_index`, `start_time`, `end_time`, `is_break`, `break_name`, and cycling through the class's configured `subjects` IDs) so the school or college has a ready-to-use timetable immediately after onboarding!

6. **Step 6 — Review & Confirm Onboarding**:
   - Display a complete, structured summary of:
     - Institution Profile (`School` vs `College`, `Private` vs `Public`, Board/University, Code, Address, Admin Email)
     - Academic Structure (`X Groups`, `Y Classes/Standards`, `Z Sections`, `W Departments`)
     - Subject Curriculum (`N Subjects mapped across classes`)
     - Timetable Template (`Template Name`, `Periods/Day`, `Working Days`, `Breaks`, `Auto-Scheduled Slots count`)
   - Provide quick `"Modify ▾"` dropdown links to jump back to any step if adjustments are needed, and a primary **"Confirm & Create Onboarding"** button.


### PHASE 4: Convert SuperAdmin Screens to Table Views with Action Dropdowns

1. **`app/(root)/admin/institutions/index.tsx`**:
   - Replace the filter chips and sort pills with clean `<Select>` dropdowns in a unified filter bar:
     - **Category Filter Dropdown**: `All Categories`, `Schools Only`, `Colleges Only`
     - **Ownership Filter Dropdown**: `All Ownership`, `Private`, `Public / Government`
     - **Stage / Stream Filter Dropdown**: `All Stages`, `KG / Pre-Primary`, `Primary`, `Middle`, `High / Higher Sec`, `UG / PG College`
     - **Status Filter Dropdown**: `Active`, `Inactive`, `Deleted`
     - **Sort By Dropdown**: `Name (A-Z)`, `Name (Z-A)`, `Most Students`, `Most Staff`, `Recently Added`
   - Top-right header action: Replace the plain `+` button with an **`"Institution Actions ▾"` (`<ActionDropdown>`)** offering:
     - `+ Onboard New School (From Template)` → `/admin/onboarding?category=school`
     - `+ Onboard New College (From Template)` → `/admin/onboarding?category=college`
     - `Manage Master Templates`
   - Render the institutions list using `src/components/common/DataTable.tsx` (with a view toggle to switch between `Table View` (default) and `Card View`):
     - Columns:
       1. `Institution` (Logo + Name + Code)
       2. `Category & Type` (Badge: `Private School`, `Public School`, `Private College`, `Public College` + Board/Stream)
       3. `Location` (`City, State`)
       4. `Academics` (`Classes`, `Sections`, `Subjects` counts)
       5. `Users` (`Students` & `Staff` counts)
       6. `Status` (`Active` / `Inactive` / `Deleted` badge)
       7. `Actions` — Render `<ActionDropdown label="Actions">` with options:
          - `View Full Blueprint & Timetable` (opens detail modal showing structure, departments, subjects, and timetable config)
          - `Edit Institution & Templates` (`router.push('/admin/onboarding?mode=edit&id=' + inst.institution_id)`)
          - `Modify Timetable Template` (`router.push('/admin/onboarding?mode=edit&step=5&id=' + inst.institution_id)`)
          - `Assign / Manage Stakeholders` (opens `StakeholderManagementModal`)
          - `Reset Admin Credentials` (`router.push('/admin/onboarding?mode=security&id=' + inst.institution_id)`)
          - `Activate / Deactivate Institution` (triggers `handleToggle`)
          - `Delete Institution` (triggers `handleDelete`)

2. **`app/(root)/admin/users.tsx` & `src/components/stakeholder/StakeholderManagementModal.tsx`**:
   - Replace the horizontal role tab chips with a **Role / Directory View `<Select>` Dropdown** (`All Stakeholders`, `Ad Managers`, `Finance Team`, `Institution Stakeholders`, `Super Admins`, `Campus Admins`, `Password Reset Requests`) and an **Institution Filter `<Select>` Dropdown**.
   - Render both the **Stakeholders List** and **Password Reset Requests** using `DataTable`:
     - Include a **"Quick Assign ▾" (`<Select>`)** or **"Actions ▾" (`<ActionDropdown>`)** column in every row of the table:
       - For Users: `Change Role (Dropdown)`, `Assign Institution Scope (Dropdown)`, `Toggle Export Permission`, `Reset Password to Setup Mode`, `Activate / Disable Account`, `Remove User`.
       - For Password Reset Requests: `Approve & Reset Password`, `Reject Request`, `View User Profile`.
   - In the **Add / Assign Stakeholder Modal**, replace manual text inputs and scrollable card lists with `<Select>` dropdowns for:
     - `Stakeholder Role` (`<Select>`)
     - `Jurisdiction Scope` (`<Select>`: `Global Platform` vs `Specific Institution`)
     - `Target Institution` (`<Select searchable>` populated from `institutions`)
     - `Department` (`<Select>` populated from standard departments)
     - `Export Permission` (`<Select>`: `Allow Report & Excel Exports` vs `View-Only (No Exports)`)

3. **`app/(root)/admin/ads/index.tsx`, `app/(root)/admin/communication.tsx`, `app/(root)/admin/promotions/index.tsx`**:
   - **`app/(root)/admin/ads/index.tsx`**:
     - Display campaigns in a `DataTable` with a row-level **"Actions ▾" (`<ActionDropdown>`)** (`View Campaign Leads`, `Export Leads XLSX`, `Delete Campaign`).
     - In the New Campaign Modal, convert `Target Audience`, `Ad Pricing Model`, `Target Institution`, `Budget Package Preset` (`₹2,500 Starter`, `₹5,000 Standard`, `₹10,000 Growth`, `₹25,000 Enterprise`, `Custom`), `Cost Per Click Preset` (`₹1.00`, `₹2.50`, `₹5.00`), and `Cost Per View Preset` (`₹0.10`, `₹0.20`, `₹0.50`) to `<Select>` dropdowns.
   - **`app/(root)/admin/communication.tsx`**:
     - Convert `Audience Scope`, `Target Role`, `Target Institution`, and `Announcement Template / Category` (`Academic Notice`, `Holiday / Weather Alert`, `Exam / Result Update`, `Fee Reminder`, `System Maintenance`, `Custom Message`) to `<Select>` dropdowns, and render `Recent Broadcasts` in a `DataTable` with an **"Actions ▾" Dropdown** (`Resend Broadcast`, `Copy Message`).
   - **`app/(root)/admin/promotions/index.tsx`**:
     - Render Pending & Past Promotion Requests in a `DataTable` with a row-level **"Actions ▾" (`<ActionDropdown>`)** (`Approve & Execute Promotion`, `Reject Promotion Request`, `View Institution Details`).


### PHASE 5: Verification & Quality Checks
1. Run `npm run typecheck` (`tsc --noEmit`) and resolve any TypeScript errors across modified files.
2. Verify that selecting `School` -> `Private` or `Public` -> `School Name` in `app/(root)/admin/onboarding/index.tsx` auto-fills all school details, classes, sections, standards, subjects, departments, and timetable templates, and allows adding/removing templates via dropdowns before creating the onboarding.
3. Verify that selecting `College` -> `Private` or `Public` -> `College Name` performs the exact same auto-fill and template customization workflow (UG/PG degrees, years/semesters, sections, college departments, subjects, and college lecture/lab timetable templates).
4. Verify that already-onboarded schools and colleges cannot be duplicated from the dropdown selector.
5. Verify that all SuperAdmin tables (`institutions`, `users`, `ads`, `promotions`, `communication`) use dropdowns for actions and assignments.
```
