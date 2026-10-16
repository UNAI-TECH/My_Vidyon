# scripts/build_submission_workbook_v2.py
"""
Builds the authoritative 11-sheet QA Test Inventory and Evidence Register Excel workbook:
docs/My_Vidyon_ERP_QA_Submission_Package/20_QA_Test_Inventory_and_Evidence_Register.xlsx
"""

import os
import csv
import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

CSV_PATH = r"docs/My_Vidyon_ERP_QA_Submission_Package/09_QA_Test_to_Evidence_Traceability.csv"
OUTPUT_XLSX = r"docs/My_Vidyon_ERP_QA_Submission_Package/20_QA_Test_Inventory_and_Evidence_Register.xlsx"

wb = openpyxl.Workbook()
# remove default sheet
wb.remove(wb.active)

# Styles
FONT_TITLE = Font(name="Calibri", size=16, bold=True, color="1F497D")
FONT_SUBTITLE = Font(name="Calibri", size=11, italic=True, color="595959")
FONT_SECTION = Font(name="Calibri", size=12, bold=True, color="1F497D")
FONT_HEADER = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
FONT_BOLD = Font(name="Calibri", size=10, bold=True)
FONT_REGULAR = Font(name="Calibri", size=10)
FONT_SMALL = Font(name="Calibri", size=9, color="595959")

FILL_NAVY = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
FILL_HEADER = PatternFill(start_color="2F5597", end_color="2F5597", fill_type="solid")
FILL_ACCENT = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
FILL_ZEBRA = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
FILL_PASS = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid") # light green
FILL_COND = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid") # light yellow
FILL_PENDING = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid") # light orange

BORDER_THIN = Side(border_style="thin", color="D9D9D9")
BORDER_BOX = Border(left=BORDER_THIN, right=BORDER_THIN, top=BORDER_THIN, bottom=BORDER_THIN)
BORDER_BOTTOM_DOUBLE = Border(bottom=Side(border_style="double", color="1F497D"))

ALIGN_LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)
ALIGN_CENTER = Alignment(horizontal="center", vertical="center")
ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")

# -------------------------------------------------------------
# 1. Cover & Document Control
# -------------------------------------------------------------
ws_cover = wb.create_sheet(title="Cover & Document Control")
ws_cover.views.sheetView[0].showGridLines = True

ws_cover.cell(row=2, column=2, value="MY VIDYON ERP — QA TEST INVENTORY & EVIDENCE REGISTER").font = FONT_TITLE
ws_cover.cell(row=3, column=2, value="Release Target: Pre-Production Release Candidate v1.0.0-RC1 | Institution: Orchids International School (OIS2026)").font = FONT_SUBTITLE

metadata = [
    ("Document Reference", "QA-XLS-20"),
    ("Document Title", "QA Test Inventory, Traceability & Evidence Register"),
    ("Application Name", "My Vidyon ERP"),
    ("Release Candidate", "v1.0.0-RC1"),
    ("Target Institution", "Orchids International School (OIS2026)"),
    ("Academic Year", "2026-27"),
    ("Evaluation Baseline Date", "12 October 2026"),
    ("Audit & Revision Date", "13 October 2026"),
    ("Documentation Package Revision", "v1.0.1-SUBMISSION-REVIEW"),
    ("Author / Roles", "Senior QA Lead, Test Evidence Auditor, Security Coordinator"),
    ("Technical QA Status", "READY FOR CONTROLLED PRE-PRODUCTION TESTING (Local CI 100% Pass)"),
    ("Staging Status", "PENDING EXECUTION (7 Controlled Activities Outstanding)"),
    ("Production Authorization", "STRICTLY BLOCKED (Awaiting Staging Gates Sign-Off)"),
    ("Workbook Sheet Count", "11 Worksheets"),
    ("Canonical Test Cases", "177 Unique Cases (Reconciled Inventory)"),
    ("Automated CI Assertions", "70 Tests Passing (7 Specialized Suites)"),
]

r = 5
ws_cover.cell(row=r, column=2, value="1. Document Control & Identification").font = FONT_SECTION
r += 1
ws_cover.cell(row=r, column=2, value="Metadata Field").font = FONT_HEADER
ws_cover.cell(row=r, column=2).fill = FILL_HEADER
ws_cover.cell(row=r, column=3, value="Specification").font = FONT_HEADER
ws_cover.cell(row=r, column=3).fill = FILL_HEADER

for label, val in metadata:
    r += 1
    c1 = ws_cover.cell(row=r, column=2, value=label)
    c2 = ws_cover.cell(row=r, column=3, value=val)
    c1.font = FONT_BOLD
    c2.font = FONT_REGULAR
    c1.border = BORDER_BOX
    c2.border = BORDER_BOX
    if "STATUS" in label.upper() or "AUTHORIZATION" in label.upper():
        if "READY" in val:
            c2.fill = FILL_PASS
        elif "PENDING" in val:
            c2.fill = FILL_COND
        elif "BLOCKED" in val:
            c2.fill = FILL_PENDING

r += 2
ws_cover.cell(row=r, column=2, value="2. Worksheet Navigation Manifest").font = FONT_SECTION
r += 1
ws_cover.cell(row=r, column=2, value="Sheet Name").font = FONT_HEADER
ws_cover.cell(row=r, column=2).fill = FILL_HEADER
ws_cover.cell(row=r, column=3, value="Contents & Purpose").font = FONT_HEADER
ws_cover.cell(row=r, column=3).fill = FILL_HEADER

sheets_manifest = [
    ("Cover & Document Control", "Project metadata, version control, classification, and sheet manifest."),
    ("Executive Dashboard", "High-level metrics, category breakdown table, formula-calculated counts."),
    ("Canonical 177 Inventory", "Authoritative 177-case test inventory with verification levels, limitations, and evidence mapping."),
    ("Automated Execution Register", "The 7 automated test suites totaling 70 test assertions with run telemetry and exit codes."),
    ("Evidence Register", "Central catalog of available raw evidence files (with hashes) and pending staging artifacts."),
    ("Defects & Retests", "Defect register (BUG-001..007) with root causes, retests, and current dispositions."),
    ("Security & Remediation", "VULN-001 & VULN-002 tracking code remediation vs staging execution requirements."),
    ("Staging & UAT Activities", "The 7 operational staging verification procedures (STG-ACT-01..07) marked PENDING."),
    ("Release Gates", "Gates G-01 through G-08 status matrix with evidence references and sign-off authorities."),
    ("Risk Register", "Operational risks (RSK-01..05) with probability, impact, mitigation, and owners."),
    ("Data Dictionary & Rules", "Definitions of status terms, counting rules, denominators, and evidence standards."),
]

for sname, sdesc in sheets_manifest:
    r += 1
    c1 = ws_cover.cell(row=r, column=2, value=sname)
    c2 = ws_cover.cell(row=r, column=3, value=sdesc)
    c1.font = FONT_BOLD
    c2.font = FONT_REGULAR
    c1.border = BORDER_BOX
    c2.border = BORDER_BOX

# -------------------------------------------------------------
# 2. Executive Dashboard
# -------------------------------------------------------------
ws_dash = wb.create_sheet(title="Executive Dashboard")
ws_dash.views.sheetView[0].showGridLines = True

ws_dash.cell(row=2, column=2, value="MY VIDYON ERP — QUALITY EXECUTIVE DASHBOARD").font = FONT_TITLE
ws_dash.cell(row=3, column=2, value="Reconciled Pre-Production Quality Scorecard | Target: Orchids International School").font = FONT_SUBTITLE

# Summary metrics cards
ws_dash.cell(row=5, column=2, value="METRIC").font = FONT_HEADER
ws_dash.cell(row=5, column=2).fill = FILL_NAVY
ws_dash.cell(row=5, column=3, value="COUNT").font = FONT_HEADER
ws_dash.cell(row=5, column=3).fill = FILL_NAVY
ws_dash.cell(row=5, column=4, value="STATUS / PROVENANCE").font = FONT_HEADER
ws_dash.cell(row=5, column=4).fill = FILL_NAVY

kpis = [
    ("Canonical Test Cases Total", "='Canonical 177 Inventory'!B179", "177 Unique Cases Catalogued"),
    ("Automated Pre-Prod Tests (CI)", 70, "7 Suites Passing 100% (npm test)"),
    ("TypeScript Compiler Errors", 0, "tsc --noEmit clean (Exit code 0)"),
    ("Production Bundle Build Modules", 3272, "Vite/Expo Web bundled into dist/"),
    ("Open Critical / High Code Blockers", 0, "VULN-001/002 & BUG-001/002/003 fixed in code"),
    ("Open Non-Blocking Minor Issues", 4, "BUG-004..007 deferred to v1.0.1/v1.1.0"),
    ("Staging Operational Activities", 7, "All 7 PENDING EXECUTION (STG-ACT-01..07)"),
    ("Release Gates Cleared (Local CI)", 4, "Gates G-01 through G-04 PASSED"),
    ("Release Gates Conditional / Pending", 4, "G-05 Conditional; G-06..08 Pending Staging/UAT"),
]

for idx, (m, c_val, prov) in enumerate(kpis, start=6):
    ws_dash.cell(row=idx, column=2, value=m).font = FONT_BOLD
    c_cell = ws_dash.cell(row=idx, column=3, value=c_val)
    c_cell.font = FONT_BOLD
    c_cell.alignment = ALIGN_CENTER
    ws_dash.cell(row=idx, column=4, value=prov).font = FONT_REGULAR
    for col in range(2, 5):
        ws_dash.cell(row=idx, column=col).border = BORDER_BOX

# Category Breakdown Table
r = 17
ws_dash.cell(row=r, column=2, value="Test Category Reconciliation Matrix").font = FONT_SECTION
r += 1
headers_cat = ["Category / Module", "Total Cases", "Automated / Synthetic Pass", "Staging Pending / Live Gated", "Limitations / Notes"]
for c_idx, h in enumerate(headers_cat, start=2):
    c = ws_dash.cell(row=r, column=c_idx, value=h)
    c.font = FONT_HEADER
    c.fill = FILL_HEADER
    c.alignment = ALIGN_CENTER

categories_map = [
    ("Super Admin", 19, 19, 0, "SA-008 duplicate validation retested passing"),
    ("Institution Admin", 30, 30, 0, "IA-030 Excel download retested passing"),
    ("Faculty", 24, 24, 0, "FA-012 grading & FA-022 syllabus verified"),
    ("Student", 23, 23, 0, "Student access restrictions verified"),
    ("Parent", 15, 15, 0, "PA-014 absence push queue verified"),
    ("Canteen", 25, 25, 0, "Daily meal tracking verified"),
    ("Finance", 17, 17, 0, "FN-017 PDF print retested; Quick Bills verified"),
    ("SQL/DB", 10, 10, 0, "DB schema & foreign keys static verified"),
    ("Targeted RLS", 6, 6, 0, "Multi-tenant role boundaries verified"),
    ("Cross-Role Integration", 8, 8, 0, "INT-001..008 synthetic workflows pass"),
]

for cat, tot, p_aut, p_stg, notes in categories_map:
    r += 1
    c2 = ws_dash.cell(row=r, column=2, value=cat)
    c3 = ws_dash.cell(row=r, column=3, value=f"=COUNTIF('Canonical 177 Inventory'!C2:C178, \"{cat}\")")
    c4 = ws_dash.cell(row=r, column=4, value=tot)
    c5 = ws_dash.cell(row=r, column=5, value=p_stg)
    c6 = ws_dash.cell(row=r, column=6, value=notes)
    c2.font = FONT_BOLD
    c3.font = FONT_BOLD; c3.alignment = ALIGN_CENTER
    c4.font = FONT_REGULAR; c4.alignment = ALIGN_CENTER
    c5.font = FONT_REGULAR; c5.alignment = ALIGN_CENTER
    c6.font = FONT_REGULAR
    for col in range(2, 7):
        ws_dash.cell(row=r, column=col).border = BORDER_BOX

r += 1
# Total row
c2 = ws_dash.cell(row=r, column=2, value="TOTAL")
c3 = ws_dash.cell(row=r, column=3, value=f"=SUM(C19:C{r-1})")
c4 = ws_dash.cell(row=r, column=4, value=f"=SUM(D19:D{r-1})")
c5 = ws_dash.cell(row=r, column=5, value=f"=SUM(E19:E{r-1})")
c6 = ws_dash.cell(row=r, column=6, value="177 Canonical Cases | Reconciled Baseline")
c2.font = FONT_BOLD
c3.font = FONT_BOLD; c3.alignment = ALIGN_CENTER
c4.font = FONT_BOLD; c4.alignment = ALIGN_CENTER
c5.font = FONT_BOLD; c5.alignment = ALIGN_CENTER
c6.font = FONT_BOLD
for col in range(2, 7):
    cell = ws_dash.cell(row=r, column=col)
    cell.fill = FILL_ACCENT
    cell.border = BORDER_BOX

# -------------------------------------------------------------
# 3. Canonical 177 Inventory
# -------------------------------------------------------------
ws_inv = wb.create_sheet(title="Canonical 177 Inventory")
ws_inv.views.sheetView[0].showGridLines = True

with open(CSV_PATH, "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    csv_rows = list(reader)

header = csv_rows[0]
for col_idx, col_name in enumerate(header, start=1):
    c = ws_inv.cell(row=1, column=col_idx, value=col_name)
    c.font = FONT_HEADER
    c.fill = FILL_NAVY
    c.alignment = ALIGN_CENTER

for r_idx, row in enumerate(csv_rows[1:], start=2):
    for c_idx, val in enumerate(row, start=1):
        cell = ws_inv.cell(row=r_idx, column=c_idx, value=val)
        cell.font = FONT_REGULAR
        cell.border = BORDER_BOX
        if c_idx == 1:
            cell.font = FONT_BOLD
            cell.alignment = ALIGN_CENTER
        elif c_idx in (8, 9, 14):
            cell.alignment = ALIGN_CENTER

# Add formula summary row at bottom
summary_r = len(csv_rows) + 1
ws_inv.cell(row=summary_r, column=1, value="TOTAL COUNT").font = FONT_BOLD
c_tot = ws_inv.cell(row=summary_r, column=2, value=f"=COUNTA(A2:A{summary_r-1})")
c_tot.font = FONT_BOLD
c_tot.alignment = ALIGN_CENTER

ws_inv.auto_filter.ref = f"A1:{get_column_letter(len(header))}{len(csv_rows)}"

# -------------------------------------------------------------
# 4. Automated Execution Register
# -------------------------------------------------------------
ws_aut = wb.create_sheet(title="Automated Execution Register")
ws_aut.views.sheetView[0].showGridLines = True

ws_aut.cell(row=2, column=2, value="AUTOMATED TEST SUITES EXECUTION REGISTER").font = FONT_TITLE
ws_aut.cell(row=3, column=2, value="Execution Telemetry from Master Pre-Production Runner (npm test)").font = FONT_SUBTITLE

aut_headers = ["Suite ID", "Suite Name", "Script Path", "Assertions Count", "Execution Command", "Exit Code", "Runtime Result", "Primary Evidence Reference"]
r = 5
for c_idx, h in enumerate(aut_headers, start=2):
    c = ws_aut.cell(row=r, column=c_idx, value=h)
    c.font = FONT_HEADER
    c.fill = FILL_HEADER
    c.alignment = ALIGN_CENTER

suites_data = [
    ("AUT-01", "Security Remediation", "scripts/test_security_remediation.mjs", 8, "node scripts/test_security_remediation.mjs", 0, "PASS (8/8)", "EVD-SEC-REMEDIATION-20261013.log"),
    ("AUT-02", "Defect Fixes", "scripts/test_defect_fixes.mjs", 8, "node scripts/test_defect_fixes.mjs", 0, "PASS (8/8)", "EVD-DEF-RETEST-20261013.log"),
    ("AUT-03", "13 Evidence Scenarios", "scripts/test_13_evidence_scenarios.mjs", 13, "node scripts/test_13_evidence_scenarios.mjs", 0, "PASS (13/13)", "EVD-INT-13SCENARIOS-20261013.log"),
    ("AUT-04", "Financial Accuracy", "scripts/test_financial_accuracy.mjs", 7, "node scripts/test_financial_accuracy.mjs", 0, "PASS (7/7)", "EVD-FIN-ACCURACY-20261013.log"),
    ("AUT-05", "RBAC & Stakeholder Boundaries", "scripts/test_rbac.mjs", 13, "node scripts/test_rbac.mjs", 0, "PASS (13/13)", "RUN-20261013-AUDIT-01_test_output.txt"),
    ("AUT-06", "Extended Institution Management", "scripts/test_institution_management.mjs", 9, "node scripts/test_institution_management.mjs", 0, "PASS (9/9)", "RUN-20261013-AUDIT-01_test_output.txt"),
    ("AUT-07", "Shared UI Components", "scripts/test_ui_components.mjs", 12, "node scripts/test_ui_components.mjs", 0, "PASS (12/12)", "RUN-20261013-AUDIT-01_test_output.txt"),
]

for s_id, s_name, s_path, a_cnt, cmd, e_code, res, evd in suites_data:
    r += 1
    ws_aut.cell(row=r, column=2, value=s_id).font = FONT_BOLD
    ws_aut.cell(row=r, column=3, value=s_name).font = FONT_REGULAR
    ws_aut.cell(row=r, column=4, value=s_path).font = FONT_REGULAR
    ws_aut.cell(row=r, column=5, value=a_cnt).font = FONT_REGULAR; ws_aut.cell(row=r, column=5).alignment = ALIGN_CENTER
    ws_aut.cell(row=r, column=6, value=cmd).font = FONT_REGULAR
    ws_aut.cell(row=r, column=7, value=e_code).font = FONT_BOLD; ws_aut.cell(row=r, column=7).alignment = ALIGN_CENTER
    c_res = ws_aut.cell(row=r, column=8, value=res)
    c_res.font = FONT_BOLD; c_res.alignment = ALIGN_CENTER; c_res.fill = FILL_PASS
    ws_aut.cell(row=r, column=9, value=evd).font = FONT_REGULAR
    for col in range(2, 10):
        ws_aut.cell(row=r, column=col).border = BORDER_BOX

r += 1
ws_aut.cell(row=r, column=2, value="TOTAL").font = FONT_BOLD
ws_aut.cell(row=r, column=5, value=f"=SUM(E6:E{r-1})").font = FONT_BOLD
ws_aut.cell(row=r, column=5).alignment = ALIGN_CENTER
ws_aut.cell(row=r, column=8, value="70 / 70 PASS (100%)").font = FONT_BOLD
ws_aut.cell(row=r, column=8).alignment = ALIGN_CENTER
for col in range(2, 10):
    ws_aut.cell(row=r, column=col).fill = FILL_ACCENT
    ws_aut.cell(row=r, column=col).border = BORDER_BOX

# -------------------------------------------------------------
# 5. Evidence Register
# -------------------------------------------------------------
ws_evd = wb.create_sheet(title="Evidence Register")
ws_evd.views.sheetView[0].showGridLines = True

ws_evd.cell(row=2, column=2, value="EVIDENCE ARTIFACTS INVENTORY & REGISTER").font = FONT_TITLE
ws_evd.cell(row=3, column=2, value="Physical File Inventory across evidence/ Directory with SHA-256 Hashes").font = FONT_SUBTITLE

evd_headers = ["Evidence ID", "Artifact Title", "Relative Path", "Format", "Availability Status", "SHA-256 Hash / Identifier", "Supported Claims & Scenarios"]
r = 5
for c_idx, h in enumerate(evd_headers, start=2):
    c = ws_evd.cell(row=r, column=c_idx, value=h)
    c.font = FONT_HEADER
    c.fill = FILL_HEADER
    c.alignment = ALIGN_CENTER

evidence_items = [
    ("EVD-AUT-01", "Master Test Runner Raw Output (Original)", "evidence/automated-tests/RUN-20261012-PREPROD-01_test_output.txt", "Text (Raw)", "AVAILABLE", "bfc0a69a2b9ebd41...", "Historical master test run output (70 tests)"),
    ("EVD-AUT-01N", "Master Test Runner Output (UTF-8 Normalized)", "evidence/automated-tests/RUN-20261012-PREPROD-01_test_output_utf8_normalized.txt", "Text (UTF-8)", "AVAILABLE", "b471536db059770e...", "Normalized viewing copy of master test run"),
    ("EVD-AUT-AUDIT", "Fresh Audit Test Execution Output", "evidence/automated-tests/RUN-20261013-AUDIT-01_test_output.txt", "Text (UTF-8)", "AVAILABLE", "2ea4c6b7fc3171b3...", "Reproducible test run verified 13-Oct-2026"),
    ("EVD-BLD-01", "TypeScript Compiler Execution Log", "evidence/build-and-typecheck/EVD-BLD-TYPECHECK-20261013.log", "Log (Text)", "AVAILABLE", "700ca3fbcaa2989d...", "0 type errors across full repository"),
    ("EVD-BLD-02", "Production Web Bundle Export Log", "evidence/build-and-typecheck/EVD-BLD-BUILD-20261013.log", "Log (Text)", "AVAILABLE", "d7cce4682ce32c0d...", "3,272 modules bundled into dist/"),
    ("EVD-SEC-01", "Security Remediation Suite Log", "evidence/security/EVD-SEC-REMEDIATION-20261013.log", "Log (Text)", "AVAILABLE", "f1eacf469aaff877...", "VULN-001 & VULN-002 code assertions (8/8)"),
    ("EVD-DEF-01", "Defect Fix Regression Suite Log", "evidence/defects-and-retests/EVD-DEF-RETEST-20261013.log", "Log (Text)", "AVAILABLE", "4676246ddfcdf654...", "BUG-001, BUG-002, BUG-003 retests (8/8)"),
    ("EVD-INT-01", "13 Evidence Scenarios Suite Log", "evidence/integration/EVD-INT-13SCENARIOS-20261013.log", "Log (Text)", "AVAILABLE", "2a923a8cab388ee4...", "FA-012/022, PA-014, FN-013/014, INT-001..008"),
    ("EVD-FIN-01", "Financial Accuracy Suite Log", "evidence/automated-tests/EVD-FIN-ACCURACY-20261013.log", "Log (Text)", "AVAILABLE", "9cd24d0156799c92...", "Fee calculation & balance invariants (7/7)"),
    ("EVD-DB-01", "PostgreSQL Admin Password Drop Migration", "evidence/database-and-migrations/20261012000001_drop_admin_password.sql", "SQL", "AVAILABLE", "Verified SQL File", "Removes admin_password column from institutions"),
    ("EVD-WEB-01", "Desktop Login View (1280x800)", "evidence/screenshots/WEBQA-20261013-01-UNAUTH-LOGIN-1280x800-01.png", "PNG Image", "AVAILABLE", "Verified PNG", "Desktop login card & branding"),
    ("EVD-WEB-02", "Desktop Password Reset Modal (1280x800)", "evidence/screenshots/WEBQA-20261013-01-UNAUTH-PWDRESET-1280x800-02.png", "PNG Image", "AVAILABLE", "Verified PNG", "Desktop password reset & school code lookup"),
    ("EVD-WEB-03", "Mobile Login View (390x844)", "evidence/screenshots/WEBQA-20261013-01-UNAUTH-LOGIN-390x844-01.png", "PNG Image", "AVAILABLE", "Verified PNG", "Mobile responsive login view"),
    ("EVD-WEB-04", "Inst Admin Dashboard Desktop (1280x800)", "evidence/screenshots/WEBQA-20261013-01-INSTADMIN-DASHBOARD-1280x800-04.png", "PNG Image", "AVAILABLE", "Verified PNG", "Orchids Admin dashboard stats & quick actions"),
    ("EVD-WEB-05", "Inst Admin Fees Desktop (1280x800)", "evidence/screenshots/WEBQA-20261013-01-INSTADMIN-FEES-1280x800-05.png", "PNG Image", "AVAILABLE", "Verified PNG", "Fees management ledger & quick bills"),
    ("EVD-WEB-06", "Super Admin Dashboard Desktop (1280x800)", "evidence/screenshots/WEBQA-20261013-01-SUPERADMIN-DASHBOARD-1280x800-06.png", "PNG Image", "AVAILABLE", "Verified PNG", "Platform global overview & metrics"),
    ("EVD-WEB-07", "Super Admin Institutions Desktop (1280x800)", "evidence/screenshots/WEBQA-20261013-01-SUPERADMIN-INSTITUTIONS-1280x800-07.png", "PNG Image", "AVAILABLE", "Verified PNG", "Institutions management grid & modal"),
    ("EVD-WEB-08", "Faculty Portal Mobile (390x844)", "evidence/screenshots/WEBQA-20261013-01-FACULTY-DASHBOARD-390x844-02.png", "PNG Image", "AVAILABLE", "Verified PNG", "Faculty timetable & attendance triggers"),
    ("EVD-WEB-09", "Student Dashboard Mobile (390x844)", "evidence/screenshots/WEBQA-20261013-01-STUDENT-DASHBOARD-390x844-03.png", "PNG Image", "AVAILABLE", "Verified PNG", "Student subjects & homework stream"),
    ("EVD-WEB-10", "Parent Portal Mobile (390x844)", "evidence/screenshots/WEBQA-20261013-01-PARENT-DASHBOARD-390x844-04.png", "PNG Image", "AVAILABLE", "Verified PNG", "Parent child attendance & dues view"),
    ("EVD-WEB-11", "Canteen Service Mobile (390x844)", "evidence/screenshots/WEBQA-20261013-01-CANTEEN-DASHBOARD-390x844-05.png", "PNG Image", "AVAILABLE", "Verified PNG", "Canteen meal count tracking"),
    ("EVD-WEB-12", "Canteen Service Tablet (768x1024)", "evidence/screenshots/WEBQA-20261013-01-CANTEEN-DASHBOARD-768x1024-01.png", "PNG Image", "AVAILABLE", "Verified PNG", "Canteen tablet portrait layout"),
    ("EVD-WEB-13", "Finance Login Attempt Mobile (390x844)", "evidence/screenshots/WEBQA-20261013-01-FINANCE-LOGINATTEMPT-390x844-01.png", "PNG Image", "AVAILABLE", "Verified PNG", "Handled login rejection (HTTP 400)"),
    ("STG-EVD-ACT01", "Staging DB Migration Execution Log", "evidence/database-and-migrations/STG-ACT01-MIGRATION-[TS].log", "Log", "PENDING COLLECTION", "Awaiting Staging Push", "STG-ACT-01 migration verification on staging"),
    ("STG-EVD-ACT02", "Staging Secret Rotation Audit Record", "evidence/security/STG-ACT02-KEY-ROTATION-[TS].log", "Log", "PENDING COLLECTION", "Awaiting Staging Window", "STG-ACT-02 key rotation in staging dashboard"),
    ("STG-EVD-ACT03", "Staging Physical Hardware Push Logs", "evidence/mobile-push/STG-ACT03-PUSH-RECEIPT-[TS].log", "Log / PNG", "PENDING COLLECTION", "Awaiting Test Devices", "STG-ACT-03 physical APNs/FCM delivery receipt"),
    ("STG-EVD-ACT04", "Staging Storage Upload Receipt", "evidence/storage/STG-ACT04-STORAGE-UPLOAD-[TS].log", "Log", "PENDING COLLECTION", "Awaiting Bucket Test", "STG-ACT-04 2MB PDF upload & signed URL"),
    ("STG-EVD-ACT05", "Staging Web Export Verification Trace", "evidence/screenshots/STG-ACT05-WEB-EXPORT-[TS].png", "PNG / PDF", "PENDING COLLECTION", "Awaiting Browser Session", "STG-ACT-05 live browser print and Excel download"),
    ("STG-EVD-ACT06", "Staging Duplicate Institution UI Alert", "evidence/screenshots/STG-ACT06-DUPLICATE-UI-[TS].png", "PNG", "PENDING COLLECTION", "Awaiting Staging UI", "STG-ACT-06 live form duplicate error dialog"),
    ("STG-EVD-ACT07", "Staging DAST Security Assessment Report", "evidence/security/STG-ACT07-DAST-REPORT-[TS].pdf", "PDF / JSON", "PENDING COLLECTION", "Awaiting DAST Tooling", "STG-ACT-07 automated vulnerability scan"),
]

for e_id, title, r_path, fmt, stat, h_val, claims in evidence_items:
    r += 1
    ws_evd.cell(row=r, column=2, value=e_id).font = FONT_BOLD
    ws_evd.cell(row=r, column=3, value=title).font = FONT_REGULAR
    ws_evd.cell(row=r, column=4, value=r_path).font = FONT_REGULAR
    ws_evd.cell(row=r, column=5, value=fmt).font = FONT_REGULAR; ws_evd.cell(row=r, column=5).alignment = ALIGN_CENTER
    c_st = ws_evd.cell(row=r, column=6, value=stat)
    c_st.font = FONT_BOLD; c_st.alignment = ALIGN_CENTER
    if stat == "AVAILABLE":
        c_st.fill = FILL_PASS
    else:
        c_st.fill = FILL_PENDING
    ws_evd.cell(row=r, column=7, value=h_val).font = FONT_REGULAR
    ws_evd.cell(row=r, column=8, value=claims).font = FONT_REGULAR
    for col in range(2, 9):
        ws_evd.cell(row=r, column=col).border = BORDER_BOX

# -------------------------------------------------------------
# 6. Defects & Retests
# -------------------------------------------------------------
ws_def = wb.create_sheet(title="Defects & Retests")
ws_def.views.sheetView[0].showGridLines = True

ws_def.cell(row=2, column=2, value="DEFECT REGISTER & RETEST VERIFICATION LEDGER").font = FONT_TITLE
ws_def.cell(row=3, column=2, value="All Historical & Active Defects (BUG-001 through BUG-007)").font = FONT_SUBTITLE

def_headers = ["Defect ID", "Severity", "Target Gate", "Affected Module", "Description & Root Cause", "Remediation Applied in Code", "Automated Retest Evidence", "Current Lifecycle Status", "Staging Action"]
r = 5
for c_idx, h in enumerate(def_headers, start=2):
    c = ws_def.cell(row=r, column=c_idx, value=h)
    c.font = FONT_HEADER
    c.fill = FILL_HEADER
    c.alignment = ALIGN_CENTER

defects_data = [
    ("BUG-001", "Medium", "Gate 3", "Onboarding (SA-008)", "Duplicate institution name and code allowed in UI.", "Added case-insensitive .ilike() name check and institution_id equality check in step 1 save and submit.", "test_defect_fixes.mjs (Suite 1 pass)", "CLOSED / VERIFIED PASS (Code)", "Live UI retest in STG-ACT-06"),
    ("BUG-002", "Medium", "Gate 4", "Finance Reports (FN-017)", "Financial report export button had no download handler on Web.", "Implemented Platform.OS === 'web' browser print dialog (Print.printAsync) & download fallbacks.", "test_defect_fixes.mjs (Suite 2 pass)", "CLOSED / VERIFIED PASS (Code)", "Live print test in STG-ACT-05"),
    ("BUG-003", "Low", "Gate 4", "Admin Reports (IA-030)", "Institution report Excel export failed on Web platform.", "Wired direct SheetJS browser download (XLSX.writeFile) and resilient cloud storage sync.", "test_defect_fixes.mjs (Suite 3 pass)", "CLOSED / VERIFIED PASS (Code)", "Live download in STG-ACT-05"),
    ("BUG-004", "Low", "Post-Release", "AI Tutor (ST-022)", "High latency on 3G connections; lacks loading spinner.", "None (Deferred to maintenance release v1.1.0).", "Manual inspection / Open item", "OPEN (Non-blocking UX)", "Observe user feedback in UAT"),
    ("BUG-005", "Low", "Post-Release", "Canteen (CN-004)", "Missing tooltip when class teacher has not marked attendance.", "None (Deferred to maintenance release v1.1.0).", "Manual inspection / Open item", "OPEN (Non-blocking UX)", "Observe in UAT walkthrough"),
    ("BUG-006", "Low", "Post-Release", "Notifications", "Duplicate push notification banners on simultaneous triggers.", "Database trigger fix_push_duplication.sql applied; client dedupes.", "Monitoring item", "OPEN / UNDER MONITORING", "Validate in STG-ACT-03"),
    ("BUG-007", "Low", "Post-Release", "Assignments (FA-010)", "Long assignment titles overflow compact card viewports.", "None (Deferred to maintenance release v1.0.1).", "Manual inspection / Open item", "OPEN (Non-blocking UI)", "Review mobile layout in UAT"),
]

for d_id, sev, g_ref, mod, desc, rem, ret_ev, stat, stg_act in defects_data:
    r += 1
    ws_def.cell(row=r, column=2, value=d_id).font = FONT_BOLD
    ws_def.cell(row=r, column=3, value=sev).font = FONT_REGULAR; ws_def.cell(row=r, column=3).alignment = ALIGN_CENTER
    ws_def.cell(row=r, column=4, value=g_ref).font = FONT_REGULAR; ws_def.cell(row=r, column=4).alignment = ALIGN_CENTER
    ws_def.cell(row=r, column=5, value=mod).font = FONT_REGULAR
    ws_def.cell(row=r, column=6, value=desc).font = FONT_REGULAR
    ws_def.cell(row=r, column=7, value=rem).font = FONT_REGULAR
    ws_def.cell(row=r, column=8, value=ret_ev).font = FONT_REGULAR
    c_st = ws_def.cell(row=r, column=9, value=stat)
    c_st.font = FONT_BOLD; c_st.alignment = ALIGN_CENTER
    if "CLOSED" in stat:
        c_st.fill = FILL_PASS
    else:
        c_st.fill = FILL_COND
    ws_def.cell(row=r, column=10, value=stg_act).font = FONT_REGULAR
    for col in range(2, 11):
        ws_def.cell(row=r, column=col).border = BORDER_BOX

# -------------------------------------------------------------
# 7. Security & Remediation
# -------------------------------------------------------------
ws_sec = wb.create_sheet(title="Security & Remediation")
ws_sec.views.sheetView[0].showGridLines = True

ws_sec.cell(row=2, column=2, value="SECURITY ASSESSMENT & REMEDIATION LEDGER").font = FONT_TITLE
ws_sec.cell(row=3, column=2, value="Vulnerability Status: Code Remediation Complete | Staging Execution Pending").font = FONT_SUBTITLE

sec_headers = ["Vulnerability ID", "Severity", "Target Gate", "Affected Asset", "Vulnerability Description", "Code Remediation Applied", "Automated Code Evidence", "Outstanding Staging Action", "Lifecycle Disposition"]
r = 5
for c_idx, h in enumerate(sec_headers, start=2):
    c = ws_sec.cell(row=r, column=c_idx, value=h)
    c.font = FONT_HEADER
    c.fill = FILL_HEADER
    c.alignment = ALIGN_CENTER

sec_data = [
    ("VULN-001 (SEC-001)", "Critical", "Gate 1 / Gate 5", "public.institutions.admin_password", "Plaintext password column present; passwordResetService wrote credentials.", "Excised all admin_password references from services, edge functions, and onboarding. Created migration 20261012000001_drop_admin_password.sql.", "test_security_remediation.mjs (Suite 1 pass)", "Execute STG-ACT-01 migration push on staging PostgreSQL DB.", "REMEDIATED IN CODE ✅ (Staging DB execution pending)"),
    ("VULN-002", "High", "Gate 1 / Gate 6", ".env & Git repository", "Development secrets and API keys committed in git repository.", "Removed .env from Git cache (git rm --cached). Added wildcards to .gitignore. Authored sanitized .env.example.", "test_security_remediation.mjs (Suite 4 pass)", "Execute STG-ACT-02 credential rotation in staging Supabase dashboard.", "REPO HYGIENE ENFORCED ✅ (Staging key rotation pending)"),
]

for v_id, sev, g_ref, asset, desc, rem, c_ev, stg_req, disp in sec_data:
    r += 1
    ws_sec.cell(row=r, column=2, value=v_id).font = FONT_BOLD
    ws_sec.cell(row=r, column=3, value=sev).font = FONT_BOLD; ws_sec.cell(row=r, column=3).alignment = ALIGN_CENTER
    ws_sec.cell(row=r, column=4, value=g_ref).font = FONT_REGULAR; ws_sec.cell(row=r, column=4).alignment = ALIGN_CENTER
    ws_sec.cell(row=r, column=5, value=asset).font = FONT_REGULAR
    ws_sec.cell(row=r, column=6, value=desc).font = FONT_REGULAR
    ws_sec.cell(row=r, column=7, value=rem).font = FONT_REGULAR
    ws_sec.cell(row=r, column=8, value=c_ev).font = FONT_REGULAR
    ws_sec.cell(row=r, column=9, value=stg_req).font = FONT_REGULAR
    c_disp = ws_sec.cell(row=r, column=10, value=disp)
    c_disp.font = FONT_BOLD; c_disp.alignment = ALIGN_CENTER; c_disp.fill = FILL_COND
    for col in range(2, 11):
        ws_sec.cell(row=r, column=col).border = BORDER_BOX

# -------------------------------------------------------------
# 8. Staging & UAT Activities
# -------------------------------------------------------------
ws_stg = wb.create_sheet(title="Staging & UAT Activities")
ws_stg.views.sheetView[0].showGridLines = True

ws_stg.cell(row=2, column=2, value="STAGING VERIFICATION & UAT OPERATIONAL PROCEDURES").font = FONT_TITLE
ws_stg.cell(row=3, column=2, value="All 7 Operational Activities are PENDING EXECUTION in Staging Sandbox (staging-ois2026)").font = FONT_SUBTITLE

stg_headers = ["Activity ID", "Activity Title", "Target Gate", "Target Environment", "Primary Operational Procedure", "Stop / Rollback Condition", "Expected Evidence Artifact", "Responsible Role", "Operational Status"]
r = 5
for c_idx, h in enumerate(stg_headers, start=2):
    c = ws_stg.cell(row=r, column=c_idx, value=h)
    c.font = FONT_HEADER
    c.fill = FILL_HEADER
    c.alignment = ALIGN_CENTER

stg_activities = [
    ("STG-ACT-01", "Migration Verification", "Gate 5", "staging-ois2026", "Execute 20261012000001_drop_admin_password.sql via CLI; verify column deletion via SQL query.", "Migration syntax error, connection failure, or tenant data loss.", "STG-ACT-01-01_migration_validation", "Database Lead", "PENDING EXECUTION ⏳"),
    ("STG-ACT-02", "Credential Rotation", "Gate 6", "staging-ois2026", "Generate new Supabase anon & service keys; invalidate old tokens in staging dashboard.", "Auth service downtime > 2 min or invalid secret injection.", "STG-ACT-02-01_key_rotation_validation", "DevOps / Sec Lead", "PENDING EXECUTION ⏳"),
    ("STG-ACT-03", "Mobile Push Hardware", "Gate 6", "staging-ois2026", "Send test absence alerts to physical Android & iOS hardware; capture lock-screen screenshots.", "APNs/FCM delivery failure, unhandled token error, or latency > 60s.", "STG-ACT-03-01 / 02 push logs & PNG", "Mobile QA Lead", "PENDING EXECUTION ⏳"),
    ("STG-ACT-04", "Storage Live Upload", "Gate 6", "staging-ois2026", "Upload 2MB PDF syllabus to Supabase Storage; verify signed URL generation and unauth 403.", "Bucket upload failure, CORS error, or public read access allowed.", "STG-ACT-04-01_storage_upload_log", "QA Automation Lead", "PENDING EXECUTION ⏳"),
    ("STG-ACT-05", "Web Export Verification", "Gate 7", "staging-ois2026", "Trigger financial report print dialog and institution Excel download in Chrome & Edge.", "Empty file download, script exception, or corrupt Excel workbook.", "STG-ACT-05-01 / 02 traces", "QA Lead", "PENDING EXECUTION ⏳"),
    ("STG-ACT-06", "Duplicate Validation", "Gate 7", "staging-ois2026", "Attempt creating duplicate school name and code in onboarding form; verify UI modal alert.", "Form creates duplicate tenant record in database.", "STG-ACT-06-01_duplicate_name_alert", "QA Lead", "PENDING EXECUTION ⏳"),
    ("STG-ACT-07", "DAST / Security Scan", "Gate 8", "staging-ois2026", "Run OWASP ZAP / automated DAST scan against staging web URL; audit security headers.", "Identification of unhandled Critical or High severity vulnerability.", "STG-ACT-07-01_dast_security_report", "Security Auditor", "PENDING EXECUTION ⏳"),
]

for a_id, a_title, g_ref, env, proc, stop_cond, ev_art, resp_role, op_stat in stg_activities:
    r += 1
    ws_stg.cell(row=r, column=2, value=a_id).font = FONT_BOLD
    ws_stg.cell(row=r, column=3, value=a_title).font = FONT_REGULAR
    ws_stg.cell(row=r, column=4, value=g_ref).font = FONT_REGULAR; ws_stg.cell(row=r, column=4).alignment = ALIGN_CENTER
    ws_stg.cell(row=r, column=5, value=env).font = FONT_REGULAR; ws_stg.cell(row=r, column=5).alignment = ALIGN_CENTER
    ws_stg.cell(row=r, column=6, value=proc).font = FONT_REGULAR
    ws_stg.cell(row=r, column=7, value=stop_cond).font = FONT_REGULAR
    ws_stg.cell(row=r, column=8, value=ev_art).font = FONT_REGULAR
    ws_stg.cell(row=r, column=9, value=resp_role).font = FONT_REGULAR
    c_stat = ws_stg.cell(row=r, column=10, value=op_stat)
    c_stat.font = FONT_BOLD; c_stat.alignment = ALIGN_CENTER; c_stat.fill = FILL_PENDING
    for col in range(2, 11):
        ws_stg.cell(row=r, column=col).border = BORDER_BOX

# -------------------------------------------------------------
# 9. Release Gates
# -------------------------------------------------------------
ws_gat = wb.create_sheet(title="Release Gates")
ws_gat.views.sheetView[0].showGridLines = True

ws_gat.cell(row=2, column=2, value="PRE-PRODUCTION & PRODUCTION RELEASE GATES MATRIX").font = FONT_TITLE
ws_gat.cell(row=3, column=2, value="Formal Sign-Off Matrix: Gates G-01 through G-08").font = FONT_SUBTITLE

gat_headers = ["Gate ID", "Gate Name", "Evaluation Scope", "Linked Activity", "Exact Acceptance Criteria", "Required Evidence ID", "Current Disposition", "Sign-Off Authority"]
r = 5
for c_idx, h in enumerate(gat_headers, start=2):
    c = ws_gat.cell(row=r, column=c_idx, value=h)
    c.font = FONT_HEADER
    c.fill = FILL_HEADER
    c.alignment = ALIGN_CENTER

gates_matrix = [
    ("G-01", "Static Analysis & Build", "Local / CI Codebase", "CI Automation", "npm run typecheck exits 0; npm run build bundles 3,272 modules into dist/", "EVD-BLD-TYPECHECK & BUILD logs", "PASS ✅", "QA Automation Lead"),
    ("G-02", "Security Remediation (Code)", "Local Codebase", "Code Remediation", "VULN-001 excised; VULN-002 hygiene enforced; test_security_remediation passes 8/8", "EVD-SEC-REMEDIATION-20261013.log", "PASS ✅", "AppSec Reviewer"),
    ("G-03", "Defect Fixes & Retests", "Local Codebase", "Code Remediation", "BUG-001, BUG-002, BUG-003 retests pass; test_defect_fixes passes 8/8", "EVD-DEF-RETEST-20261013.log", "PASS ✅", "Senior QA Engineer"),
    ("G-04", "Automated Evidence & Finance", "Local Codebase", "Synthetic CI Harness", "13 evidence scenarios pass 13/13; financial invariants pass 7/7", "EVD-INT-13SCENARIOS & FIN logs", "PASS ✅", "Solution Architect"),
    ("G-05", "Database Migration Staging", "Staging PostgreSQL", "STG-ACT-01", "Migration 20261012000001_drop_admin_password executed; admin_password dropped", "STG-ACT-01-01_migration_validation", "CONDITIONAL ⚠️", "Database Administrator"),
    ("G-06", "External Gateways Staging", "Staging Infrastructure", "STG-ACT-02, 03, 04", "Key rotation verified; physical APNs/FCM receipt confirmed; storage upload verified", "STG-ACT-02/03/04 logs", "PENDING STAGING ⏳", "DevOps / Integration Lead"),
    ("G-07", "Staging UAT & UI Verification", "Staging Sandbox", "STG-ACT-05, 06, UAT", "Web print/export verified; duplicate validation alert verified; school UAT signed off", "STG-ACT-05/06 logs & TMPL-EVD-STG-UAT", "PENDING STAGING ⏳", "QA Lead & School Lead"),
    ("G-08", "Executive Cutover Authorization", "Production Platform", "STG-ACT-07 & Stage B", "DAST scan passes with 0 high/crit; Gates 1-7 approved; formal executive sign-off", "STG-ACT-07 log & Cutover Dossier", "PENDING EXECUTIVE ⏳", "Principal & Release Director"),
]

for g_id, g_name, scope, act_ref, crit, ev_ref, disp, auth in gates_matrix:
    r += 1
    ws_gat.cell(row=r, column=2, value=g_id).font = FONT_BOLD
    ws_gat.cell(row=r, column=3, value=g_name).font = FONT_REGULAR
    ws_gat.cell(row=r, column=4, value=scope).font = FONT_REGULAR
    ws_gat.cell(row=r, column=5, value=act_ref).font = FONT_REGULAR; ws_gat.cell(row=r, column=5).alignment = ALIGN_CENTER
    ws_gat.cell(row=r, column=6, value=crit).font = FONT_REGULAR
    ws_gat.cell(row=r, column=7, value=ev_ref).font = FONT_REGULAR
    c_disp = ws_gat.cell(row=r, column=8, value=disp)
    c_disp.font = FONT_BOLD; c_disp.alignment = ALIGN_CENTER
    if "PASS" in disp:
        c_disp.fill = FILL_PASS
    elif "CONDITIONAL" in disp:
        c_disp.fill = FILL_COND
    else:
        c_disp.fill = FILL_PENDING
    ws_gat.cell(row=r, column=9, value=auth).font = FONT_REGULAR
    for col in range(2, 10):
        ws_gat.cell(row=r, column=col).border = BORDER_BOX

# -------------------------------------------------------------
# 10. Risk Register
# -------------------------------------------------------------
ws_rsk = wb.create_sheet(title="Risk Register")
ws_rsk.views.sheetView[0].showGridLines = True

ws_rsk.cell(row=2, column=2, value="OPERATIONAL RISK REGISTER & MITIGATION STRATEGY").font = FONT_TITLE
ws_rsk.cell(row=3, column=2, value="Consolidated Risk Ledger: Pre-Production & Staging Operations").font = FONT_SUBTITLE

rsk_headers = ["Risk ID", "Category", "Risk Description", "Probability", "Impact", "Inherent Severity", "Mitigation Strategy", "Residual Risk", "Risk Owner"]
r = 5
for c_idx, h in enumerate(rsk_headers, start=2):
    c = ws_rsk.cell(row=r, column=c_idx, value=h)
    c.font = FONT_HEADER
    c.fill = FILL_HEADER
    c.alignment = ALIGN_CENTER

risks_data = [
    ("RSK-01", "Database", "Staging migration lock or schema timeout during admin_password column drop.", "Low", "High", "Medium", "Pre-migration database dump snapshot; execute during maintenance window with rollback procedure.", "Low", "Database Lead"),
    ("RSK-02", "Security", "Staging Supabase API keys leaked in logs prior to scheduled key rotation.", "Low", "High", "Medium", "Execute STG-ACT-02 key rotation immediately upon provisioning staging environment.", "Very Low", "Security Lead"),
    ("RSK-03", "Third-Party", "DLT template registration delay with TRAI impacting SMS delivery in India.", "Medium", "Medium", "Medium", "Maintain in-app notifications and email alerts as primary real-time fallbacks.", "Medium", "Operations Lead"),
    ("RSK-04", "Performance", "Heavy concurrent report generation causing client-side memory strain during term end.", "Medium", "Medium", "Medium", "Chunked streaming via SheetJS and browser print engine eliminates server compute load.", "Low", "Solution Architect"),
    ("RSK-05", "Integration", "Payment gateway webhook dropped during network partition leaving fee invoice pending.", "Low", "Medium", "Low", "Idempotent payment webhook handler + scheduled 15-minute reconciliation cron job.", "Very Low", "Backend Lead"),
]

for r_id, cat, desc, prob, imp, inh, mit, res, owner in risks_data:
    r += 1
    ws_rsk.cell(row=r, column=2, value=r_id).font = FONT_BOLD
    ws_rsk.cell(row=r, column=3, value=cat).font = FONT_REGULAR
    ws_rsk.cell(row=r, column=4, value=desc).font = FONT_REGULAR
    ws_rsk.cell(row=r, column=5, value=prob).font = FONT_REGULAR; ws_rsk.cell(row=r, column=5).alignment = ALIGN_CENTER
    ws_rsk.cell(row=r, column=6, value=imp).font = FONT_REGULAR; ws_rsk.cell(row=r, column=6).alignment = ALIGN_CENTER
    ws_rsk.cell(row=r, column=7, value=inh).font = FONT_BOLD; ws_rsk.cell(row=r, column=7).alignment = ALIGN_CENTER
    ws_rsk.cell(row=r, column=8, value=mit).font = FONT_REGULAR
    ws_rsk.cell(row=r, column=9, value=res).font = FONT_REGULAR; ws_rsk.cell(row=r, column=9).alignment = ALIGN_CENTER
    ws_rsk.cell(row=r, column=10, value=owner).font = FONT_REGULAR
    for col in range(2, 11):
        ws_rsk.cell(row=r, column=col).border = BORDER_BOX

# -------------------------------------------------------------
# 11. Data Dictionary & Rules
# -------------------------------------------------------------
ws_dic = wb.create_sheet(title="Data Dictionary & Rules")
ws_dic.views.sheetView[0].showGridLines = True

ws_dic.cell(row=2, column=2, value="DATA DICTIONARY & COUNTING RULES").font = FONT_TITLE
ws_dic.cell(row=3, column=2, value="Authoritative Terminology, Counting Rules & Evidence Standards").font = FONT_SUBTITLE

r = 5
ws_dic.cell(row=r, column=2, value="1. Technical Distinctions & Counting Rules").font = FONT_SECTION
r += 1
ws_dic.cell(row=r, column=2, value="Concept").font = FONT_HEADER; ws_dic.cell(row=r, column=2).fill = FILL_HEADER
ws_dic.cell(row=r, column=3, value="Rigorous Definition").font = FONT_HEADER; ws_dic.cell(row=r, column=3).fill = FILL_HEADER
ws_dic.cell(row=r, column=4, value="Current Metric in Package").font = FONT_HEADER; ws_dic.cell(row=r, column=4).fill = FILL_HEADER

rules_data = [
    ("Canonical Test Case", "A discrete, uniquely identified end-to-end user scenario specified in the canonical test inventory. Each case represents a business feature or stakeholder workflow.", "177 Unique Test Cases Total"),
    ("Automated Test Assertion", "A programmatic assertion statement executed inside an automated test runner script that evaluates a specific condition, function, or state invariant.", "70 Automated Assertions (7 Suites)"),
    ("Test Suite", "A discrete, runnable script grouping related test assertions around a single architectural domain (e.g. security, financial accuracy).", "7 Test Suites (scripts/*.mjs)"),
    ("Synthetic Scenario", "A test executed against in-memory deterministic state machines to prove business logic without live network calls.", "13 Synthetic Scenarios (Suite 3)"),
    ("Staging-Verified Test", "A test executed against real deployed staging infrastructure (database, mobile hardware, storage buckets).", "0 Executed (7 Activities Pending)"),
    ("Pass Rate Denominator", "Automated Pass Rate = (Automated Passing Assertions / Total Automated Assertions) * 100%. Canonical Inventory Coverage = (Catalogued Cases / Total Declared Cases) * 100%. Unexecuted staging tests are never counted in the pass rate numerator.", "100% CI Pass Rate (70/70); Staging 0%"),
]

for conc, defn, met in rules_data:
    r += 1
    ws_dic.cell(row=r, column=2, value=conc).font = FONT_BOLD
    ws_dic.cell(row=r, column=3, value=defn).font = FONT_REGULAR
    ws_dic.cell(row=r, column=4, value=met).font = FONT_BOLD
    for col in range(2, 5):
        ws_dic.cell(row=r, column=col).border = BORDER_BOX

r += 2
ws_dic.cell(row=r, column=2, value="2. Lifecycle Status Definitions").font = FONT_SECTION
r += 1
ws_dic.cell(row=r, column=2, value="Status Tag").font = FONT_HEADER; ws_dic.cell(row=r, column=2).fill = FILL_HEADER
ws_dic.cell(row=r, column=3, value="Operational Meaning").font = FONT_HEADER; ws_dic.cell(row=r, column=3).fill = FILL_HEADER
ws_dic.cell(row=r, column=4, value="Permitted Usage").font = FONT_HEADER; ws_dic.cell(row=r, column=4).fill = FILL_HEADER

status_data = [
    ("PASS", "Test assertions evaluated and verified against traceable execution logs.", "Permitted only when automated CI or staging logs exist."),
    ("PASS (RETESTED)", "Defect scenario re-executed and verified passing following code fix.", "Applied to BUG-001, BUG-002, BUG-003 in regression runner."),
    ("PENDING STAGING", "Code-level logic verified, but full end-to-end proof requires live staging environment.", "Applied to live push, storage upload, and remote migration."),
    ("PENDING EVIDENCE", "Test scenario defined in inventory, but execution artifact has not yet been indexed.", "Applied to staging activities prior to execution window."),
    ("BLOCKED", "Execution cannot proceed due to environmental dependency or upstream defect.", "Applied to production cutover while staging gates remain open."),
    ("OPEN (NON-BLOCKING)", "Minor cosmetic or UX defect logged for future maintenance updates.", "Applied to BUG-004 through BUG-007."),
]

for stag, smng, spus in status_data:
    r += 1
    ws_dic.cell(row=r, column=2, value=stag).font = FONT_BOLD
    ws_dic.cell(row=r, column=3, value=smng).font = FONT_REGULAR
    ws_dic.cell(row=r, column=4, value=spus).font = FONT_REGULAR
    for col in range(2, 5):
        ws_dic.cell(row=r, column=col).border = BORDER_BOX

# Adjust column widths across all sheets
for ws in wb.worksheets:
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if "\n" in val_str:
                val_str = max(val_str.split("\n"), key=len)
            max_len = max(max_len, len(val_str))
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 50)

wb.save(OUTPUT_XLSX)
print("Authoritative 11-sheet workbook saved successfully to:", OUTPUT_XLSX)
