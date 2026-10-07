import docx
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os

def fill_cell(cell, text, bold=False, italic=False, size_pt=9.5, color_rgb=(30, 41, 59), bg_hex=None, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = "Calibri"
    run.font.size = Pt(size_pt)
    run.font.color.rgb = RGBColor(*color_rgb)
    if bg_hex:
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{bg_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

def add_paragraph_to_cell(cell, text, bold=False, italic=False, size_pt=9.5, color_rgb=(30, 41, 59), space_after=3):
    p = cell.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = "Calibri"
    run.font.size = Pt(size_pt)
    run.font.color.rgb = RGBColor(*color_rgb)
    return p

def process_test_plan(src_path, dest_paths):
    doc = docx.Document(src_path)

    # -------------------------------------------------------------
    # Table 0: Document Control (4 rows, 6 cols)
    # -------------------------------------------------------------
    t0 = doc.tables[0]
    t0_headers = ['Version', 'Date', 'Prepared By', 'Reviewed By', 'Approved By', 'Description of Changes']
    for c_idx, h in enumerate(t0_headers):
        fill_cell(t0.rows[0].cells[c_idx], h, bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t0_data = [
        ['1.0', '2026-03-05', 'Kamalesh S', 'Kamalesh S', 'Kamalesh S', 'Initial Test Plan baseline for Phase 1 Mobile MVP'],
        ['1.1', '2026-03-22', 'Kamalesh S', 'Kamalesh S', 'Kamalesh S', 'Incorporated Realtime sync and Edge Function testing protocols'],
        ['1.2', '2026-10-07', 'Kamalesh S', 'Kamalesh S', 'Kamalesh S', 'Full-Stack Test Plan: 14 modules, 20 roles, 3 platforms, 156 test cases, session lock regression']
    ]
    for r_idx, row_vals in enumerate(t0_data, start=1):
        for c_idx, val in enumerate(row_vals):
            bg = "F8F9FA" if r_idx % 2 == 1 else "FFFFFF"
            align = WD_ALIGN_PARAGRAPH.CENTER if c_idx in [0, 1, 2, 3, 4] else WD_ALIGN_PARAGRAPH.LEFT
            fill_cell(t0.rows[r_idx].cells[c_idx], val, size_pt=9, bg_hex=bg, align=align)

    # -------------------------------------------------------------
    # Table 1: Project Metadata (2 rows, 2 cols)
    # -------------------------------------------------------------
    t1 = doc.tables[1]
    fill_cell(t1.rows[0].cells[0], "Project Name: My Vidyon ERP", bold=True, size_pt=9.5, bg_hex="F1F5F9")
    fill_cell(t1.rows[0].cells[1], "Document Version: 1.0.0 (Master Quality Assurance Plan)", bold=True, size_pt=9.5, bg_hex="F1F5F9")
    fill_cell(t1.rows[1].cells[0], "Prepared By: Kamalesh S (Lead QA Architect & CTO)", size_pt=9.5, bg_hex="FFFFFF")
    fill_cell(t1.rows[1].cells[1], "Date: October 7, 2026", size_pt=9.5, bg_hex="FFFFFF")

    # -------------------------------------------------------------
    # Table 2: 1. SCOPE OF TESTING (1 row, 1 col)
    # -------------------------------------------------------------
    t2 = doc.tables[2]
    c2 = t2.rows[0].cells[0]
    scope_text = (
        "1.1 In-Scope Testing:\n"
        "• Platforms: Android Native (APK/EAS), Web (React Native Web export), Windows Desktop (Electron Win32 x64).\n"
        "• Core Modules (14): Authentication & Session, RBAC & Role Management, Super Admin Platform, Institution Admin, "
        "Academic & Timetable, Student Admissions, Student Promotions, Faculty Operations, Student Learning Portal, "
        "Parent Portal, Finance & Accounting, Canteen Operations, Stakeholder Aggregation, Realtime & Push Notifications.\n"
        "• User Roles (20): Super Admin (admin/superadmin), Institution Admin, Faculty, Student, Parent, Accountant, "
        "Canteen Manager, Institution Stakeholder (Strictly View-Only), Admission Officer, Reports Manager, Ad Manager, "
        "Finance Manager, Media, Analytics, and feature-flagged Transport roles.\n"
        "• Quality Disciplines: Functional positive/negative/edge cases, multi-tenant RLS security, performance profiling, "
        "network failure and offline caching, and regression testing for the session role-switching bug.\n\n"
        "1.2 Out-of-Scope Testing:\n"
        "• Live GPS vehicle tracking hardware (Transport module is feature-flagged as proposed).\n"
        "• AI Tutor chatbot backend integration (prototype UI present; LLM integration deferred).\n"
        "• Native iOS Xcode signing profiles (handled via universal EAS build profile)."
    )
    fill_cell(c2, scope_text, size_pt=9.5, color_rgb=(15, 23, 42), bg_hex="FFFFFF")

    # -------------------------------------------------------------
    # Section 2: Test Strategy (Paragraphs after Table 2)
    # -------------------------------------------------------------
    p_strat = doc.paragraphs[7] if len(doc.paragraphs) > 7 else doc.add_paragraph()
    p_strat.text = (
        "2.1 Multi-Layered Testing Approach:\n"
        "• Static Source Inspection: Verification of navigation guards, schema definitions, and RBAC matrix logic.\n"
        "• Functional & Cross-Role Workflows: End-to-end integration across roles (Faculty marks attendance -> Realtime updates Parent -> Admin views analytics).\n"
        "• RBAC Permission Testing: Evaluating can() evaluator across all 33 ERP modules x 8 actions, with view-only lock for Stakeholders.\n"
        "• Real-Time Synchronization: Monitoring 10 Supabase Realtime WebSocket channels and verifying TanStack Query invalidation.\n"
        "• Security Audits: Testing PostgreSQL RLS multi-tenant boundaries, parameter sanitization against SQLi, and JSX XSS escaping.\n"
        "• Session Stability Regression: Verifying that Alt+Tab and token refresh preserve active role context via currentRoleRef."
    )
    for run in p_strat.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(15, 23, 42)

    # -------------------------------------------------------------
    # Table 3: 3. TEST ENVIRONMENT (4 rows, 3 cols)
    # -------------------------------------------------------------
    t3 = doc.tables[3]
    t3_headers = ['Environment', 'Configuration & Architecture', 'Testing Purpose']
    for c_idx, h in enumerate(t3_headers):
        fill_cell(t3.rows[0].cells[c_idx], h, bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t3_data = [
        ['Development', 'Localhost Expo Metro (port 8081) + Supabase Cloud dev branch', 'Unit testing, rapid component styling, and auth flow iteration'],
        ['Staging / QA', 'EAS Android Build + Electron Win32 client + Supabase Staging', 'System integration, multi-tenant RLS, 156-case regression suite'],
        ['Production', 'EAS Release APK + Electron Win32 exe + Supabase Production', 'UAT sign-off, release certification, live institutional operations']
    ]
    for r_idx, row_vals in enumerate(t3_data, start=1):
        for c_idx, val in enumerate(row_vals):
            bg = "F8F9FA" if r_idx % 2 == 1 else "FFFFFF"
            align = WD_ALIGN_PARAGRAPH.CENTER if c_idx == 0 else WD_ALIGN_PARAGRAPH.LEFT
            fill_cell(t3.rows[r_idx].cells[c_idx], val, size_pt=9, bg_hex=bg, align=align)

    # -------------------------------------------------------------
    # Table 4: 4. ENTRY & EXIT CRITERIA (1 row, 1 col)
    # -------------------------------------------------------------
    t4 = doc.tables[4]
    c4 = t4.rows[0].cells[0]
    criteria_text = (
        "4.1 Entry Criteria for Testing Cycles:\n"
        "• Stable build generated and deployed to staging environment (Android APK / Electron exe / Web bundle).\n"
        "• Supabase database migrations applied successfully with RLS enabled on all active tables.\n"
        "• Test dataset seeded across 3 institutions with full student, faculty, and parent user accounts.\n"
        "• All known defects from previous test cycle documented with verified fix commits.\n\n"
        "4.2 Exit Criteria for Release Certification:\n"
        "• 100% of Critical (P0) defects resolved, retested, and verified in staging.\n"
        "• Zero high-severity (P1) defects unaddressed without explicit business deferral sign-off.\n"
        "• Pass rate >= 95% on critical-path test cases; >= 90% across full 156-case master catalog.\n"
        "• Session stability test (AUTH-TC-004) verified with zero role dropping on Alt+Tab.\n"
        "• Security gate passed: zero cross-tenant RLS data leaks detected."
    )
    fill_cell(c4, criteria_text, size_pt=9.5, color_rgb=(15, 23, 42), bg_hex="FFFFFF")

    # -------------------------------------------------------------
    # Table 5: 5. ROLES & RESPONSIBILITIES (5 rows, 3 cols)
    # -------------------------------------------------------------
    t5 = doc.tables[5]
    t5_headers = ['Name', 'Role', 'Key Responsibilities']
    for c_idx, h in enumerate(t5_headers):
        fill_cell(t5.rows[0].cells[c_idx], h, bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t5_data = [
        ['Kamalesh S', 'Lead QA Architect & Test Lead', 'Overall test strategy, test plan, master test case design, security audit'],
        ['Kamalesh S', 'Test Automation Engineer', 'Regression test scripting, Electron endurance testing, API testing'],
        ['Kamalesh S', 'Performance & Security Tester', 'Load profiling, RLS policy audit, SQL injection/XSS verification'],
        ['Kamalesh S', 'Technical Reviewer & CTO', 'Quality gate sign-off, UAT verification, release certification']
    ]
    for r_idx, row_vals in enumerate(t5_data, start=1):
        for c_idx, val in enumerate(row_vals):
            bg = "F8F9FA" if r_idx % 2 == 1 else "FFFFFF"
            align = WD_ALIGN_PARAGRAPH.CENTER if c_idx in [0, 1] else WD_ALIGN_PARAGRAPH.LEFT
            fill_cell(t5.rows[r_idx].cells[c_idx], val, size_pt=9, bg_hex=bg, align=align)

    # -------------------------------------------------------------
    # Table 6: 6. TEST SCHEDULE (6 rows, 3 cols)
    # -------------------------------------------------------------
    t6 = doc.tables[6]
    t6_headers = ['Test Phase', 'Start Date', 'End Date']
    for c_idx, h in enumerate(t6_headers):
        fill_cell(t6.rows[0].cells[c_idx], h, bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t6_data = [
        ['Phase 1 — Static Reconnaissance & Test Architecture', 'October 3, 2026', 'October 5, 2026'],
        ['Phase 2 — Functional & RBAC Matrix Verification', 'October 5, 2026', 'October 6, 2026'],
        ['Phase 3 — Real-Time WebSocket & Integration Workflows', 'October 6, 2026', 'October 7, 2026'],
        ['Phase 4 — Security, RLS Audit & Cross-Platform Parity', 'October 7, 2026', 'October 8, 2026'],
        ['Phase 5 — UAT Verification & Final Release Certification', 'October 8, 2026', 'October 9, 2026']
    ]
    for r_idx, row_vals in enumerate(t6_data, start=1):
        for c_idx, val in enumerate(row_vals):
            bg = "F8F9FA" if r_idx % 2 == 1 else "FFFFFF"
            align = WD_ALIGN_PARAGRAPH.CENTER if c_idx in [1, 2] else WD_ALIGN_PARAGRAPH.LEFT
            fill_cell(t6.rows[r_idx].cells[c_idx], val, size_pt=9, bg_hex=bg, align=align)

    # -------------------------------------------------------------
    # Table 7: APPROVAL (1 row, 2 cols)
    # -------------------------------------------------------------
    t7 = doc.tables[7]
    fill_cell(t7.rows[0].cells[0], "QA Lead Name: Kamalesh S (Lead QA Architect)\nDate: October 7, 2026\nSignature: [Test Plan Approved]", size_pt=9.5, bg_hex="F8F9FA")
    fill_cell(t7.rows[0].cells[1], "Project Manager Name: Kamalesh S (CTO / Technical Lead)\nDate: October 7, 2026\nSignature: [Baseline Test Sign-Off Complete]", size_pt=9.5, bg_hex="F8F9FA")

    # Save to all destination locations
    for d in dest_paths:
        os.makedirs(os.path.dirname(os.path.abspath(d)), exist_ok=True)
        doc.save(d)
        print(f"Saved Test Plan to: {d}")

if __name__ == '__main__':
    src = os.path.join('docs', 'ai', 'documentations', 'Copy of 10_Test_Plan.docx')
    destinations = [
        os.path.join('docs', 'ai', 'documentations', 'Copy of 10_Test_Plan.docx'),
        os.path.join('docs', 'ai', 'documentations', 'docs_filled', 'Copy of 10_Test_Plan.docx'),
        os.path.join('docs_filled', 'Copy of 10_Test_Plan.docx')
    ]
    process_test_plan(src, destinations)
