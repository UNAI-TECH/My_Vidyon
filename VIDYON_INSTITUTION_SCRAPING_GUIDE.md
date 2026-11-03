# Vidyon Institution Data Scraping & CSV Specification Guide

This document outlines the exact data schema, validation rules, fallback policies, and template mappings required to compile school and college records for **My Vidyon**'s Master Catalog (`master_institutions_catalog`).

---

## 1. Geographic Scope & Batch Sizing

* **Initial Pilot Batch**: Focus on **50 to 100 prominent institutions** in **Chennai and Coimbatore** districts.
  * **Top Tier-1 & Tier-2 Schools**: CBSE, ICSE, and leading Matriculation Higher Secondary Schools.
  * **Engineering Colleges**: Autonomous, Anna University affiliated, and Deemed Technical Universities.
  * **Arts, Science & Commerce Colleges**: Autonomous and Government Shift-based Colleges.
* **Phase 2 Expansion**: Once the pilot batch is uploaded and verified in the dropdown, expand to Madurai, Tiruchirappalli, Salem, Tirunelveli, and remaining Tamil Nadu districts.

---

## 2. Missing Contact Fields & Fallback Policies

| Field | Availability Status | Fallback Policy |
| :--- | :--- | :--- |
| `office_phone` | Usually available on official website / Google Maps. | Mandatory contact number (landline or mobile). Format: `+91 44 2453 8899`. |
| `guard_phone` | Rarely listed on public websites. | **Leave blank (`""`)** or replicate `office_phone`. Never generate random numbers. |
| `transport_phone` | Rarely listed on public websites. | **Leave blank (`""`)** or replicate `office_phone`. |
| `email` | Often public (`info@school.edu.in` or `principal@college.ac.in`). | If not publicly found, generate the official Vidyon setup fallback:<br>`admin@<clean_code>.vidyon.app`<br>*(e.g., for code `SSN-ENG-01`, email is `admin@ssneng01.vidyon.app`)* |

---

## 3. Institution Code (`institution_code`) Guidelines

* **Schools**:
  * Use official **UDISE+ code** if available: `UDISE-33020100101`
  * Alternatively, use standard prefixed format: `[PREFIX]-[DISTRICT]-[SEQ]` (e.g., `DAV-CHE-01`, `CPS-CHE-02`, `KV-IITM-03`).
* **Colleges**:
  * Use official **TNEA Counselling Code** for engineering: `TNEA-1315`, `TNEA-1419`
  * Or university abbreviation: `LOY-ENG-02`, `PRES-ART-04`, `PSG-TECH-01`.
* **Format Constraints**:
  * Strictly uppercase.
  * Only alphanumeric characters and hyphens (`-`). No spaces or special punctuation.
  * Must be unique across all rows in the dataset.

---

## 4. Master Template Keys & Curriculum Mapping

Each record in the CSV requires three template key references that configure its academic groups, default subjects, and timetable bell schedule. Use the exact keys listed below:

### A. School Templates (`institution_category = "school"`)

| School Category & Board | `default_structure_template_key` | `default_subject_template_key` | `default_timetable_template_key` | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Private K-12 (CBSE / ICSE / Matric)** | `school_private_k12` | `school_cbse_k12` | `tt_school_standard_8p` | Pre-KG to 12th Standard; 8 periods/day (45m). |
| **Private K-10 (Pre-KG to 10th)** | `school_private_k10` | `school_cbse_k12` | `tt_school_standard_8p` | Primary & High School without Higher Secondary. |
| **Govt / State Board (Samacheer Kalvi)** | `school_public_1_12` | `school_state_1_12` | `tt_school_public_7p` | 1st to 12th Standard; 7 periods/day (45m). |
| **Kindergarten / Primary Only** | `school_kg_primary` | `school_cbse_k12` | `tt_school_kg_5p` | Pre-KG to 5th Standard; 5 periods/day (40m). |

### B. College Templates (`institution_category = "college"`)

| College Category & Degree | `default_structure_template_key` | `default_subject_template_key` | `default_timetable_template_key` | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Private Engineering (Autonomous / Anna Univ)** | `college_private_engineering` | `college_engineering_ug` | `tt_college_eng_7h` | 4-Year B.E./B.Tech + 2-Year M.E./MBA; 7 periods/day. |
| **Government Engineering College** | `college_public_engineering` | `college_engineering_ug` | `tt_college_eng_7h` | State govt technical institutes; 7 periods/day. |
| **Arts, Science & Commerce (Private)** | `college_private_arts_science` | `college_arts_science_ug` | `tt_college_arts_shift1` | 3-Year B.Sc/B.Com/B.A + 2-Year M.Sc/M.Com; Shift I. |
| **Govt Arts & Science College (Shift I & II)** | `college_public_arts_science` | `college_arts_science_ug` | `tt_college_arts_shift1` | Day & Evening Shift curricula. |

---

## 5. CSV Schema & Column Specifications

The output CSV file must match the following exact header order:

```csv
institution_code,name,institution_category,ownership_type,board_or_university,address_line_1,address_line_2,city,state,pincode,latitude,longitude,map_link,email,office_phone,guard_phone,transport_phone,has_kg,academic_stages,default_structure_template_key,default_subject_template_key,default_timetable_template_key
```

### Column Constraints:

| Column | Type | Allowed Values / Formatting | Example |
| :--- | :--- | :--- | :--- |
| `institution_code` | String (Unique) | Uppercase alphanumeric + hyphens. | `DPS-CHE-01` |
| `name` | String | Full legal/campus name (quoted if commas exist). | `"Delhi Public School, East Coast Road"` |
| `institution_category`| Enum | Strictly `school` or `college`. | `school` |
| `ownership_type` | Enum | Strictly `private` or `public`. | `private` |
| `board_or_university` | String | CBSE, ICSE, State Board, Matriculation, or Anna University. | `CBSE` |
| `address_line_1` | String | Primary street address or campus name. | `"124 ECR Road, Akkarai"` |
| `address_line_2` | String | Sub-locality, landmark, or taluk. | `"Sholinganallur"` |
| `city` | String | District or City in Tamil Nadu. | `Chennai` |
| `state` | String | State name. | `Tamil Nadu` |
| `pincode` | String | 6-digit postal code. | `600119` |
| `latitude` | Decimal / Null | GPS coordinate (decimal degrees). | `12.8985` |
| `longitude` | Decimal / Null | GPS coordinate (decimal degrees). | `80.2458` |
| `map_link` | URL / String | Google Maps shortlink or query URL. | `"https://maps.google.com/?q=12.8985,80.2458"` |
| `email` | Email | Official contact email or Vidyon fallback. | `admin@dpschennai.vidyon.app` |
| `office_phone` | String | Primary landline/mobile with country code. | `+91 44 2453 8899` |
| `guard_phone` | String | Campus security desk phone or empty. | `+91 98401 12233` |
| `transport_phone` | String | Transport desk phone or empty. | `+91 98402 23344` |
| `has_kg` | Boolean | `true` if campus has Kindergarten; otherwise `false`. | `true` |
| `academic_stages` | Quoted List | Quoted comma-separated stages: `pre_primary`, `primary`, `middle`, `secondary`, `higher_secondary`. | `"primary,middle,secondary,higher_secondary"` |
| `default_structure_template_key` | String | Key from Section 4. | `school_private_k12` |
| `default_subject_template_key` | String | Key from Section 4. | `school_cbse_k12` |
| `default_timetable_template_key` | String | Key from Section 4. | `tt_school_standard_8p` |

---

## 6. Sample CSV Output

```csv
institution_code,name,institution_category,ownership_type,board_or_university,address_line_1,address_line_2,city,state,pincode,latitude,longitude,map_link,email,office_phone,guard_phone,transport_phone,has_kg,academic_stages,default_structure_template_key,default_subject_template_key,default_timetable_template_key
DPS-CHE-01,"Delhi Public School, East Coast Road",school,private,CBSE,"124 ECR Road, Akkarai","Sholinganallur",Chennai,Tamil Nadu,600119,12.8985,80.2458,"https://maps.google.com/?q=12.8985,80.2458",admin@dpschennai.vidyon.app,+91 44 2453 8899,+91 98401 12233,+91 98402 23344,true,"primary,middle,secondary,higher_secondary",school_private_k12,school_cbse_k12,tt_school_standard_8p
LOY-ENG-02,"Loyola-ICAM College of Engineering & Technology",college,private,"Engineering & Technology (AICTE / Anna Univ)","Loyola College Campus, Nungambakkam","Sterling Road",Chennai,Tamil Nadu,600034,13.0645,80.2335,"https://maps.google.com/?q=13.0645,80.2335",principal@licet.ac.in,+91 44 2817 8490,,,false,"higher_secondary",college_private_engineering,college_engineering_ug,tt_college_eng_7h
KV-IITM-03,"Kendriya Vidyalaya IIT Madras",school,public,CBSE,"IIT Madras Campus, Sardar Patel Road","Adyar",Chennai,Tamil Nadu,600036,12.9915,80.2337,"https://maps.google.com/?q=12.9915,80.2337",kviitmadras@vidyon.app,+91 44 2257 0055,,,true,"primary,middle,secondary,higher_secondary",school_public_1_12,school_cbse_k12,tt_school_public_7p
PRES-ART-04,"Presidency College Autonomous",college,public,"Arts & Science","Kamarajar Salai, Chepauk","Opposite Marina Beach",Chennai,Tamil Nadu,600005,13.0601,80.2818,"https://maps.google.com/?q=13.0601,80.2818",principal@presidencychennai.ac.in,+91 44 2854 4894,,,false,"higher_secondary",college_public_arts_science,college_arts_science_ug,tt_college_arts_shift1
```
