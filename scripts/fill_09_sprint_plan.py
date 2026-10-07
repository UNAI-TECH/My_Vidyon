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

def process_sprint_plan(src_path, dest_paths):
    doc = docx.Document(src_path)

    # -------------------------------------------------------------
    # Table 0: Document Control (4 rows, 6 cols)
    # -------------------------------------------------------------
    t0 = doc.tables[0]
    t0_headers = ['Version', 'Date', 'Prepared By', 'Reviewed By', 'Approved By', 'Description of Changes']
    for c_idx, h in enumerate(t0_headers):
        fill_cell(t0.rows[0].cells[c_idx], h, bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t0_data = [
        ['1.0', '2026-03-05', 'Kamalesh S', 'Kamalesh S', 'Kamalesh S', 'Initial Sprint Planning baseline for Phase 1 MVP'],
        ['1.1', '2026-03-18', 'Kamalesh S', 'Kamalesh S', 'Kamalesh S', 'Sprint 2 Plan: Supporting ERP modules, notifications, and analytics'],
        ['1.2', '2026-10-07', 'Kamalesh S', 'Kamalesh S', 'Kamalesh S', 'Hardening Sprint: Full-stack SDK 57 rebuild, Electron desktop, 33-module RBAC, QA suite']
    ]
    for r_idx, row_vals in enumerate(t0_data, start=1):
        for c_idx, val in enumerate(row_vals):
            bg = "F8F9FA" if r_idx % 2 == 1 else "FFFFFF"
            align = WD_ALIGN_PARAGRAPH.CENTER if c_idx in [0, 1, 2, 3, 4] else WD_ALIGN_PARAGRAPH.LEFT
            fill_cell(t0.rows[r_idx].cells[c_idx], val, size_pt=9, bg_hex=bg, align=align)

    # -------------------------------------------------------------
    # Table 1: Sprint Metadata (3 rows, 2 cols)
    # -------------------------------------------------------------
    t1 = doc.tables[1]
    fill_cell(t1.rows[0].cells[0], "Project Name: My Vidyon ERP", bold=True, size_pt=9.5, bg_hex="F1F5F9")
    fill_cell(t1.rows[0].cells[1], "Sprint Number: Sprint 1 (Full Rebuild & Hardening)", bold=True, size_pt=9.5, bg_hex="F1F5F9")
    fill_cell(t1.rows[1].cells[0], "Sprint Duration: 15 Working Days (October 2026)", size_pt=9.5, bg_hex="FFFFFF")
    fill_cell(t1.rows[1].cells[1], "Sprint Goal: Deliver full multi-platform ERP (Android, Web, Electron) with RBAC, realtime sync, and stable auth", size_pt=9.5, bg_hex="FFFFFF")
    fill_cell(t1.rows[2].cells[0], "Scrum Master: Kamalesh S (Lead Architect)", size_pt=9.5, bg_hex="F1F5F9")
    fill_cell(t1.rows[2].cells[1], "Date: October 7, 2026", size_pt=9.5, bg_hex="F1F5F9")

    # -------------------------------------------------------------
    # Table 2: SPRINT BACKLOG (9 rows, 6 cols)
    # -------------------------------------------------------------
    t2 = doc.tables[2]
    t2_headers = ['Story ID', 'User Story', 'Priority', 'Story Points', 'Assignee', 'Status']
    for c_idx, h in enumerate(t2_headers):
        fill_cell(t2.rows[0].cells[c_idx], h, bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t2_data = [
        ['US-AUTH-01', 'As an admin/user, I want persistent authentication and role stability across Alt+Tab and token refresh without reverting to student', 'P0', '8', 'Kamalesh S', 'Done'],
        ['US-RBAC-02', 'As a system, I want a centralized RBAC evaluator can() supporting 33 ERP modules and view-only Institution Stakeholder access', 'P0', '8', 'Kamalesh S', 'Done'],
        ['US-DESK-03', 'As an institution admin, I want a Windows desktop executable (Electron) running the ERP bundle offline/locally with desktop sidebar', 'P1', '5', 'Kamalesh S', 'Done'],
        ['US-RT-04', 'As a parent/faculty, I want real-time attendance, fee, and grade updates using Supabase Realtime channels without manual page reload', 'P1', '5', 'Kamalesh S', 'Done'],
        ['US-FIN-05', 'As an accountant, I want Quick Bills cash fee recording, ledger balance deductions, and instant printable PDF receipt generation', 'P1', '5', 'Kamalesh S', 'Done'],
        ['US-TIME-06', 'As an academic coordinator, I want a timetable grid with automatic conflict collision avoidance for faculty and classrooms', 'P1', '5', 'Kamalesh S', 'Done'],
        ['US-CANT-07', 'As a canteen manager, I want rapid student meal entitlement verification, duplicate entry prevention, and transaction counters', 'P2', '3', 'Kamalesh S', 'Done'],
        ['US-QA-08', 'As a QA team, I want exhaustive test documentation, defect register, requirements traceability matrix, and execution summary', 'P1', '5', 'Kamalesh S', 'Done']
    ]
    for r_idx, row_vals in enumerate(t2_data, start=1):
        for c_idx, val in enumerate(row_vals):
            bg = "F8F9FA" if r_idx % 2 == 1 else "FFFFFF"
            align = WD_ALIGN_PARAGRAPH.CENTER if c_idx in [0, 2, 3, 5] else WD_ALIGN_PARAGRAPH.LEFT
            fill_cell(t2.rows[r_idx].cells[c_idx], val, size_pt=9, bg_hex=bg, align=align)

    # -------------------------------------------------------------
    # Table 3: TEAM CAPACITY (6 rows, 3 cols)
    # -------------------------------------------------------------
    t3 = doc.tables[3]
    t3_headers = ['Team Member / Role', 'Availability (days)', 'Planned Capacity (hours)']
    for c_idx, h in enumerate(t3_headers):
        fill_cell(t3.rows[0].cells[c_idx], h, bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t3_data = [
        ['Kamalesh S (Lead Full-Stack Architect)', '15 days', '80 hours (Architecture, Auth, RBAC, Electron build)'],
        ['Kamalesh S (Mobile & Frontend Engineer)', '15 days', '60 hours (Expo Router layouts, role dashboards, responsive UI)'],
        ['Kamalesh S (Backend & Database Engineer)', '15 days', '25 hours (PostgreSQL schema, RLS policies, Deno Edge Functions)'],
        ['Kamalesh S (QA & Quality Engineer)', '15 days', '35 hours (Static analysis, test plans, defect registers)'],
        ['Kamalesh S (DevOps & Release Engineer)', '15 days', '20 hours (EAS Build configuration, Electron packaging scripts)']
    ]
    for r_idx, row_vals in enumerate(t3_data, start=1):
        for c_idx, val in enumerate(row_vals):
            bg = "F8F9FA" if r_idx % 2 == 1 else "FFFFFF"
            align = WD_ALIGN_PARAGRAPH.CENTER if c_idx == 1 else WD_ALIGN_PARAGRAPH.LEFT
            fill_cell(t3.rows[r_idx].cells[c_idx], val, size_pt=9, bg_hex=bg, align=align)

    # -------------------------------------------------------------
    # Section: SPRINT RISKS / BLOCKERS (Paragraphs after Table 3)
    # -------------------------------------------------------------
    p_risk = doc.paragraphs[9] if len(doc.paragraphs) > 9 else doc.add_paragraph()
    p_risk.text = (
        "Sprint Risks & Mitigations:\n\n"
        "1. Risk: Role Desynchronization Bug on Focus-Restore (P0 Critical)\n"
        "Impact: Super Admin sessions reverting to student context during Alt+Tab.\n"
        "Mitigation: Implement persistent in-memory caching references (currentRoleRef, currentUserIdRef) in useAuth.tsx "
        "and remove unsafe fallback patterns in app/(root)/_layout.tsx.\n\n"
        "2. Risk: Single-Developer Capacity Constraint\n"
        "Impact: Bottlenecks across architecture, implementation, and quality auditing.\n"
        "Mitigation: Prioritize critical-path security and RBAC stories first; automate static testing and doc generation.\n\n"
        "3. Risk: Electron Desktop Local Server Port Collisions\n"
        "Impact: Port 8080/8081 unavailable on target Windows workstations.\n"
        "Mitigation: Dynamic port discovery implemented in scripts/build-exe.mjs falling back to available open ports.\n\n"
        "4. Risk: Realtime Channel Overload on Low-Bandwidth Networks\n"
        "Impact: WebSocket drops delaying attendance and fee sync.\n"
        "Mitigation: TanStack Query stale-time configuration ensuring offline cache fallback."
    )
    for run in p_risk.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(15, 23, 42)

    # -------------------------------------------------------------
    # Table 4: SIGN-OFF (1 row, 2 cols)
    # -------------------------------------------------------------
    t4 = doc.tables[4]
    fill_cell(t4.rows[0].cells[0], "Scrum Master Name: Kamalesh S (Lead Architect)\nDate: October 7, 2026\nSignature: [Sprint Goals Accepted]", size_pt=9.5, bg_hex="F8F9FA")
    fill_cell(t4.rows[0].cells[1], "Product Owner Name: Kamalesh S (Technical Director)\nDate: October 7, 2026\nSignature: [Sprint Sign-Off Complete]", size_pt=9.5, bg_hex="F8F9FA")

    # Save to all destination locations
    for d in dest_paths:
        os.makedirs(os.path.dirname(os.path.abspath(d)), exist_ok=True)
        doc.save(d)
        print(f"Saved Sprint Plan to: {d}")

if __name__ == '__main__':
    src = os.path.join('docs', 'ai', 'documentations', 'Copy of 09_Sprint_Plan.docx')
    destinations = [
        os.path.join('docs', 'ai', 'documentations', 'Copy of 09_Sprint_Plan.docx'),
        os.path.join('docs', 'ai', 'documentations', 'docs_filled', 'Copy of 09_Sprint_Plan.docx'),
        os.path.join('docs_filled', 'Copy of 09_Sprint_Plan.docx')
    ]
    process_sprint_plan(src, destinations)
