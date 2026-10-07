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

def process_arch_doc(src_path, dest_paths):
    doc = docx.Document(src_path)

    # -------------------------------------------------------------
    # Table 0: Document Control (4 rows, 6 cols)
    # -------------------------------------------------------------
    t0 = doc.tables[0]
    t0_headers = ['Version', 'Date', 'Prepared By', 'Reviewed By', 'Approved By', 'Description of Changes']
    for c_idx, h in enumerate(t0_headers):
        fill_cell(t0.rows[0].cells[c_idx], h, bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t0_data = [
        ['1.0', '2026-03-05', 'Kamalesh S', 'Kamalesh S', 'Kamalesh S', 'Initial Architecture Document baseline for mobile school ERP'],
        ['1.1', '2026-03-22', 'Kamalesh S', 'Kamalesh S', 'Kamalesh S', 'Decoupled state architecture using TanStack Query and Supabase Realtime'],
        ['1.2', '2026-10-07', 'Kamalesh S', 'Kamalesh S', 'Kamalesh S', 'Multi-Platform Architecture: Electron desktop packaging, 33-module RBAC, session lock']
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
    fill_cell(t1.rows[0].cells[1], "Document Version: 1.0.0 (Expo SDK 57 Rebuild)", bold=True, size_pt=9.5, bg_hex="F1F5F9")
    fill_cell(t1.rows[1].cells[0], "Prepared By: Kamalesh S (Lead Architect & CTO)", size_pt=9.5, bg_hex="FFFFFF")
    fill_cell(t1.rows[1].cells[1], "Date: October 7, 2026", size_pt=9.5, bg_hex="FFFFFF")

    # -------------------------------------------------------------
    # Table 2: 1. SYSTEM OVERVIEW (1 row, 1 col)
    # -------------------------------------------------------------
    t2 = doc.tables[2]
    c2 = t2.rows[0].cells[0]
    sys_overview = (
        "My Vidyon ERP implements a modular, cloud-native, multi-tier architecture engineered for multi-tenant "
        "K-12 educational institutions. The application separates client presentation, client-side caching, "
        "relational data persistence, and serverless background compute into clearly decoupled subsystems.\n\n"
        "The presentation tier delivers a single universal TypeScript codebase running on Android Native, modern Web browsers, "
        "and Windows Desktop via an Electron Win32 wrapper. Client state is partitioned into local UI state, encrypted auth session "
        "storage (LargeSecureStore), and high-performance server-state caching managed by TanStack React Query v5.\n\n"
        "The persistence and compute tier leverages Supabase PostgreSQL 15+ with Row-Level Security (RLS) guaranteeing tenant boundary "
        "isolation. Real-time updates flow through Supabase Realtime WebSocket connections subscribing to database changes across 10 distinct "
        "functional channels, triggering silent query cache invalidation on connected clients."
    )
    fill_cell(c2, sys_overview, size_pt=9.5, color_rgb=(15, 23, 42), bg_hex="FFFFFF")

    # -------------------------------------------------------------
    # Table 3: 2. ARCHITECTURE DIAGRAM (1 row, 1 col)
    # -------------------------------------------------------------
    t3 = doc.tables[3]
    c3 = t3.rows[0].cells[0]
    diagram_ascii = (
        "+-----------------------------------------------------------------------------------------+\n"
        "|                                PRESENTATION TIER (CLIENT)                               |\n"
        "|   Android Native (Expo EAS)    |    Web Browser (Expo Web)    |   Windows Desktop (Electron) |\n"
        "+-----------------------------------------------------------------------------------------+\n"
        "                                             |                                             \n"
        "                        Expo Router v57 File-Based Navigation                              \n"
        "                                             |                                             \n"
        "+-----------------------------------------------------------------------------------------+\n"
        "|                             CLIENT APPLICATION & STATE TIER                             |\n"
        "|   - AuthContext & useAuth (Role Lock, Session Restore, LargeSecureStore Encryption)     |\n"
        "|   - RBACContext & can() Evaluator (33 Modules x 8 Actions Matrix, Stakeholder Lock)     |\n"
        "|   - TanStack React Query v5 (Optimistic Updates, Cache Store, Query Invalidation)       |\n"
        "|   - useERPRealtime Hook (10 Supabase WebSocket Channels Listening for Postgres Events)  |\n"
        "+-----------------------------------------------------------------------------------------+\n"
        "                      |                                            ^                       \n"
        "     REST HTTPS API Requests                                WebSocket Realtime Events      \n"
        "     (Bearer JWT Authenticated)                             (Postgres CDC Changes)         \n"
        "                      v                                            |                       \n"
        "+-----------------------------------------------------------------------------------------+\n"
        "|                            BACKEND SERVICES (SUPABASE CLOUD)                            |\n"
        "|  +------------------------+  +--------------------------+  +-------------------------+  |\n"
        "|  |   GoTrue Auth Engine   |  |     PostgreSQL 15+ DB    |  | Supabase Realtime (WS)  |  |\n"
        "|  | (JWT, Password, Tokens)|  | (52+ Tables, RLS Policies|  | (CDC broadcast events)  |  |\n"
        "|  +------------------------+  +--------------------------+  +-------------------------+  |\n"
        "|  +------------------------+  +--------------------------+  +-------------------------+  |\n"
        "|  | 4 Deno Edge Functions  |  |   10 Storage Buckets     |  | Firebase Cloud Messaging|  |\n"
        "|  |(create-user, push, sse)|  | (logos, materials, etc.) |  |  (FCM Push Dispatcher)  |  |\n"
        "|  +------------------------+  +--------------------------+  +-------------------------+  |\n"
        "+-----------------------------------------------------------------------------------------+"
    )
    fill_cell(c3, diagram_ascii, size_pt=8.0, color_rgb=(30, 41, 59), bg_hex="F8F9FA", align=WD_ALIGN_PARAGRAPH.LEFT)

    # -------------------------------------------------------------
    # Table 4: 3. COMPONENTS (6 rows, 4 cols)
    # -------------------------------------------------------------
    t4 = doc.tables[4]
    t4_headers = ['Component', 'Description', 'Technology', 'Owner']
    for c_idx, h in enumerate(t4_headers):
        fill_cell(t4.rows[0].cells[c_idx], h, bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t4_data = [
        ['Client Presentation Tier', 'Universal multi-platform UI with role-based routing (7 roles + 5 stakeholders)', 'React Native, Expo SDK 57, Expo Router, Electron', 'Kamalesh S'],
        ['Authentication & Session Hub', 'Session persistence, token chunking in KeyStore, role stability locks', 'LargeSecureStore, Supabase GoTrue, useAuth hook', 'Kamalesh S'],
        ['Central RBAC Evaluator', 'Client-side permission evaluator can(), enforcing 33 ERP modules x 8 actions', 'TypeScript, rbac.ts, RBACContext, PermissionGate', 'Kamalesh S'],
        ['State & Realtime Sync Engine', 'Server-state caching, optimistic mutations, 10-channel WebSocket invalidator', 'TanStack React Query v5, Supabase Realtime, useERPRealtime', 'Kamalesh S'],
        ['Relational Persistence Tier', 'Multi-tenant database schema, Row-Level Security, cascading constraints', 'Supabase PostgreSQL 15+, PL/pgSQL Triggers', 'Kamalesh S']
    ]
    for r_idx, row_vals in enumerate(t4_data, start=1):
        for c_idx, val in enumerate(row_vals):
            bg = "F8F9FA" if r_idx % 2 == 1 else "FFFFFF"
            align = WD_ALIGN_PARAGRAPH.CENTER if c_idx == 3 else WD_ALIGN_PARAGRAPH.LEFT
            fill_cell(t4.rows[r_idx].cells[c_idx], val, size_pt=9, bg_hex=bg, align=align)

    # -------------------------------------------------------------
    # Table 5: 4. DATA FLOW (1 row, 1 col)
    # -------------------------------------------------------------
    t5 = doc.tables[5]
    c5 = t5.rows[0].cells[0]
    data_flow_text = (
        "Core System Data Flows:\n\n"
        "1. Authentication & Session Initialization Flow:\n"
        "User submits credentials -> Supabase GoTrue validates password and issues JWT -> LargeSecureStore writes chunked tokens "
        "to OS KeyStore -> useAuth triggers fetchRole() querying profiles table -> Role and institution metadata cached -> "
        "app/index.tsx routes to designated role dashboard (e.g., /(root)/faculty). On Alt+Tab or token refresh, in-memory reference "
        "currentRoleRef prevents unmounting and locks active role.\n\n"
        "2. Real-Time Attendance & Invalidation Flow:\n"
        "Faculty marks student attendance -> Batch POST to student_attendance -> PostgreSQL executes insert and fires CDC event -> "
        "Supabase Realtime broadcasts to channel 'erp-attendance' -> Connected Parent and Admin clients receive event -> "
        "useERPRealtime triggers queryClient.invalidateQueries(['attendance', 'parent-children']) -> UI updates seamlessly within < 2.0s.\n\n"
        "3. Financial Collection & Receipt Generation Flow:\n"
        "Accountant records payment in Quick Bills -> Transaction inserted into fee_payments -> student_fees balance updated -> "
        "invoiceGenerator.ts compiles receipt JSON -> expo-print / window.print renders formatted PDF invoice with unique receipt ID.\n\n"
        "4. Examination & Draft Grade Publishing Flow:\n"
        "Faculty enters marks with status = 'DRAFT' -> Saved in exam_results -> RLS policy filters draft marks from student view -> "
        "Faculty or Admin clicks 'Publish' -> Status changes to 'published' -> 'erp-grades' event notifies student and parent dashboards."
    )
    fill_cell(c5, data_flow_text, size_pt=9.5, color_rgb=(15, 23, 42), bg_hex="FFFFFF")

    # -------------------------------------------------------------
    # Table 6: 5. TECHNOLOGY STACK (6 rows, 2 cols)
    # -------------------------------------------------------------
    t6 = doc.tables[6]
    fill_cell(t6.rows[0].cells[0], "Architecture Layer", bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)
    fill_cell(t6.rows[0].cells[1], "Selected Technology & Implementation", bold=True, size_pt=9.5, color_rgb=(255, 255, 255), bg_hex="1E293B", align=WD_ALIGN_PARAGRAPH.CENTER)

    t6_data = [
        ['Presentation (Mobile)', 'React Native 0.86.3 / Expo SDK 57, Lucide Icons, React Native Reanimated 4.5.1'],
        ['Presentation (Desktop / Web)', 'React Native Web 0.21.0, Electron Win32 x64 Runner (scripts/build-exe.mjs)'],
        ['State Management & Cache', 'TanStack React Query v5.90.21 (QueryClientProvider, optimistic mutations)'],
        ['Storage & Encrypted Tokens', 'LargeSecureStore (chunked expo-secure-store on mobile, localStorage on desktop/web)'],
        ['Backend & Persistence', 'Supabase Cloud (PostgreSQL 15+, Row-Level Security, GoTrue Auth, 10 Storage Buckets, 4 Edge Functions)']
    ]
    for r_idx, row_vals in enumerate(t6_data, start=1):
        bg = "F8F9FA" if r_idx % 2 == 1 else "FFFFFF"
        fill_cell(t6.rows[r_idx].cells[0], row_vals[0], bold=True, size_pt=9, bg_hex=bg)
        fill_cell(t6.rows[r_idx].cells[1], row_vals[1], size_pt=9, bg_hex=bg)

    # -------------------------------------------------------------
    # Section 6 & 7: Scalability & Performance, Security Architecture
    # -------------------------------------------------------------
    p_scale = doc.paragraphs[15] if len(doc.paragraphs) > 15 else doc.add_paragraph()
    p_scale.text = (
        "6.1 Client Scalability: TanStack React Query maintains an in-memory stale-while-revalidate cache, eliminating redundant "
        "network fetches during tab transitions. Large lists utilize React Native FlatList with windowSize optimization.\n"
        "6.2 Realtime Load Optimization: 10 dedicated channels ensure that only components actively monitoring specific entities "
        "re-render, preventing global app re-rendering.\n"
        "6.3 Backend Scalability: Supabase PostgreSQL operates with connection pooling via PgBouncer. Indexing on (institution_id, class_id) "
        "guarantees O(log N) query performance across multi-thousand student datasets."
    )
    for run in p_scale.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(15, 23, 42)

    p_sec = doc.paragraphs[19] if len(doc.paragraphs) > 19 else doc.add_paragraph()
    p_sec.text = (
        "7.1 Multi-Tenant Isolation: Database Row-Level Security (RLS) ensures that every query strictly resolves against "
        "auth.uid() and profiles.institution_id. Cross-tenant queries are blocked at the PostgreSQL engine level.\n"
        "7.2 Session & Keychain Encryption: Auth tokens are chunked (<2000 chars) and stored in Android KeyStore/iOS Keychain "
        "via LargeSecureStore. Unencrypted token storage in plain SharedPreferences is prohibited.\n"
        "7.3 RBAC Matrix & Stakeholder Lock: Client-side can() evaluator enforces static permissions across 33 modules. The "
        "institution_stakeholder role has hardcoded write-denial across all tables.\n"
        "7.4 Injection Defense: PostgREST parameter binding eliminates SQL injection vectors. React Native escapes JSX text nodes."
    )
    for run in p_sec.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(15, 23, 42)

    # -------------------------------------------------------------
    # Table 7: APPROVAL (1 row, 2 cols)
    # -------------------------------------------------------------
    t7 = doc.tables[7]
    fill_cell(t7.rows[0].cells[0], "Architect Name: Kamalesh S (Lead Architect & CTO)\nDate: October 7, 2026\nSignature: [Signed Electronically]", size_pt=9.5, bg_hex="F8F9FA")
    fill_cell(t7.rows[0].cells[1], "Approved By Name: Kamalesh S (Technical Lead)\nDate: October 7, 2026\nSignature: [Approved for Production Architecture]", size_pt=9.5, bg_hex="F8F9FA")

    # Save to all destination locations
    for d in dest_paths:
        os.makedirs(os.path.dirname(os.path.abspath(d)), exist_ok=True)
        doc.save(d)
        print(f"Saved Architecture Document to: {d}")

if __name__ == '__main__':
    src = os.path.join('docs', 'ai', 'documentations', 'Copy of 07_Architecture_Document.docx')
    destinations = [
        os.path.join('docs', 'ai', 'documentations', 'Copy of 07_Architecture_Document.docx'),
        os.path.join('docs', 'ai', 'documentations', 'docs_filled', 'Copy of 07_Architecture_Document.docx'),
        os.path.join('docs_filled', 'Copy of 07_Architecture_Document.docx')
    ]
    process_arch_doc(src, destinations)
