import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { resolveImageToBase64 } from './fileUpload';

export interface TimetableClassPageData {
  className: string;
  sections: string[];
  examType: string;
  entries: {
    exam_date: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject: string;
    syllabus_notes?: string;
  }[];
}

export interface TimetablePdfOptions {
  institutionName: string;
  institutionLogo?: string | null;
  examDisplayName: string;
  academicYear: string;
  classes: TimetableClassPageData[];
  signatories: string[];
  instructions?: string;
}

export async function generateAndDownloadTimetablePdf(options: TimetablePdfOptions) {
  const {
    institutionName,
    institutionLogo,
    examDisplayName,
    academicYear,
    classes,
    signatories = ['Class Teacher', 'Exam Controller', 'Principal'],
    instructions = 'Students must be seated 15 minutes before the exam commences. Bring all required stationery and admit card. Electronic devices are strictly prohibited.'
  } = options;

  let resolvedLogo: string | null = null;
  try {
    if (institutionLogo) {
      resolvedLogo = await resolveImageToBase64(institutionLogo);
    }
  } catch (err) {
    console.warn('[PDF] Failed to resolve logo:', err);
  }

  // Generate pages HTML: each class has its own separate page
  const pagesHtml = classes.map((cls, pageIdx) => {
    const isLastPage = pageIdx === classes.length - 1;
    const sortedEntries = [...cls.entries].sort((a, b) => (a.exam_date || '').localeCompare(b.exam_date || ''));

    const rowsHtml = sortedEntries.length > 0
      ? sortedEntries.map((e, idx) => {
          let notesText = '';
          const attachedFiles: string[] = [];

          if (e.syllabus_notes) {
            try {
              if (typeof e.syllabus_notes === 'string' && (e.syllabus_notes.trim().startsWith('{') || e.syllabus_notes.trim().startsWith('['))) {
                const parsed = JSON.parse(e.syllabus_notes);
                if (parsed && typeof parsed === 'object') {
                  notesText = parsed.text || '';
                  if (Array.isArray(parsed.materials)) {
                    parsed.materials.forEach((m: any) => {
                      let name = '';
                      if (typeof m === 'string') {
                        name = m;
                      } else if (m && typeof m === 'object') {
                        name = m.file_name || m.name || m.title || m.original_name || (m.url ? m.url.split('/').pop()?.split('?')[0] : '');
                      }
                      if (name && name.trim() && !attachedFiles.includes(name.trim())) {
                        attachedFiles.push(name.trim());
                      }
                    });
                  }
                }
              } else {
                notesText = String(e.syllabus_notes);
              }
            } catch {
              notesText = String(e.syllabus_notes);
            }
          }

          // Also check if attached_materials array is on the entry object directly
          if (Array.isArray((e as any).attached_materials)) {
            (e as any).attached_materials.forEach((m: any) => {
              let name = '';
              if (typeof m === 'string') {
                name = m;
              } else if (m && typeof m === 'object') {
                name = m.file_name || m.name || m.title || m.original_name || (m.url ? m.url.split('/').pop()?.split('?')[0] : '');
              }
              if (name && name.trim() && !attachedFiles.includes(name.trim())) {
                attachedFiles.push(name.trim());
              }
            });
          }

          let syllabusCellHtml = '';
          if (notesText && notesText.trim()) {
            syllabusCellHtml += `<div style="font-weight: 500; color: #1E293B; margin-bottom: ${attachedFiles.length > 0 ? '4px' : '0'};">${notesText.trim()}</div>`;
          }
          if (attachedFiles.length > 0) {
            syllabusCellHtml += `
              <div style="display: flex; flex-direction: column; gap: 3px;">
                ${attachedFiles.map(file => `
                  <div style="display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: #B45309; font-size: 11px;">
                    <span style="font-size: 12px;">📎</span>
                    <span>${file}</span>
                  </div>
                `).join('')}
              </div>
            `;
          }
          if (!syllabusCellHtml) {
            syllabusCellHtml = '<span style="color: #94A3B8; font-style: italic;">Complete Syllabus</span>';
          }

          return `
            <tr>
              <td class="center-col" style="font-weight: 600; width: 40px;">${idx + 1}</td>
              <td class="center-col" style="white-space: nowrap; font-weight: 600;">${e.exam_date || '-'}</td>
              <td class="center-col" style="white-space: nowrap;">${e.day_of_week || '-'}</td>
              <td class="center-col" style="white-space: nowrap;">${e.start_time || '09:00'} - ${e.end_time || '12:00'}</td>
              <td class="subject-col" style="font-weight: 700; color: #1E293B;">${e.subject}</td>
              <td class="syllabus-col">${syllabusCellHtml}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #94A3B8;">No exam schedule entries configured for this class.</td></tr>`;

    const signatoriesHtml = signatories.map(sig => `
      <div class="signatory-box">
        <div class="signatory-line"></div>
        <div class="signatory-title">${sig}</div>
      </div>
    `).join('');

    return `
      <div class="page-container ${isLastPage ? 'last-page' : ''}">
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            ${resolvedLogo ? `<img class="logo" src="${resolvedLogo}" alt="Logo" />` : ''}
            <div>
              <div class="inst-name">${institutionName || 'INSTITUTION'}</div>
              <div class="inst-sub">Centralized Examination Timetable</div>
            </div>
          </div>
          <div class="header-right">
            <div class="exam-title">${examDisplayName || 'EXAM TIMETABLE'}</div>
            <div class="academic-year">Academic Year: ${academicYear || '2026-27'}</div>
          </div>
        </div>

        <!-- Class & Exam Meta Strip -->
        <div class="meta-strip">
          <div class="meta-item"><span class="meta-label">Class:</span> <span class="meta-value">${cls.className}</span></div>
          <div class="meta-item"><span class="meta-label">Sections:</span> <span class="meta-value">${cls.sections.join(', ') || 'All'}</span></div>
          <div class="meta-item"><span class="meta-label">Exam Type:</span> <span class="meta-value">${cls.examType}</span></div>
          <div class="meta-item"><span class="meta-label">Page:</span> <span class="meta-value">${pageIdx + 1} of ${classes.length}</span></div>
        </div>

        <!-- Timetable Table -->
        <table class="timetable-table">
          <thead>
            <tr>
              <th style="width: 45px;">S.No</th>
              <th style="width: 100px;">Date</th>
              <th style="width: 90px;">Day</th>
              <th style="width: 110px;">Time</th>
              <th style="width: 160px;">Subject</th>
              <th>Portions / Syllabus Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Instructions Box -->
        ${instructions ? `
          <div class="instructions-box">
            <div class="instructions-title">Important Instructions:</div>
            <div class="instructions-text">${instructions}</div>
          </div>
        ` : ''}

        <!-- Signature Placeholders -->
        <div class="signatories-wrapper">
          ${signatoriesHtml}
        </div>

        <!-- Footer -->
        <div class="page-footer">
          <div>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • Vidyon ERP</div>
          <div>Official Examination Document</div>
        </div>
      </div>
    `;
  }).join('');

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${examDisplayName} - Timetable</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0mm !important; /* Suppresses browser default headers and footers (localhost URL, dates) */
          }

          @media print {
            @page {
              margin: 0mm !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
          }

          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #1E293B;
            font-size: 12px;
          }

          .page-container {
            width: 100%;
            min-height: 297mm;
            box-sizing: border-box;
            padding: 12mm 15mm; /* Professional page margins */
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
          }

          .page-container.last-page {
            page-break-after: auto;
            break-after: auto;
          }

          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2.5px solid #F59E0B;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .logo {
            width: 52px;
            height: 52px;
            object-fit: contain;
            border-radius: 8px;
          }

          .inst-name {
            font-size: 18px;
            font-weight: 800;
            color: #0F172A;
            letter-spacing: 0.3px;
            text-transform: uppercase;
          }

          .inst-sub {
            font-size: 11px;
            color: #64748B;
            margin-top: 2px;
            font-weight: 600;
          }

          .header-right {
            text-align: right;
          }

          .exam-title {
            font-size: 15px;
            font-weight: 800;
            color: #D97706;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .academic-year {
            font-size: 11px;
            color: #475569;
            margin-top: 3px;
            font-weight: 600;
          }

          /* Meta Strip */
          .meta-strip {
            display: flex;
            flex-wrap: wrap;
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-radius: 8px;
            padding: 8px 14px;
            margin-bottom: 14px;
            gap: 16px;
            align-items: center;
          }

          .meta-item {
            font-size: 12px;
            color: #78350F;
          }

          .meta-label {
            font-weight: 600;
            color: #92400E;
          }

          .meta-value {
            font-weight: 800;
          }

          /* Table */
          .timetable-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            overflow: hidden;
          }

          .timetable-table th {
            background-color: #F8FAFC;
            color: #334155;
            padding: 9px 10px;
            text-align: left;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            border-bottom: 1.5px solid #CBD5E1;
            border-right: 1px solid #E2E8F0;
          }

          .timetable-table th:last-child {
            border-right: none;
          }

          .timetable-table td {
            padding: 9px 10px;
            border-bottom: 1px solid #E2E8F0;
            border-right: 1px solid #E2E8F0;
            font-size: 11.5px;
            color: #1E293B;
            vertical-align: middle;
          }

          .timetable-table td:last-child {
            border-right: none;
          }

          .timetable-table tr:nth-child(even) td {
            background-color: #FBFCFE;
          }

          .center-col {
            text-align: center;
          }

          .subject-col {
            font-size: 12px;
          }

          .syllabus-col {
            font-size: 11px;
            color: #475569;
            line-height: 1.35;
          }

          /* Instructions */
          .instructions-box {
            background: #F8FAFC;
            border-left: 3px solid #F59E0B;
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 24px;
          }

          .instructions-title {
            font-size: 11px;
            font-weight: 700;
            color: #0F172A;
            margin-bottom: 2px;
          }

          .instructions-text {
            font-size: 10.5px;
            color: #475569;
            line-height: 1.4;
          }

          /* Signatures */
          .signatories-wrapper {
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
            margin-top: auto;
            padding-top: 36px;
            padding-bottom: 16px;
            gap: 20px;
          }

          .signatory-box {
            text-align: center;
            min-width: 140px;
            flex: 1;
            max-width: 220px;
          }

          .signatory-line {
            border-top: 1.5px solid #64748B;
            margin-bottom: 8px;
            width: 100%;
          }

          .signatory-title {
            font-size: 11px;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          /* Footer */
          .page-footer {
            border-top: 1px solid #E2E8F0;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #94A3B8;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            try {
              window.focus();
              window.print();
            } catch (e) {}
          }, 350);
        });
      </script>
    </html>
  `;

  const cleanFileName = `Timetable_${examDisplayName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  if (Platform.OS === 'web') {
    return new Promise<void>((resolve) => {
      try {
        if (typeof document === 'undefined') {
          resolve();
          return;
        }

        // Clean up any stale print frames
        const oldFrame = document.getElementById('vidyon-timetable-print-frame');
        if (oldFrame && oldFrame.parentNode) {
          oldFrame.parentNode.removeChild(oldFrame);
        }

        // Create an isolated hidden iframe so ONLY the timetable HTML is printed, NOT the ERP dashboard!
        const iframe = document.createElement('iframe');
        iframe.id = 'vidyon-timetable-print-frame';
        iframe.setAttribute(
          'style',
          'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden;'
        );
        document.body.appendChild(iframe);

        const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!frameDoc) {
          throw new Error('Unable to access iframe document for printing');
        }

        frameDoc.open();
        frameDoc.write(fullHtml);
        frameDoc.close();

        let printed = false;
        const triggerPrint = () => {
          if (printed) return;
          printed = true;

          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            } else {
              window.print();
            }
          } catch (printErr) {
            console.error('[PDF] iframe print error, fallback to new window:', printErr);
            const printWindow = window.open('', '_blank');
            if (printWindow) {
              printWindow.document.write(fullHtml);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
            }
          } finally {
            setTimeout(() => {
              try {
                if (iframe.parentNode) {
                  iframe.parentNode.removeChild(iframe);
                }
              } catch {}
              resolve();
            }, 3000);
          }
        };

        if (iframe.contentWindow) {
          iframe.contentWindow.onload = () => {
            setTimeout(triggerPrint, 300);
          };
        }
        setTimeout(triggerPrint, 700);
      } catch (err) {
        console.error('[PDF] Web print failed, downloading html fallback:', err);
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${cleanFileName}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        resolve();
      }
    });
  } else {
    const { uri } = await Print.printToFileAsync({ html: fullHtml });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${examDisplayName} Timetable`,
        UTI: 'com.adobe.pdf'
      });
    } else {
      await Print.printAsync({ html: fullHtml });
    }
  }
}
