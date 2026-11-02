// ============================================================
// File: src/constants/institutionTemplates.ts
// Purpose: Master Catalog & Template Definitions for Schools & Colleges
//          Provides rich default blueprints for academic structures,
//          departments, standard subjects, and weekly timetable schedules.
// ============================================================

export type InstitutionCategory = 'school' | 'college';
export type OwnershipType = 'private' | 'public';

export interface CatalogInstitution {
  id: string;
  institution_code: string;
  name: string;
  institution_category: InstitutionCategory;
  ownership_type: OwnershipType;
  board_or_university: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  map_link: string;
  email: string;
  office_phone: string;
  guard_phone: string;
  transport_phone: string;
  has_kg: boolean;
  academic_stages: string[];
  default_structure_template_key: string;
  default_subject_template_key: string;
  default_timetable_template_key: string;
}

export interface ClassStructureItem {
  id?: string;
  name: string;
  sections: string[];
  class_order?: number;
  is_final_class?: boolean;
}

export interface GroupStructureItem {
  id?: string;
  name: string;
  stage?: string;
  classes: ClassStructureItem[];
}

export interface DepartmentItem {
  name: string;
  code?: string;
  description?: string;
  subjects?: string[];
  isCustom?: boolean;
  excludedSubjects?: string[];
}

export interface SubjectTemplateItem {
  name: string;
  code: string;
  className: string;
  group?: string;
}

export interface BreakConfig {
  after_period: number;
  duration: number; // minutes
  type: string; // e.g. "Lunch", "Short Break", "Tea Break"
}

export interface TimetableTemplate {
  template_key: string;
  name: string;
  description: string;
  institution_category: InstitutionCategory;
  days_of_week: string[];
  periods_per_day: number;
  start_time: string; // "HH:MM:SS"
  period_duration_minutes: number;
  break_configs: BreakConfig[];
}

// ============================================================
// 1. MASTER INSTITUTIONS CATALOG (FALLBACK & SEED DATA)
// ============================================================
export const MASTER_INSTITUTIONS_CATALOG: CatalogInstitution[] = [
  // --- Private Schools ---
  {
    id: 'dps-chn-01',
    institution_code: 'DPS-CHN-01',
    name: 'Delhi Public School (DPS) - Chennai Campus',
    institution_category: 'school',
    ownership_type: 'private',
    board_or_university: 'CBSE',
    address_line_1: 'No. 45, Gandhi Road, Velachery',
    address_line_2: 'Near Phoenix Mall',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600042',
    latitude: 12.9815,
    longitude: 80.2180,
    map_link: 'https://maps.google.com/?q=12.9815,80.2180',
    email: 'info.chennai@dps.edu.in',
    office_phone: '+91 44 2244 5566',
    guard_phone: '+91 98401 22334',
    transport_phone: '+91 98402 33445',
    has_kg: true,
    academic_stages: ['pre_primary', 'primary', 'middle', 'secondary', 'higher_secondary'],
    default_structure_template_key: 'school_private_k12',
    default_subject_template_key: 'school_cbse_k12',
    default_timetable_template_key: 'tt_school_private_8p',
  },
  {
    id: 'nps-blr-02',
    institution_code: 'NPS-BLR-02',
    name: 'National Public School (NPS) - Indiranagar',
    institution_category: 'school',
    ownership_type: 'private',
    board_or_university: 'CBSE',
    address_line_1: '12th Main Rd, HAL 2nd Stage',
    address_line_2: 'Opposite BDA Complex',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    latitude: 12.9719,
    longitude: 77.6412,
    map_link: 'https://maps.google.com/?q=12.9719,77.6412',
    email: 'admissions@npsindiranagar.com',
    office_phone: '+91 80 2528 0611',
    guard_phone: '+91 98450 11223',
    transport_phone: '+91 98451 22334',
    has_kg: true,
    academic_stages: ['pre_primary', 'primary', 'middle', 'secondary'],
    default_structure_template_key: 'school_private_k10',
    default_subject_template_key: 'school_cbse_k10',
    default_timetable_template_key: 'tt_school_private_8p',
  },
  {
    id: 'dav-mum-03',
    institution_code: 'DAV-MUM-03',
    name: 'DAV Public School - Navi Mumbai',
    institution_category: 'school',
    ownership_type: 'private',
    board_or_university: 'ICSE / ISC',
    address_line_1: 'Plot 34, Sector 10, Nerul',
    address_line_2: 'Near Nerul Railway Station',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400706',
    latitude: 19.0330,
    longitude: 73.0297,
    map_link: 'https://maps.google.com/?q=19.0330,73.0297',
    email: 'davnerul@gmail.com',
    office_phone: '+91 22 2770 1234',
    guard_phone: '+91 98200 11223',
    transport_phone: '+91 98201 22334',
    has_kg: true,
    academic_stages: ['pre_primary', 'primary', 'middle', 'secondary', 'higher_secondary'],
    default_structure_template_key: 'school_private_k12',
    default_subject_template_key: 'school_cbse_k12',
    default_timetable_template_key: 'tt_school_private_8p',
  },

  // --- Public / Government Schools ---
  {
    id: 'kv-iit-mds',
    institution_code: 'KV-IIT-MDS',
    name: 'Kendriya Vidyalaya (KV) - IIT Madras Campus',
    institution_category: 'school',
    ownership_type: 'public',
    board_or_university: 'CBSE',
    address_line_1: 'IIT Madras Campus, Sardar Patel Road',
    address_line_2: 'Adyar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600036',
    latitude: 12.9915,
    longitude: 80.2337,
    map_link: 'https://maps.google.com/?q=12.9915,80.2337',
    email: 'kviitchennai@gmail.com',
    office_phone: '+91 44 2257 0041',
    guard_phone: '+91 94440 55667',
    transport_phone: '+91 94441 66778',
    has_kg: false,
    academic_stages: ['primary', 'middle', 'secondary', 'higher_secondary'],
    default_structure_template_key: 'school_public_1_12',
    default_subject_template_key: 'school_cbse_k12',
    default_timetable_template_key: 'tt_school_public_7p',
  },
  {
    id: 'ghss-cmb-04',
    institution_code: 'GHSS-CMB-04',
    name: 'Government Higher Secondary School - Town Hall',
    institution_category: 'school',
    ownership_type: 'public',
    board_or_university: 'State Board',
    address_line_1: 'Near Clock Tower, Big Bazaar Street',
    address_line_2: 'Town Hall',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641001',
    latitude: 11.0018,
    longitude: 76.9629,
    map_link: 'https://maps.google.com/?q=11.0018,76.9629',
    email: 'ghss.coimbatore@tn.gov.in',
    office_phone: '+91 422 2390 123',
    guard_phone: '+91 94420 12345',
    transport_phone: '+91 94421 23456',
    has_kg: false,
    academic_stages: ['middle', 'secondary', 'higher_secondary'],
    default_structure_template_key: 'school_public_1_12',
    default_subject_template_key: 'school_state_1_12',
    default_timetable_template_key: 'tt_school_public_7p',
  },
  {
    id: 'gths-del-05',
    institution_code: 'GTHS-DEL-05',
    name: 'Government Model Boys Senior Secondary School',
    institution_category: 'school',
    ownership_type: 'public',
    board_or_university: 'CBSE',
    address_line_1: 'Sector 4, R.K. Puram',
    address_line_2: 'Near Sangam Cinema',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110022',
    latitude: 28.5672,
    longitude: 77.1783,
    map_link: 'https://maps.google.com/?q=28.5672,77.1783',
    email: 'gmbss.rkpuram@edudel.nic.in',
    office_phone: '+91 11 2617 8901',
    guard_phone: '+91 98111 22334',
    transport_phone: '+91 98112 33445',
    has_kg: false,
    academic_stages: ['middle', 'secondary', 'higher_secondary'],
    default_structure_template_key: 'school_public_1_12',
    default_subject_template_key: 'school_cbse_k12',
    default_timetable_template_key: 'tt_school_public_7p',
  },

  // --- Private Colleges ---
  {
    id: 'ssn-eng-01',
    institution_code: 'SSN-ENG-01',
    name: 'SSN College of Engineering (Autonomous)',
    institution_category: 'college',
    ownership_type: 'private',
    board_or_university: 'Engineering & Technology (AICTE / Anna Univ)',
    address_line_1: 'Old Mahabalipuram Road (OMR), Kalavakkam',
    address_line_2: 'Rajiv Gandhi Salai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '603110',
    latitude: 12.7508,
    longitude: 80.1970,
    map_link: 'https://maps.google.com/?q=12.7508,80.1970',
    email: 'admissions@ssn.edu.in',
    office_phone: '+91 44 2746 9700',
    guard_phone: '+91 98409 88776',
    transport_phone: '+91 98408 77665',
    has_kg: false,
    academic_stages: ['higher_secondary'],
    default_structure_template_key: 'college_private_engineering',
    default_subject_template_key: 'college_eng_aicte',
    default_timetable_template_key: 'tt_college_eng_7h',
  },
  {
    id: 'loyola-arts-02',
    institution_code: 'LOYOLA-ARTS-02',
    name: 'Loyola College (Autonomous)',
    institution_category: 'college',
    ownership_type: 'private',
    board_or_university: 'Arts & Science',
    address_line_1: 'Sterling Road, Nungambakkam',
    address_line_2: 'Near Loyola Railway Station',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600034',
    latitude: 13.0644,
    longitude: 80.2338,
    map_link: 'https://maps.google.com/?q=13.0644,80.2338',
    email: 'contact@loyolacollege.edu',
    office_phone: '+91 44 2817 8200',
    guard_phone: '+91 98400 44556',
    transport_phone: '+91 98401 55667',
    has_kg: false,
    academic_stages: ['higher_secondary'],
    default_structure_template_key: 'college_private_arts_science',
    default_subject_template_key: 'college_arts_ug',
    default_timetable_template_key: 'tt_college_arts_shift1',
  },
  {
    id: 'rvce-blr-03',
    institution_code: 'RVCE-BLR-03',
    name: 'R.V. College of Engineering (Autonomous - VTU)',
    institution_category: 'college',
    ownership_type: 'private',
    board_or_university: 'Engineering & Technology (AICTE / Anna Univ)',
    address_line_1: 'Mysore Road, RV Vidyaniketan Post',
    address_line_2: 'Opposite Rajarajeshwari Nagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560059',
    latitude: 12.9242,
    longitude: 77.4988,
    map_link: 'https://maps.google.com/?q=12.9242,77.4988',
    email: 'principal@rvce.edu.in',
    office_phone: '+91 80 6818 8100',
    guard_phone: '+91 98450 77889',
    transport_phone: '+91 98451 88990',
    has_kg: false,
    academic_stages: ['higher_secondary'],
    default_structure_template_key: 'college_private_engineering',
    default_subject_template_key: 'college_eng_aicte',
    default_timetable_template_key: 'tt_college_eng_7h',
  },
  {
    id: 'srm-poly-04',
    institution_code: 'SRM-POLY-04',
    name: 'SRM Polytechnic College',
    institution_category: 'college',
    ownership_type: 'private',
    board_or_university: 'Polytechnic / Diploma',
    address_line_1: 'SRM Nagar, Potheri, Kattankulathur',
    address_line_2: 'Near Potheri Railway Station',
    city: 'Chengalpattu',
    state: 'Tamil Nadu',
    pincode: '603203',
    latitude: 12.8231,
    longitude: 80.0442,
    map_link: 'https://maps.google.com/?q=12.8231,80.0442',
    email: 'admissions.poly@srm.edu.in',
    office_phone: '+91 44 2741 7000',
    guard_phone: '+91 98405 11223',
    transport_phone: '+91 98406 22334',
    has_kg: false,
    academic_stages: ['higher_secondary'],
    default_structure_template_key: 'college_polytechnic_diploma',
    default_subject_template_key: 'college_poly_core',
    default_timetable_template_key: 'tt_college_eng_7h',
  },

  // --- Public / Government Colleges ---
  {
    id: 'ceg-anna-01',
    institution_code: 'CEG-ANNA-01',
    name: 'College of Engineering, Guindy (Anna University)',
    institution_category: 'college',
    ownership_type: 'public',
    board_or_university: 'Engineering & Technology (AICTE / Anna Univ)',
    address_line_1: 'Sardar Patel Road, Guindy',
    address_line_2: 'Anna University Main Campus',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600025',
    latitude: 13.0102,
    longitude: 80.2354,
    map_link: 'https://maps.google.com/?q=13.0102,80.2354',
    email: 'deanceg@annauniv.edu',
    office_phone: '+91 44 2235 8000',
    guard_phone: '+91 94442 33445',
    transport_phone: '+91 94443 44556',
    has_kg: false,
    academic_stages: ['higher_secondary'],
    default_structure_template_key: 'college_public_engineering',
    default_subject_template_key: 'college_eng_aicte',
    default_timetable_template_key: 'tt_college_eng_7h',
  },
  {
    id: 'presidency-02',
    institution_code: 'PRESIDENCY-02',
    name: 'Presidency College (Autonomous - Govt Aided)',
    institution_category: 'college',
    ownership_type: 'public',
    board_or_university: 'Arts & Science',
    address_line_1: 'Kamarajar Salai, Marina Beach Road',
    address_line_2: 'Chepauk',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600005',
    latitude: 13.0583,
    longitude: 80.2825,
    map_link: 'https://maps.google.com/?q=13.0583,80.2825',
    email: 'principal@presidencycollege.ac.in',
    office_phone: '+91 44 2854 4894',
    guard_phone: '+91 94445 66778',
    transport_phone: '+91 94446 77889',
    has_kg: false,
    academic_stages: ['higher_secondary'],
    default_structure_template_key: 'college_public_arts_science',
    default_subject_template_key: 'college_arts_ug',
    default_timetable_template_key: 'tt_college_arts_shift1',
  },
  {
    id: 'gct-cbe-03',
    institution_code: 'GCT-CBE-03',
    name: 'Government College of Technology (GCT) - Coimbatore',
    institution_category: 'college',
    ownership_type: 'public',
    board_or_university: 'Engineering & Technology (AICTE / Anna Univ)',
    address_line_1: 'Thadagam Road, Post Office Box 1640',
    address_line_2: 'Near Cowley Brown Road',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641013',
    latitude: 11.0183,
    longitude: 76.9366,
    map_link: 'https://maps.google.com/?q=11.0183,76.9366',
    email: 'principal@gct.ac.in',
    office_phone: '+91 422 2432 221',
    guard_phone: '+91 94430 77889',
    transport_phone: '+91 94431 88990',
    has_kg: false,
    academic_stages: ['higher_secondary'],
    default_structure_template_key: 'college_public_engineering',
    default_subject_template_key: 'college_eng_aicte',
    default_timetable_template_key: 'tt_college_eng_7h',
  },
];

// ============================================================
// 2. ACADEMIC STRUCTURE TEMPLATES (SCHOOLS & COLLEGES)
// ============================================================
export const STRUCTURE_TEMPLATES: Record<string, {
  name: string;
  category: InstitutionCategory;
  groups: GroupStructureItem[];
  defaultDepartments: DepartmentItem[];
}> = {
  school_private_k12: {
    name: 'School: Complete K-12 (Pre-KG to 12th Standard)',
    category: 'school',
    groups: [
      {
        name: 'Pre-Primary (Kindergarten)',
        stage: 'pre_primary',
        classes: [
          { name: 'Pre-KG', sections: ['A', 'B'] },
          { name: 'LKG', sections: ['A', 'B', 'C'] },
          { name: 'UKG', sections: ['A', 'B', 'C'] },
        ],
      },
      {
        name: 'Primary School (1st to 5th)',
        stage: 'primary',
        classes: [
          { name: '1st Standard', sections: ['A', 'B', 'C'] },
          { name: '2nd Standard', sections: ['A', 'B', 'C'] },
          { name: '3rd Standard', sections: ['A', 'B', 'C'] },
          { name: '4th Standard', sections: ['A', 'B', 'C'] },
          { name: '5th Standard', sections: ['A', 'B', 'C'] },
        ],
      },
      {
        name: 'Middle School (6th to 8th)',
        stage: 'middle',
        classes: [
          { name: '6th Standard', sections: ['A', 'B', 'C'] },
          { name: '7th Standard', sections: ['A', 'B', 'C'] },
          { name: '8th Standard', sections: ['A', 'B', 'C'] },
        ],
      },
      {
        name: 'High School (9th & 10th)',
        stage: 'secondary',
        classes: [
          { name: '9th Standard', sections: ['A', 'B'] },
          { name: '10th Standard', sections: ['A', 'B'], is_final_class: true },
        ],
      },
      {
        name: 'Higher Secondary (11th & 12th)',
        stage: 'higher_secondary',
        classes: [
          { name: '11th Standard', sections: ['A', 'B', 'C'] },
          { name: '12th Standard', sections: ['A', 'B', 'C'], is_final_class: true },
        ],
      },
    ],
    defaultDepartments: [
      { name: 'Mathematics', code: 'MATH', subjects: ['Mathematics', 'Advanced Maths'] },
      { name: 'Science', code: 'SCI', subjects: ['Science / EVS', 'Physics Theory & Lab', 'Chemistry Theory & Lab', 'Biology / Botany & Zoology'] },
      { name: 'Languages & English', code: 'LANG', subjects: ['English Language & Literature', 'Tamil (Second Language)', 'Hindi (Second Language)'] },
      { name: 'Social Studies', code: 'SOC', subjects: ['Social Studies / History & Civics', 'Economics (Micro & Macro)'] },
      { name: 'Physical Education & Sports', code: 'PET', subjects: ['Physical Education & Yoga'] },
      { name: 'Computer Science', code: 'CS', subjects: ['Computer Applications & Coding', 'Computer Science (Python & SQL)'] },
    ],
  },

  school_private_k10: {
    name: 'School: K-10 (Pre-KG to 10th Standard)',
    category: 'school',
    groups: [
      {
        name: 'Pre-Primary (Kindergarten)',
        stage: 'pre_primary',
        classes: [
          { name: 'Pre-KG', sections: ['A', 'B'] },
          { name: 'LKG', sections: ['A', 'B', 'C'] },
          { name: 'UKG', sections: ['A', 'B', 'C'] },
        ],
      },
      {
        name: 'Primary School (1st to 5th)',
        stage: 'primary',
        classes: [
          { name: '1st Standard', sections: ['A', 'B', 'C'] },
          { name: '2nd Standard', sections: ['A', 'B', 'C'] },
          { name: '3rd Standard', sections: ['A', 'B', 'C'] },
          { name: '4th Standard', sections: ['A', 'B', 'C'] },
          { name: '5th Standard', sections: ['A', 'B', 'C'] },
        ],
      },
      {
        name: 'Middle & High School (6th to 10th)',
        stage: 'secondary',
        classes: [
          { name: '6th Standard', sections: ['A', 'B'] },
          { name: '7th Standard', sections: ['A', 'B'] },
          { name: '8th Standard', sections: ['A', 'B'] },
          { name: '9th Standard', sections: ['A', 'B'] },
          { name: '10th Standard', sections: ['A', 'B'], is_final_class: true },
        ],
      },
    ],
    defaultDepartments: [
      { name: 'Mathematics', code: 'MATH', subjects: ['Mathematics'] },
      { name: 'Science', code: 'SCI', subjects: ['Science / EVS', 'General Science'] },
      { name: 'Languages', code: 'LANG', subjects: ['English Language & Literature', 'Second Language'] },
      { name: 'Social Studies', code: 'SOC', subjects: ['Social Studies / History & Civics'] },
      { name: 'Computer Science', code: 'CS', subjects: ['Computer Applications & Coding'] },
    ],
  },

  school_public_1_12: {
    name: 'School: Public / Govt Higher Secondary (1st to 12th)',
    category: 'school',
    groups: [
      {
        name: 'Primary Section (1st to 5th)',
        stage: 'primary',
        classes: [
          { name: '1st Standard', sections: ['A', 'B'] },
          { name: '2nd Standard', sections: ['A', 'B'] },
          { name: '3rd Standard', sections: ['A', 'B'] },
          { name: '4th Standard', sections: ['A', 'B'] },
          { name: '5th Standard', sections: ['A', 'B'] },
        ],
      },
      {
        name: 'High School Section (6th to 10th)',
        stage: 'secondary',
        classes: [
          { name: '6th Standard', sections: ['A', 'B'] },
          { name: '7th Standard', sections: ['A', 'B'] },
          { name: '8th Standard', sections: ['A', 'B'] },
          { name: '9th Standard', sections: ['A', 'B'] },
          { name: '10th Standard', sections: ['A', 'B'], is_final_class: true },
        ],
      },
      {
        name: 'Higher Secondary Section (11th & 12th)',
        stage: 'higher_secondary',
        classes: [
          { name: '11th Standard', sections: ['A', 'B'] },
          { name: '12th Standard', sections: ['A', 'B'], is_final_class: true },
        ],
      },
    ],
    defaultDepartments: [
      { name: 'Tamil / Regional Language', code: 'LANG', subjects: ['Tamil (Second Language)', 'Regional Language'] },
      { name: 'English', code: 'ENG', subjects: ['English Language & Literature'] },
      { name: 'Mathematics', code: 'MATH', subjects: ['Mathematics', 'Advanced Maths'] },
      { name: 'Science', code: 'SCI', subjects: ['Science / EVS', 'Physics Theory & Lab', 'Chemistry Theory & Lab', 'Biology / Botany & Zoology'] },
      { name: 'Social Science', code: 'SOC', subjects: ['Social Science / History & Geography', 'Economics (Micro & Macro)'] },
    ],
  },

  school_kg_primary: {
    name: 'School: Kindergarten & Primary (Pre-KG to 5th)',
    category: 'school',
    groups: [
      {
        name: 'Kindergarten',
        stage: 'pre_primary',
        classes: [
          { name: 'Pre-KG', sections: ['A', 'B'] },
          { name: 'LKG', sections: ['A', 'B'] },
          { name: 'UKG', sections: ['A', 'B'] },
        ],
      },
      {
        name: 'Primary (1st to 5th)',
        stage: 'primary',
        classes: [
          { name: '1st Standard', sections: ['A', 'B'] },
          { name: '2nd Standard', sections: ['A', 'B'] },
          { name: '3rd Standard', sections: ['A', 'B'] },
          { name: '4th Standard', sections: ['A', 'B'] },
          { name: '5th Standard', sections: ['A', 'B'], is_final_class: true },
        ],
      },
    ],
    defaultDepartments: [
      { name: 'Early Childhood Education', code: 'ECE' },
      { name: 'Primary English', code: 'ENG' },
      { name: 'Primary Mathematics', code: 'MATH' },
      { name: 'Environmental Science', code: 'EVS' },
    ],
  },

  // --- College Structure Templates ---
  college_private_engineering: {
    name: 'College: Engineering & Technology (B.E. / B.Tech & PG)',
    category: 'college',
    groups: [
      {
        name: 'UG - B.E. / B.Tech (4 Years)',
        stage: 'higher_secondary',
        classes: [
          { name: 'Year 1 (Semester 1 & 2)', sections: ['A', 'B', 'C'] },
          { name: 'Year 2 (Semester 3 & 4)', sections: ['A', 'B', 'C'] },
          { name: 'Year 3 (Semester 5 & 6)', sections: ['A', 'B', 'C'] },
          { name: 'Year 4 (Semester 7 & 8)', sections: ['A', 'B'], is_final_class: true },
        ],
      },
      {
        name: 'PG - M.E. / M.Tech / MBA (2 Years)',
        stage: 'higher_secondary',
        classes: [
          { name: 'PG Year 1 (Semester 1 & 2)', sections: ['A', 'B'] },
          { name: 'PG Year 2 (Semester 3 & 4)', sections: ['A', 'B'], is_final_class: true },
        ],
      },
    ],
    defaultDepartments: [
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'Artificial Intelligence & Data Science', code: 'AI-DS' },
      { name: 'Electronics & Communication', code: 'ECE' },
      { name: 'Electrical & Electronics', code: 'EEE' },
      { name: 'Mechanical Engineering', code: 'MECH' },
      { name: 'Civil Engineering', code: 'CIVIL' },
      { name: 'Management Studies (MBA)', code: 'MBA' },
    ],
  },

  college_public_engineering: {
    name: 'College: Government Engineering College (UG & PG)',
    category: 'college',
    groups: [
      {
        name: 'UG B.E. / B.Tech Courses',
        stage: 'higher_secondary',
        classes: [
          { name: 'Year 1 (Semester 1 & 2)', sections: ['A', 'B'] },
          { name: 'Year 2 (Semester 3 & 4)', sections: ['A', 'B'] },
          { name: 'Year 3 (Semester 5 & 6)', sections: ['A', 'B'] },
          { name: 'Year 4 (Semester 7 & 8)', sections: ['A', 'B'], is_final_class: true },
        ],
      },
      {
        name: 'PG M.E. Specializations',
        stage: 'higher_secondary',
        classes: [
          { name: 'PG 1st Year', sections: ['A'] },
          { name: 'PG 2nd Year', sections: ['A'], is_final_class: true },
        ],
      },
    ],
    defaultDepartments: [
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'Mechanical Engineering', code: 'MECH' },
      { name: 'Civil Engineering', code: 'CIVIL' },
      { name: 'Electrical & Electronics', code: 'EEE' },
      { name: 'Physics & Chemistry (Science & Humanities)', code: 'S&H' },
    ],
  },

  college_private_arts_science: {
    name: 'College: Arts, Science & Commerce (UG 3-Yr & PG 2-Yr)',
    category: 'college',
    groups: [
      {
        name: 'UG 3-Year Degrees (B.Sc, B.Com, B.A, BBA)',
        stage: 'higher_secondary',
        classes: [
          { name: 'UG 1st Year (Sem 1 & 2)', sections: ['A', 'B', 'C'] },
          { name: 'UG 2nd Year (Sem 3 & 4)', sections: ['A', 'B', 'C'] },
          { name: 'UG 3rd Year (Sem 5 & 6)', sections: ['A', 'B', 'C'], is_final_class: true },
        ],
      },
      {
        name: 'PG 2-Year Degrees (M.Sc, M.Com, M.A)',
        stage: 'higher_secondary',
        classes: [
          { name: 'PG 1st Year (Sem 1 & 2)', sections: ['A', 'B'] },
          { name: 'PG 2nd Year (Sem 3 & 4)', sections: ['A', 'B'], is_final_class: true },
        ],
      },
    ],
    defaultDepartments: [
      { name: 'Computer Science & Applications', code: 'CS' },
      { name: 'Commerce & Accounting', code: 'COMM' },
      { name: 'Business Administration (BBA)', code: 'BBA' },
      { name: 'English Literature', code: 'ENG' },
      { name: 'Mathematics & Statistics', code: 'MATH' },
      { name: 'Economics', code: 'ECON' },
    ],
  },

  college_public_arts_science: {
    name: 'College: Government Arts & Science College (Shift I & II)',
    category: 'college',
    groups: [
      {
        name: 'Day Shift (Shift I)',
        stage: 'higher_secondary',
        classes: [
          { name: '1st Year (Shift I)', sections: ['A', 'B'] },
          { name: '2nd Year (Shift I)', sections: ['A', 'B'] },
          { name: '3rd Year (Shift I)', sections: ['A', 'B'], is_final_class: true },
        ],
      },
      {
        name: 'Evening Shift (Shift II)',
        stage: 'higher_secondary',
        classes: [
          { name: '1st Year (Shift II)', sections: ['A', 'B'] },
          { name: '2nd Year (Shift II)', sections: ['A', 'B'] },
          { name: '3rd Year (Shift II)', sections: ['A', 'B'], is_final_class: true },
        ],
      },
    ],
    defaultDepartments: [
      { name: 'Commerce', code: 'COMM' },
      { name: 'Computer Science', code: 'CS' },
      { name: 'History & Politics', code: 'HIST' },
      { name: 'Physics & Chemistry', code: 'SCI' },
    ],
  },

  college_polytechnic_diploma: {
    name: 'College: 3-Year Polytechnic Diploma Courses',
    category: 'college',
    groups: [
      {
        name: 'Diploma in Engineering (3 Years)',
        stage: 'higher_secondary',
        classes: [
          { name: 'Diploma 1st Year (Sem 1 & 2)', sections: ['A', 'B'] },
          { name: 'Diploma 2nd Year (Sem 3 & 4)', sections: ['A', 'B'] },
          { name: 'Diploma 3rd Year (Sem 5 & 6)', sections: ['A', 'B'], is_final_class: true },
        ],
      },
    ],
    defaultDepartments: [
      { name: 'Mechanical Engineering (Diploma)', code: 'D-MECH' },
      { name: 'Electrical Engineering (Diploma)', code: 'D-EEE' },
      { name: 'Civil Engineering (Diploma)', code: 'D-CIVIL' },
      { name: 'Computer Engineering (Diploma)', code: 'D-CSE' },
    ],
  },
};

// ============================================================
// 3. SUBJECT TEMPLATES & CATALOGS
// ============================================================
export const MASTER_SUBJECTS_CATALOG = {
  school_core: [
    { name: 'English Language & Literature', code: 'ENG101' },
    { name: 'Mathematics', code: 'MATH101' },
    { name: 'Science / EVS', code: 'SCI101' },
    { name: 'Social Studies / History & Civics', code: 'SOC101' },
    { name: 'Tamil (Second Language)', code: 'LANG-TAM' },
    { name: 'Hindi (Second Language)', code: 'LANG-HIN' },
    { name: 'Sanskrit (Second Language)', code: 'LANG-SAN' },
    { name: 'French (Second Language)', code: 'LANG-FRE' },
    { name: 'Telugu (Second Language)', code: 'LANG-TEL' },
    { name: 'Kannada (Second Language)', code: 'LANG-KAN' },
    { name: 'Malayalam (Second Language)', code: 'LANG-MAL' },
    { name: 'Computer Applications & Coding', code: 'CS101' },
    { name: 'Physical Education & Yoga', code: 'PET101' },
    { name: 'Art & Craft', code: 'ART101' },
    { name: 'Moral Science / Value Education', code: 'VAL101' },
  ],
  school_higher_sec_science: [
    { name: 'Physics Theory & Lab', code: 'PHY201' },
    { name: 'Chemistry Theory & Lab', code: 'CHE201' },
    { name: 'Mathematics (Advanced)', code: 'MATH201' },
    { name: 'Biology / Botany & Zoology', code: 'BIO201' },
    { name: 'Computer Science (Python & SQL)', code: 'CS201' },
    { name: 'English Core', code: 'ENG201' },
  ],
  school_higher_sec_commerce: [
    { name: 'Accountancy', code: 'ACC201' },
    { name: 'Business Studies / Commerce', code: 'BST201' },
    { name: 'Economics (Micro & Macro)', code: 'ECO201' },
    { name: 'Business Mathematics & Statistics', code: 'BMATH201' },
    { name: 'Computer Applications in Business', code: 'CAB201' },
    { name: 'English Core', code: 'ENG201' },
  ],
  school_higher_sec_arts: [
    { name: 'History & World Civilizations', code: 'HIST201' },
    { name: 'Political Science', code: 'POL201' },
    { name: 'Economics (Micro & Macro)', code: 'ECO201' },
    { name: 'Geography & Environmental Science', code: 'GEO201' },
    { name: 'Sociology & Social Work', code: 'SOC201' },
    { name: 'English Core', code: 'ENG201' },
  ],
  school_primary_core: [
    { name: 'English Language & Reading', code: 'ENG101' },
    { name: 'Mathematics', code: 'MATH101' },
    { name: 'Environmental Studies (EVS)', code: 'EVS101' },
    { name: 'Computer Basics & Digital Skills', code: 'CS101' },
    { name: 'Physical Education & Yoga', code: 'PET101' },
    { name: 'Art & Value Education', code: 'ART101' },
  ],
  college_engineering_core: [
    { name: 'Engineering Mathematics (Calculus & Linear Algebra)', code: 'MA3151' },
    { name: 'Engineering Physics', code: 'PH3151' },
    { name: 'Engineering Chemistry', code: 'CY3151' },
    { name: 'Programming in C & Data Structures', code: 'CS3151' },
    { name: 'Engineering Graphics & CAD', code: 'GE3151' },
    { name: 'Digital Logic & Circuit Analysis', code: 'EE3251' },
    { name: 'Object Oriented Programming (Java / C++)', code: 'CS3391' },
    { name: 'Database Management Systems & Lab', code: 'CS3491' },
    { name: 'Computer Networks', code: 'CS3591' },
    { name: 'Artificial Intelligence & Machine Learning', code: 'AI3601' },
    { name: 'Operating Systems & System Software', code: 'CS3451' },
  ],
  college_arts_commerce_core: [
    { name: 'Financial Accounting I & II', code: 'BCOM101' },
    { name: 'Principles of Management', code: 'BBA101' },
    { name: 'Business Law & Corporate Governance', code: 'BLAW201' },
    { name: 'Cost & Management Accounting', code: 'CMA301' },
    { name: 'Web Technology & Python Lab', code: 'BSC102' },
    { name: 'Statistics for Economics & Commerce', code: 'STAT101' },
    { name: 'Banking & Financial Services', code: 'BFS202' },
  ],
};

// ============================================================
// 4. TIMETABLE TEMPLATES
// ============================================================
export const TIMETABLE_TEMPLATES: TimetableTemplate[] = [
  {
    template_key: 'tt_school_private_8p',
    name: 'School: 8 Periods / Day (08:30 - 15:30)',
    description: '8 Periods of 45 mins with morning snack break (15m), lunch break (45m), and afternoon break (10m). Monday to Saturday.',
    institution_category: 'school',
    days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    periods_per_day: 8,
    start_time: '08:30:00',
    period_duration_minutes: 45,
    break_configs: [
      { after_period: 2, duration: 15, type: 'Short Break' },
      { after_period: 4, duration: 45, type: 'Lunch' },
      { after_period: 6, duration: 10, type: 'Short Break' },
    ],
  },
  {
    template_key: 'tt_school_public_7p',
    name: 'School: 7 Periods / Day (09:15 - 16:00)',
    description: '7 Periods of 45 mins with 15m morning interval and 45m lunch interval. Monday to Friday.',
    institution_category: 'school',
    days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periods_per_day: 7,
    start_time: '09:15:00',
    period_duration_minutes: 45,
    break_configs: [
      { after_period: 2, duration: 15, type: 'Morning Interval' },
      { after_period: 4, duration: 45, type: 'Lunch' },
      { after_period: 5, duration: 10, type: 'Evening Interval' },
    ],
  },
  {
    template_key: 'tt_school_kg_5p',
    name: 'Kindergarten: 5 Periods / Day (09:00 - 12:45)',
    description: '5 Short periods of 40 mins with snack break for Pre-KG, LKG and UKG young learners.',
    institution_category: 'school',
    days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periods_per_day: 5,
    start_time: '09:00:00',
    period_duration_minutes: 40,
    break_configs: [
      { after_period: 2, duration: 25, type: 'Snack Break' },
    ],
  },
  {
    template_key: 'tt_college_eng_7h',
    name: 'College: 7 Hours / Day (09:00 - 16:30)',
    description: '7 Lecture/Laboratory hours of 50 mins each with morning tea break (15m) and lunch break (50m). Monday to Saturday.',
    institution_category: 'college',
    days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    periods_per_day: 7,
    start_time: '09:00:00',
    period_duration_minutes: 50,
    break_configs: [
      { after_period: 2, duration: 15, type: 'Tea Break' },
      { after_period: 4, duration: 50, type: 'Lunch Break' },
    ],
  },
  {
    template_key: 'tt_college_arts_shift1',
    name: 'College: Arts & Science Shift I (08:30 - 13:30)',
    description: '5 Lectures of 55 minutes with a mid-morning break. Common in morning shift universities.',
    institution_category: 'college',
    days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periods_per_day: 5,
    start_time: '08:30:00',
    period_duration_minutes: 55,
    break_configs: [
      { after_period: 3, duration: 20, type: 'Mid-Morning Break' },
    ],
  },
  {
    template_key: 'tt_college_arts_shift2',
    name: 'College: Arts & Science Shift II (13:45 - 18:30)',
    description: '5 Lectures of 50 minutes with an evening interval. Common in afternoon/evening shift colleges.',
    institution_category: 'college',
    days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periods_per_day: 5,
    start_time: '13:45:00',
    period_duration_minutes: 50,
    break_configs: [
      { after_period: 3, duration: 15, type: 'Evening Break' },
    ],
  },
];

// Helper: Calculate daily slot schedule with start and end times
export function calculateDailySlotGrid(template: TimetableTemplate) {
  const slots: Array<{
    period_index: number;
    label: string;
    start_time: string;
    end_time: string;
    is_break: boolean;
    break_name?: string;
    duration: number;
  }> = [];

  const [startH, startM] = template.start_time.split(':').map(Number);
  let currentMinutes = startH * 60 + startM;

  const formatTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}:00`;
  };

  for (let p = 1; p <= template.periods_per_day; p++) {
    const periodStart = formatTime(currentMinutes);
    currentMinutes += template.period_duration_minutes;
    const periodEnd = formatTime(currentMinutes);

    slots.push({
      period_index: p,
      label: `Period ${p}`,
      start_time: periodStart,
      end_time: periodEnd,
      is_break: false,
      duration: template.period_duration_minutes,
    });

    // Check if there is a break after this period
    const breakItem = template.break_configs.find(b => b.after_period === p);
    if (breakItem) {
      const breakStart = formatTime(currentMinutes);
      currentMinutes += breakItem.duration;
      const breakEnd = formatTime(currentMinutes);

      slots.push({
        period_index: p, // associated with period after which it occurs
        label: `${breakItem.type} (${breakItem.duration}m)`,
        start_time: breakStart,
        end_time: breakEnd,
        is_break: true,
        break_name: breakItem.type,
        duration: breakItem.duration,
      });
    }
  }

  return slots;
}

// ============================================================
// 5. HELPER: AUTO-GENERATE CURRICULUM FOR ALL CONFIGURED CLASSES
// ============================================================
export interface GeneratedSubjectItem {
  id?: string;
  name: string;
  code: string;
  className: string;
  group: string;
}

export const STATE_LANGUAGE_MAP: Record<string, string[]> = {
  'tamil nadu': ['Tamil', 'Hindi'],
  'karnataka': ['Kannada', 'Hindi'],
  'kerala': ['Malayalam', 'Hindi'],
  'andhra pradesh': ['Telugu', 'Hindi'],
  'telangana': ['Telugu', 'Hindi'],
  'maharashtra': ['Marathi', 'Hindi'],
  'west bengal': ['Bengali', 'Hindi'],
  'gujarat': ['Gujarati', 'Hindi'],
  'punjab': ['Punjabi', 'Hindi'],
  'odisha': ['Odia', 'Hindi'],
  'delhi': ['Hindi', 'Sanskrit'],
  'uttar pradesh': ['Hindi', 'Sanskrit'],
  'madhya pradesh': ['Hindi', 'Sanskrit'],
  'rajasthan': ['Hindi', 'Sanskrit'],
  'bihar': ['Hindi', 'Sanskrit'],
  'haryana': ['Hindi', 'Sanskrit'],
  'assam': ['Assamese', 'Hindi'],
  'goa': ['Konkani', 'Hindi', 'French'],
};

export const COMMON_SECOND_LANGUAGES = [
  'Tamil',
  'Hindi',
  'Sanskrit',
  'French',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Marathi',
  'German',
  'Spanish',
  'Urdu',
  'Bengali',
  'Gujarati',
  'Arabic',
];

export function inferSecondLanguages(state?: string, city?: string, board?: string): string[] {
  const query = `${state || ''} ${city || ''}`.toLowerCase().trim();
  for (const [keyState, langs] of Object.entries(STATE_LANGUAGE_MAP)) {
    if (query.includes(keyState)) {
      return [...langs];
    }
  }
  if (/chennai|coimbatore|madurai|trichy|salem|tirunelveli|erode|vellore/.test(query)) {
    return ['Tamil', 'Hindi'];
  }
  if (/bengaluru|bangalore|mysuru|mysore|hubli|mangalore|belgaum/.test(query)) {
    return ['Kannada', 'Hindi'];
  }
  if (/mumbai|pune|nagpur|nashik|thane|aurangabad/.test(query)) {
    return ['Marathi', 'Hindi'];
  }
  if (/kochi|cochin|trivandrum|thiruvananthapuram|calicut|kozhikode|thrissur/.test(query)) {
    return ['Malayalam', 'Hindi'];
  }
  if (/hyderabad|visakhapatnam|vizag|vijayawada|guntur|warangal/.test(query)) {
    return ['Telugu', 'Hindi'];
  }
  if (/kolkata|calcutta|howrah|durgapur|siliguri/.test(query)) {
    return ['Bengali', 'Hindi'];
  }
  if (/ahmedabad|surat|vadodara|baroda|rajkot/.test(query)) {
    return ['Gujarati', 'Hindi'];
  }
  if (/chandigarh|amritsar|ludhiana|jalandhar/.test(query)) {
    return ['Punjabi', 'Hindi'];
  }
  if (/bhubaneswar|cuttack|rourkela/.test(query)) {
    return ['Odia', 'Hindi'];
  }
  if ((board || '').toLowerCase().includes('icse') || (board || '').toLowerCase().includes('ib') || (board || '').toLowerCase().includes('cambridge')) {
    return ['Hindi', 'French'];
  }
  return ['Tamil', 'Hindi'];
}

export type AcademicStageKey =
  | 'pre_primary'
  | 'primary'
  | 'secondary'
  | 'higher_secondary'
  | 'college'
  | 'general';

export type HigherSecStream = 'science' | 'commerce' | 'arts' | 'all';

/**
 * Detect educational stage based on class name, group name, or explicit stage tag.
 * Standardized across India:
 * - Pre-Primary: Pre-KG, LKG, UKG, Nursery
 * - Primary: 1st to 5th Standard
 * - Secondary / High School: 6th to 10th Standard
 * - Higher Secondary: 11th & 12th Standard (+1 & +2)
 * - College: UG / PG Degree, Semesters
 */
export function detectClassStage(
  className?: string,
  groupName?: string,
  stage?: string
): AcademicStageKey {
  const c = (className || '').toLowerCase().trim();
  const g = (groupName || '').toLowerCase().trim();
  const s = (stage || '').toLowerCase().trim();

  // 1. Explicit stage override
  if (s === 'pre_primary' || s === 'kg') return 'pre_primary';
  if (s === 'primary') return 'primary';
  if (s === 'middle' || s === 'secondary') return 'secondary';
  if (s === 'higher_secondary' || s === 'senior_secondary') return 'higher_secondary';
  if (s === 'college' || s === 'university') return 'college';

  // 2. Class name detection
  if (/pre[- ]?kg|lkg|ukg|nursery|kindergarten|playgroup|montessori/.test(c)) {
    return 'pre_primary';
  }
  if (
    /\b(11th|12th|class 11|class 12|grade 11|grade 12|std 11|std 12|\+1|\+2|plus one|plus two|xi|xii)\b/i.test(
      c
    )
  ) {
    return 'higher_secondary';
  }
  if (
    /\b(6th|7th|8th|9th|10th|class 6|class 7|class 8|class 9|class 10|grade 6|grade 7|grade 8|grade 9|grade 10|std 6|std 7|std 8|std 9|std 10|vi|vii|viii|ix|x)\b/i.test(
      c
    )
  ) {
    return 'secondary';
  }
  if (
    /\b(1st|2nd|3rd|4th|5th|class 1|class 2|class 3|class 4|class 5|grade 1|grade 2|grade 3|grade 4|grade 5|std 1|std 2|std 3|std 4|std 5|i|ii|iii|iv|v)\b/i.test(
      c
    )
  ) {
    return 'primary';
  }
  if (
    /year 1|year 2|year 3|year 4|sem 1|sem 2|sem 3|sem 4|sem 5|sem 6|sem 7|sem 8|semester|b\.e|b\.tech|m\.e|m\.tech|bba|bcom|bsc|ba|mba|mca|diploma/.test(
      c
    )
  ) {
    return 'college';
  }

  // 3. Group name detection fallback
  if (/pre[- ]?primary|kindergarten|nursery/.test(g)) return 'pre_primary';
  if (/higher[- ]?secondary|senior[- ]?secondary|11.*12|junior[- ]?college/.test(g))
    return 'higher_secondary';
  if (/secondary|high[- ]?school|middle|6.*10|6.*8|9.*10/.test(g)) return 'secondary';
  if (/primary|elementary|1.*5/.test(g)) return 'primary';
  if (/college|degree|engineering|polytechnic|ug|pg|university/.test(g)) return 'college';

  return 'primary';
}

/**
 * Generate curriculum for a specific educational stage and target classes.
 * Allows independent, stage-specific population (e.g. 1-5, 6-10, 11-12).
 */
export function generateCurriculumForStage(
  stage: AcademicStageKey,
  targetClasses: { name: string; id?: string; groupName?: string }[],
  options?: {
    secondLanguages?: string[];
    higherSecStream?: HigherSecStream;
    boardOrUniversity?: string;
    category?: InstitutionCategory;
  }
): GeneratedSubjectItem[] {
  const effectiveLanguages =
    Array.isArray(options?.secondLanguages) && options.secondLanguages.length > 0
      ? Array.from(new Set(options.secondLanguages.filter(Boolean)))
      : ['Tamil', 'Hindi'];
  const stream: HigherSecStream = options?.higherSecStream || 'science';
  const generated: GeneratedSubjectItem[] = [];

  targetClasses.forEach((cls, cIdx) => {
    const clsName = cls.name;

    // 1. Pre-Primary (Kindergarten)
    if (stage === 'pre_primary') {
      const kgSubs = [
        { name: 'Phonics & Early English', code: 'ENG-KG', group: 'Pre-Primary' },
        { name: 'Early Numeracy & Math', code: 'MATH-KG', group: 'Pre-Primary' },
        { name: 'Rhymes & Storytelling', code: 'RHY-KG', group: 'Pre-Primary' },
        { name: 'Art, Craft & Motor Skills', code: 'ART-KG', group: 'Pre-Primary' },
        { name: 'General Awareness & Play', code: 'EVS-KG', group: 'Pre-Primary' },
      ];
      kgSubs.forEach(s => {
        generated.push({
          id: `sub_kg_${cIdx}_${s.code}`,
          name: s.name,
          code: s.code,
          className: clsName,
          group: s.group,
        });
      });
    }

    // 2. Primary School (1st to 5th Standard)
    else if (stage === 'primary') {
      const primSubs = [
        { name: 'English Language & Reading', code: 'ENG101', group: 'Primary Core' },
        { name: 'Mathematics', code: 'MATH101', group: 'Primary Core' },
        { name: 'Environmental Studies (EVS)', code: 'EVS101', group: 'Primary Core' },
        { name: 'Computer Basics & Digital Skills', code: 'CS101', group: 'Primary Core' },
        { name: 'Physical Education & Yoga', code: 'PET101', group: 'Primary Core' },
        { name: 'Art & Value Education', code: 'ART101', group: 'Primary Core' },
      ];
      primSubs.forEach(s => {
        generated.push({
          id: `sub_prim_${cIdx}_${s.code}`,
          name: s.name,
          code: s.code,
          className: clsName,
          group: s.group,
        });
      });
      // Separate clean subjects for each configured second language
      effectiveLanguages.forEach((lang, lIdx) => {
        const lCode = `LNG1-${lang.slice(0, 3).toUpperCase()}`;
        generated.push({
          id: `sub_prim_${cIdx}_${lCode}_${lIdx}`,
          name: `${lang} (Second Language)`,
          code: lCode,
          className: clsName,
          group: 'Second Language',
        });
      });
    }

    // 3. Middle & High School (6th to 10th Standard)
    else if (stage === 'secondary') {
      const secSubs = [
        { name: 'English Language & Literature', code: 'ENG201', group: 'Secondary Core' },
        { name: 'Mathematics', code: 'MATH201', group: 'Secondary Core' },
        { name: 'Science (Physics, Chemistry, Biology)', code: 'SCI201', group: 'Secondary Core' },
        { name: 'Social Science (History, Civics, Geography)', code: 'SOC201', group: 'Secondary Core' },
        { name: 'Computer Applications & Coding', code: 'CS201', group: 'Secondary Core' },
        { name: 'Physical Education & Health', code: 'PET201', group: 'Secondary Core' },
      ];
      secSubs.forEach(s => {
        generated.push({
          id: `sub_sec_${cIdx}_${s.code}`,
          name: s.name,
          code: s.code,
          className: clsName,
          group: s.group,
        });
      });
      // Separate clean subjects for each configured second language
      effectiveLanguages.forEach((lang, lIdx) => {
        const lCode = `LNG2-${lang.slice(0, 3).toUpperCase()}`;
        generated.push({
          id: `sub_sec_${cIdx}_${lCode}_${lIdx}`,
          name: `${lang} (Second Language)`,
          code: lCode,
          className: clsName,
          group: 'Second Language',
        });
      });
    }

    // 4. Higher Secondary School (11th & 12th Standard) - Differentiated by Stream
    else if (stage === 'higher_secondary') {
      let higherSubs: Array<{ name: string; code: string; group: string }> = [];

      if (stream === 'commerce') {
        higherSubs = [
          { name: 'English Core', code: 'ENG301', group: 'Commerce Core' },
          { name: 'Accountancy', code: 'ACC301', group: 'Commerce Core' },
          { name: 'Business Studies / Commerce', code: 'BST301', group: 'Commerce Core' },
          { name: 'Economics (Micro & Macro)', code: 'ECO301', group: 'Commerce Core' },
          { name: 'Business Mathematics & Statistics', code: 'BMATH301', group: 'Commerce Elective' },
          { name: 'Computer Applications in Business', code: 'CAB301', group: 'Commerce Elective' },
        ];
      } else if (stream === 'arts') {
        higherSubs = [
          { name: 'English Core', code: 'ENG301', group: 'Arts Core' },
          { name: 'History & World Civilizations', code: 'HIST301', group: 'Arts Core' },
          { name: 'Political Science', code: 'POL301', group: 'Arts Core' },
          { name: 'Economics (Micro & Macro)', code: 'ECO301', group: 'Arts Core' },
          { name: 'Geography & Environmental Science', code: 'GEO301', group: 'Arts Elective' },
          { name: 'Sociology & Social Work', code: 'SOC301', group: 'Arts Elective' },
        ];
      } else if (stream === 'all') {
        higherSubs = [
          { name: 'English Core', code: 'ENG301', group: 'Language Part 1' },
          { name: 'Physics Theory & Lab', code: 'PHY301', group: 'Science Stream' },
          { name: 'Chemistry Theory & Lab', code: 'CHE301', group: 'Science Stream' },
          { name: 'Mathematics (Advanced)', code: 'MATH301', group: 'Science Stream' },
          { name: 'Biology / Botany & Zoology', code: 'BIO301', group: 'Science Stream' },
          { name: 'Computer Science (Python & SQL)', code: 'CS301', group: 'Science Stream' },
          { name: 'Accountancy', code: 'ACC301', group: 'Commerce Stream' },
          { name: 'Business Studies / Commerce', code: 'BST301', group: 'Commerce Stream' },
          { name: 'Economics (Micro & Macro)', code: 'ECO301', group: 'Commerce Stream' },
          { name: 'Physical Education', code: 'PET301', group: 'General' },
        ];
      } else {
        // Default: Science Stream
        higherSubs = [
          { name: 'English Core', code: 'ENG301', group: 'Language Part 1' },
          { name: 'Physics Theory & Lab', code: 'PHY301', group: 'Science Core' },
          { name: 'Chemistry Theory & Lab', code: 'CHE301', group: 'Science Core' },
          { name: 'Mathematics (Advanced)', code: 'MATH301', group: 'Science Core' },
          { name: 'Biology / Botany & Zoology', code: 'BIO301', group: 'Science Elective' },
          { name: 'Computer Science (Python & SQL)', code: 'CS301', group: 'Science Elective' },
          { name: 'Physical Education', code: 'PET301', group: 'General' },
        ];
      }

      higherSubs.forEach(s => {
        generated.push({
          id: `sub_hsec_${cIdx}_${s.code}`,
          name: s.name,
          code: s.code,
          className: clsName,
          group: s.group,
        });
      });

      // Part 1 Regional Language (if chosen)
      if (effectiveLanguages.length > 0) {
        const primaryLang = effectiveLanguages[0];
        const lCode = `LNG3-${primaryLang.slice(0, 3).toUpperCase()}`;
        generated.push({
          id: `sub_hsec_${cIdx}_${lCode}`,
          name: `${primaryLang} (Language Part 1)`,
          code: lCode,
          className: clsName,
          group: 'Language Part 1',
        });
      }
    }

    // 5. College / Degree Courses
    else if (stage === 'college') {
      const isEng =
        (options?.category === 'college' && (clsName.toLowerCase().includes('year') || (cls.groupName || '').toLowerCase().includes('eng'))) ||
        (cls.groupName || '').toLowerCase().includes('b.e') ||
        (cls.groupName || '').toLowerCase().includes('b.tech');

      if (isEng) {
        const engSubs = [
          { name: 'Engineering Mathematics', code: 'MA3151', group: 'Engineering Core' },
          { name: 'Engineering Physics / Chemistry', code: 'PH3151', group: 'Engineering Core' },
          { name: 'Problem Solving & Programming in Python/C', code: 'CS3151', group: 'Engineering Core' },
          { name: 'Engineering Graphics & CAD', code: 'GE3151', group: 'Engineering Core' },
          { name: 'Technical English & Soft Skills', code: 'HS3151', group: 'Language' },
        ];
        engSubs.forEach(s => {
          generated.push({
            id: `sub_clg_${cIdx}_${s.code}`,
            name: s.name,
            code: s.code,
            className: clsName,
            group: s.group,
          });
        });
      } else {
        const artsSubs = [
          { name: 'Core Major Course I', code: 'CORE101', group: 'Degree Core' },
          { name: 'Core Major Course II', code: 'CORE102', group: 'Degree Core' },
          { name: 'Allied Subject & Practical', code: 'ALLIED101', group: 'Degree Core' },
          { name: 'General English / Communication', code: 'ENG101', group: 'Degree Core' },
          { name: 'Value Education & Digital Literacy', code: 'VAL101', group: 'Skill Course' },
        ];
        artsSubs.forEach(s => {
          generated.push({
            id: `sub_clg_${cIdx}_${s.code}`,
            name: s.name,
            code: s.code,
            className: clsName,
            group: s.group,
          });
        });
      }
    }

    // 6. Generic Fallback
    else {
      const fallbackSubs = [
        { name: 'English Language', code: 'ENG101', group: 'Core' },
        { name: 'Core Subject 1', code: 'CORE101', group: 'Core' },
        { name: 'Core Subject 2', code: 'CORE102', group: 'Core' },
        { name: 'Practical / Activity Lab', code: 'LAB101', group: 'Core' },
        { name: 'Physical Education & Wellness', code: 'PET101', group: 'Core' },
      ];
      fallbackSubs.forEach(s => {
        generated.push({
          id: `sub_fb_${cIdx}_${s.code}`,
          name: s.name,
          code: s.code,
          className: clsName,
          group: s.group,
        });
      });
    }
  });

  return generated;
}

/**
 * Auto-generate full curriculum for all configured academic groups and standards.
 * Each group/class automatically receives its stage-appropriate subjects:
 * - 1st to 5th: Primary foundational subjects + regional second language
 * - 6th to 10th: Middle/Secondary subjects + second language
 * - 11th & 12th: Stream-tailored subjects (Science / Commerce / Arts)
 * - Pre-KG/LKG/UKG: Early childhood development subjects
 */
export function generateDefaultCurriculumForStructure(
  structure: GroupStructureItem[],
  category: InstitutionCategory,
  boardOrUniversity: string = 'CBSE',
  secondLanguages: string[] = ['Tamil', 'Hindi'],
  higherSecStream: HigherSecStream = 'science'
): GeneratedSubjectItem[] {
  const generated: GeneratedSubjectItem[] = [];

  structure.forEach((group) => {
    const groupNameLower = (group.name || '').toLowerCase();
    const groupStream: HigherSecStream = groupNameLower.includes('commerce')
      ? 'commerce'
      : groupNameLower.includes('arts')
      ? 'arts'
      : higherSecStream;

    (group.classes || []).forEach((cls) => {
      const stage = detectClassStage(cls.name, group.name, group.stage);
      const subs = generateCurriculumForStage(
        stage,
        [{ name: cls.name, groupName: group.name }],
        {
          secondLanguages,
          higherSecStream: groupStream,
          boardOrUniversity,
          category,
        }
      );
      generated.push(...subs);
    });
  });

  return generated;
}

// ============================================================
// 6. PRE-CONFIGURED STREAM BUNDLES FOR HIGHER SECONDARY (11th & 12th)
// ============================================================
export interface StreamSubjectBundle {
  id: string;
  name: string;
  stream: 'science' | 'commerce' | 'arts' | 'vocational';
  badge: string;
  color: string;
  description: string;
  subjects: Array<{ name: string; code: string; group: string }>;
}

export const STREAM_SUBJECT_BUNDLES: StreamSubjectBundle[] = [
  {
    id: 'stream_sci_comp',
    name: 'Science (PCM + Computer Science)',
    stream: 'science',
    badge: 'Physics, Chemistry, Math, CS',
    color: '#0284C7',
    description: 'Engineering & Computing focus with Advanced Mathematics, Physics, Chemistry, and Python/SQL.',
    subjects: [
      { name: 'English Core', code: 'ENG301', group: 'Language Part 1' },
      { name: 'Physics Theory & Lab', code: 'PHY301', group: 'Science Core' },
      { name: 'Chemistry Theory & Lab', code: 'CHE301', group: 'Science Core' },
      { name: 'Mathematics (Advanced)', code: 'MATH301', group: 'Science Core' },
      { name: 'Computer Science (Python & SQL)', code: 'CS301', group: 'Science Elective' },
      { name: 'Physical Education & Wellness', code: 'PET301', group: 'General' },
    ],
  },
  {
    id: 'stream_sci_bio',
    name: 'Science (PCB + Biology / Pre-Medical)',
    stream: 'science',
    badge: 'Physics, Chemistry, Bio, Math',
    color: '#059669',
    description: 'Medical & Life Sciences focus with Biology / Botany & Zoology, Chemistry, and Physics.',
    subjects: [
      { name: 'English Core', code: 'ENG301', group: 'Language Part 1' },
      { name: 'Physics Theory & Lab', code: 'PHY301', group: 'Science Core' },
      { name: 'Chemistry Theory & Lab', code: 'CHE301', group: 'Science Core' },
      { name: 'Biology / Botany & Zoology', code: 'BIO301', group: 'Science Core' },
      { name: 'Mathematics / Psychology', code: 'MATH302', group: 'Science Elective' },
      { name: 'Physical Education & Wellness', code: 'PET301', group: 'General' },
    ],
  },
  {
    id: 'stream_comm_math',
    name: 'Commerce (With Business Math & Stats)',
    stream: 'commerce',
    badge: 'Accounts, BST, Eco, Math',
    color: '#D97706',
    description: 'Finance, Banking & CA track with Accountancy, Business Studies, Economics, and Applied Math.',
    subjects: [
      { name: 'English Core', code: 'ENG301', group: 'Language Part 1' },
      { name: 'Accountancy', code: 'ACC301', group: 'Commerce Core' },
      { name: 'Business Studies / Commerce', code: 'BST301', group: 'Commerce Core' },
      { name: 'Economics (Micro & Macro)', code: 'ECO301', group: 'Commerce Core' },
      { name: 'Business Mathematics & Statistics', code: 'BMATH301', group: 'Commerce Elective' },
      { name: 'Physical Education / General', code: 'PET301', group: 'General' },
    ],
  },
  {
    id: 'stream_comm_ca',
    name: 'Commerce (With Computer Applications / IP)',
    stream: 'commerce',
    badge: 'Accounts, BST, Eco, Comp App',
    color: '#EA580C',
    description: 'Commercial applications & E-commerce with Informatics Practices / Computer Applications.',
    subjects: [
      { name: 'English Core', code: 'ENG301', group: 'Language Part 1' },
      { name: 'Accountancy', code: 'ACC301', group: 'Commerce Core' },
      { name: 'Business Studies / Commerce', code: 'BST301', group: 'Commerce Core' },
      { name: 'Economics (Micro & Macro)', code: 'ECO301', group: 'Commerce Core' },
      { name: 'Computer Applications in Business (IP)', code: 'CAB301', group: 'Commerce Elective' },
      { name: 'Physical Education / General', code: 'PET301', group: 'General' },
    ],
  },
  {
    id: 'stream_arts_humanities',
    name: 'Arts & Humanities (Social Sciences)',
    stream: 'arts',
    badge: 'History, Pol Sci, Eco, Socio',
    color: '#7C3AED',
    description: 'Civil services, Law & Humanities track with History, Political Science, Economics, and Sociology.',
    subjects: [
      { name: 'English Core', code: 'ENG301', group: 'Language Part 1' },
      { name: 'History & World Civilizations', code: 'HIST301', group: 'Arts Core' },
      { name: 'Political Science', code: 'POL301', group: 'Arts Core' },
      { name: 'Economics (Micro & Macro)', code: 'ECO301', group: 'Arts Core' },
      { name: 'Sociology & Social Work', code: 'SOC301', group: 'Arts Elective' },
      { name: 'Geography & Environmental Science', code: 'GEO301', group: 'Arts Elective' },
    ],
  },
];

export function getStreamBundlesForBoard(_board?: string): StreamSubjectBundle[] {
  return STREAM_SUBJECT_BUNDLES;
}


// ============================================================
// 6. MASTER DEPARTMENTS & CURATED SUBJECTS CATALOG
// ============================================================

export interface MasterDepartmentDefinition {
  name: string;
  code: string;
  category: 'all' | 'school' | 'college';
  defaultSubjects: string[];
}

export const MASTER_DEPARTMENTS_CATALOG: MasterDepartmentDefinition[] = [
  // --- COLLEGE DEPARTMENTS ---
  {
    name: 'Artificial Intelligence & Data Science',
    code: 'AI-DS',
    category: 'college',
    defaultSubjects: [
      'Machine Learning Techniques',
      'Deep Learning & Neural Networks',
      'Artificial Intelligence Foundations',
      'Natural Language Processing',
      'Big Data Analytics',
      'Python for Data Science',
      'Computer Vision',
      'Data Visualization & Mining',
    ],
  },
  {
    name: 'Computer Science & Engineering',
    code: 'CSE',
    category: 'college',
    defaultSubjects: [
      'Programming in C & C++',
      'Data Structures & Algorithms',
      'Database Management Systems (DBMS)',
      'Operating Systems',
      'Computer Networks',
      'Object Oriented Programming (Java)',
      'Software Engineering & Agile',
      'Web Technology & Full Stack',
      'Cloud Computing',
      'Cyber Security & Cryptography',
      'Design & Analysis of Algorithms',
    ],
  },
  {
    name: 'Information Technology',
    code: 'IT',
    category: 'college',
    defaultSubjects: [
      'Web Application Development',
      'Database Technologies & Administration',
      'Information Security & Cryptography',
      'Mobile Application Development',
      'Distributed Systems & Cloud',
      'Software Testing & Automation',
    ],
  },
  {
    name: 'Electronics & Communication Engineering',
    code: 'ECE',
    category: 'college',
    defaultSubjects: [
      'Electronic Devices & Circuits',
      'Digital Logic Design',
      'Signals and Systems',
      'Microprocessors & Microcontrollers',
      'VLSI Design & Embedded Systems',
      'Wireless & Mobile Communication',
      'Digital Signal Processing (DSP)',
      'Optical Communication & Networks',
    ],
  },
  {
    name: 'Electrical & Electronics Engineering',
    code: 'EEE',
    category: 'college',
    defaultSubjects: [
      'Electric Circuit Analysis',
      'Electromagnetic Fields',
      'Electrical Machines I & II',
      'Power Electronics & Drives',
      'Power Systems (Generation & Transmission)',
      'Control Systems',
      'Renewable Energy Systems',
    ],
  },
  {
    name: 'Mechanical Engineering',
    code: 'MECH',
    category: 'college',
    defaultSubjects: [
      'Engineering Mechanics & Statics',
      'Thermodynamics & Thermal Engineering',
      'Fluid Mechanics & Machinery',
      'Manufacturing Technology & Workshop',
      'Kinematics & Dynamics of Machinery',
      'Design of Machine Elements',
      'Heat and Mass Transfer',
      'CAD / CAM & Automation',
    ],
  },
  {
    name: 'Civil Engineering',
    code: 'CIVIL',
    category: 'college',
    defaultSubjects: [
      'Strength of Materials',
      'Fluid Mechanics & Hydraulics',
      'Surveying & Geomatics',
      'Structural Analysis & Design',
      'Geotechnical Engineering & Soil Mechanics',
      'Environmental Engineering',
      'Transportation & Highway Engineering',
      'Construction Project Management',
    ],
  },
  {
    name: 'Commerce & Accounting',
    code: 'COMM',
    category: 'college',
    defaultSubjects: [
      'Financial Accounting',
      'Corporate Accounting',
      'Cost & Management Accounting',
      'Banking Theory & Financial Markets',
      'Auditing & Corporate Governance',
      'Income Tax Law & Practice',
      'Company Law & Secretarial Practice',
    ],
  },
  {
    name: 'Business Administration (BBA / MBA)',
    code: 'BBA',
    category: 'college',
    defaultSubjects: [
      'Principles of Management',
      'Organizational Behavior',
      'Marketing Management',
      'Financial Management',
      'Human Resource Management (HRM)',
      'Operations & Supply Chain Management',
      'Strategic Management',
      'Business Analytics & Research',
    ],
  },
  {
    name: 'Mathematics & Statistics',
    code: 'MATH',
    category: 'college',
    defaultSubjects: [
      'Engineering Mathematics / Calculus',
      'Linear Algebra & Matrices',
      'Differential Equations & Transforms',
      'Probability & Statistics',
      'Discrete Mathematics & Graph Theory',
      'Numerical Methods & Optimization',
      'Operations Research',
    ],
  },
  {
    name: 'Physics',
    code: 'PHY',
    category: 'college',
    defaultSubjects: [
      'Engineering Physics',
      'Waves, Optics & Acoustics',
      'Quantum Mechanics & Solid State',
      'Semiconductor Physics',
      'Physics Laboratory / Practical',
    ],
  },
  {
    name: 'Chemistry',
    code: 'CHEM',
    category: 'college',
    defaultSubjects: [
      'Engineering Chemistry',
      'Organic Chemistry',
      'Inorganic & Physical Chemistry',
      'Analytical Chemistry',
      'Chemistry Laboratory / Practical',
    ],
  },
  {
    name: 'English & Communication',
    code: 'ENG',
    category: 'college',
    defaultSubjects: [
      'Communicative English',
      'Technical English & Professional Skills',
      'Business Communication',
      'Interpersonal Skills & Verbal Ability',
    ],
  },
  {
    name: 'Biotechnology & Bioinformatics',
    code: 'BIO',
    category: 'college',
    defaultSubjects: [
      'Cell Biology & Biochemistry',
      'Microbiology & Immunology',
      'Genetic Engineering & Recombinant DNA',
      'Bioprocess Engineering',
      'Bioinformatics & Genomics',
    ],
  },
  {
    name: 'Physical Education & Sports',
    code: 'PET',
    category: 'college',
    defaultSubjects: [
      'Physical Fitness & Health',
      'Sports & Games Training',
      'Yoga & Stress Management',
    ],
  },

  // --- SCHOOL DEPARTMENTS ---
  {
    name: 'Mathematics',
    code: 'MATH',
    category: 'school',
    defaultSubjects: [
      'Mathematics (General)',
      'Algebra & Geometry',
      'Trigonometry & Coordinate Geometry',
      'Applied Mathematics',
      'Statistics & Probability',
    ],
  },
  {
    name: 'Science',
    code: 'SCI',
    category: 'school',
    defaultSubjects: [
      'General Science (EVS)',
      'Physics (Theory & Lab)',
      'Chemistry (Theory & Lab)',
      'Biology (Botany & Zoology)',
      'Environmental Science',
    ],
  },
  {
    name: 'English Language & Literature',
    code: 'ENG',
    category: 'school',
    defaultSubjects: [
      'English Communicative & Grammar',
      'English Literature & Prose',
      'Creative Writing & Reading Comprehension',
    ],
  },
  {
    name: 'Languages / Second Language',
    code: 'LANG',
    category: 'school',
    defaultSubjects: [
      'Tamil (Second Language)',
      'Hindi (Second Language)',
      'French (Second Language)',
      'Sanskrit (Second Language)',
      'Telugu / Malayalam (Regional)',
    ],
  },
  {
    name: 'Social Science / Humanities',
    code: 'SOC',
    category: 'school',
    defaultSubjects: [
      'History (India & The Contemporary World)',
      'Geography (Contemporary India)',
      'Political Science & Civics',
      'Economics & Understanding Development',
      'Sociology',
    ],
  },
  {
    name: 'Computer Science & Applications',
    code: 'CS',
    category: 'school',
    defaultSubjects: [
      'Computer Applications & Basics',
      'Coding & Python Basics',
      'Information Technology (IT)',
      'Computer Science (Python & SQL)',
    ],
  },
  {
    name: 'Commerce & Economics',
    code: 'COMM',
    category: 'school',
    defaultSubjects: [
      'Accountancy',
      'Business Studies',
      'Micro & Macro Economics',
      'Entrepreneurship',
    ],
  },
  {
    name: 'Physical Education, Health & Yoga',
    code: 'PET',
    category: 'school',
    defaultSubjects: [
      'Physical Education & Athletics',
      'Health & Wellness',
      'Yoga & Meditation',
    ],
  },
  {
    name: 'Arts, Music & Performing Arts',
    code: 'ART',
    category: 'school',
    defaultSubjects: [
      'Art & Craft / Drawing',
      'Performing Arts & Music',
      'Value Education & Life Skills',
    ],
  },
];

export function autoGenerateDeptCode(deptName: string): string {
  if (!deptName) return '';
  const trimmed = deptName.trim();
  const found = MASTER_DEPARTMENTS_CATALOG.find(
    d => d.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (found) return found.code;

  const words = trimmed
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !['and', 'of', 'for', 'in', 'the', '&'].includes(w.toLowerCase()));

  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }
  return words.map(w => w[0].toUpperCase()).slice(0, 4).join('');
}

export function getStandardSubjectsForDepartment(deptName: string, category?: string): string[] {
  if (!deptName) return [];
  const trimmed = deptName.trim().toLowerCase();
  const match = MASTER_DEPARTMENTS_CATALOG.find(d => {
    if (category && d.category !== 'all' && d.category !== category) return false;
    return d.name.toLowerCase() === trimmed;
  });

  return match ? [...match.defaultSubjects] : [];
}
