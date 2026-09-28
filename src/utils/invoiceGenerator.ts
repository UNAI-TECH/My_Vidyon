import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { resolveImageToBase64 } from './fileUpload';

export const generateInvoice = async (
    studentName: string,
    registerNumber: string,
    amount: number,
    category: string,
    transactionId: string,
    institutionName?: string,
    logoUrl?: string
) => {
    const resolvedLogo = await resolveImageToBase64(logoUrl);

    const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #1e293b; background: white; }
              .header { background: #FAB75A; padding: 40px; color: #1E293B; display: flex; justify-content: space-between; align-items: center; }
              .header-left { display: flex; align-items: center; gap: 20px; }
              .inst-name { font-size: 24px; font-weight: bold; margin: 0; }
              .header-right { text-align: right; }
              .invoice-title { font-size: 32px; font-weight: 800; color: #F59E0B; margin: 0; letter-spacing: 2px; text-transform: uppercase; }
              .invoice-meta { font-size: 11px; margin-top: 8px; font-weight: bold; opacity: 0.9; }
              .content { padding: 40px; }
              .bill-row { display: flex; justify-content: space-between; margin-bottom: 40px; }
              .section-title { font-size: 11px; font-weight: bold; color: #94A3B8; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; }
              .bill-to h3 { font-size: 20px; font-weight: bold; margin: 0; color: #1E293B; }
              .bill-to p { font-size: 13px; color: #64748B; margin: 6px 0 0; }
              .summary-card { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 16px; padding: 24px; width: 300px; }
              .summary-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
              .summary-item.total { margin-top: 15px; padding-top: 15px; border-top: 2px solid #E2E8F0; }
              .summary-item.total span { font-size: 18px; font-weight: 800; color: #1E293B; }
              .summary-item.paid span { color: #10B981; font-weight: bold; }
              .breakdown { margin-top: 40px; }
              .breakdown-card { border: 1px solid #F1F5F9; border-radius: 20px; padding: 24px; margin-bottom: 20px; }
              .breakdown-header { font-size: 16px; font-weight: bold; color: #1E293B; margin-bottom: 16px; }
              .breakdown-grid { display: flex; justify-content: space-between; }
              .grid-item { flex: 1; }
              .grid-label { font-size: 10px; font-weight: bold; color: #94A3B8; text-transform: uppercase; }
              .grid-value { font-size: 14px; font-weight: bold; color: #1E293B; margin-top: 4px; }
              .grid-value.paid { color: #10B981; }
              .footer { padding: 40px; border-top: 1px solid #F1F5F9; margin-top: 40px; }
              .footer-text { font-size: 10px; color: #94A3B8; max-width: 380px; line-height: 16px; }
              .footer-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; }
              .vidyon-logo { font-weight: bold; font-size: 14px; color: #64748B; opacity: 0.6; }
              .signatory { border-top: 1px solid #E2E8F0; width: 200px; text-align: center; padding-top: 8px; font-size: 10px; color: #94A3B8; font-weight: bold; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-left">
                ${resolvedLogo ? `<img src="${resolvedLogo}" onerror="this.style.display='none'" style="height: 60px; width: 60px; object-fit: contain; border-radius: 8px;" />` : ''}
                <div>
                  <h1 class="inst-name">${institutionName || 'Institution'}</h1>
                </div>
              </div>
              <div class="header-right">
                <h2 class="invoice-title">INVOICE</h2>
                <div class="invoice-meta">NO: ${transactionId.replace('QB-', 'INV-').toUpperCase()}</div>
                <div class="invoice-meta">DATE: ${new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <div class="content">
              <div class="bill-row">
                <div class="bill-to">
                  <div class="section-title">Bill To Student</div>
                  <h3>${studentName}</h3>
                  <p>Reg No: ${registerNumber || 'N/A'}</p>
                </div>
                
                <div class="summary-card">
                  <div class="section-title">Payment Summary</div>
                  <div class="summary-item">
                    <span>Total</span>
                    <span>₹${amount.toLocaleString()}</span>
                  </div>
                  <div class="summary-item paid">
                    <span>Amount Paid</span>
                    <span>₹${amount.toLocaleString()}</span>
                  </div>
                  <div class="summary-item total">
                    <span>Outstanding</span>
                    <span style="color: #10B981;">₹0</span>
                  </div>
                </div>
              </div>

              <div class="breakdown">
                <div class="section-title">Fee Breakdown</div>
                <div class="breakdown-card">
                  <div class="breakdown-header">${category}</div>
                  <div class="breakdown-grid">
                    <div class="grid-item">
                      <div class="grid-label">Amount Due</div>
                      <div class="grid-value">₹${amount.toLocaleString()}</div>
                    </div>
                    <div class="grid-item">
                      <div class="grid-label">Paid</div>
                      <div class="grid-value paid">₹${amount.toLocaleString()}</div>
                    </div>
                    <div class="grid-item" style="text-align: right">
                      <div class="grid-label">Balance</div>
                      <div class="grid-value">₹0</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="footer">
              <p class="footer-text">
                This is a computer-generated invoice and doesn't require a physical signature.
              </p>
              <div class="footer-bottom">
                 <div class="vidyon-logo">
                    <svg width="120" height="24" viewBox="0 0 120 24" xmlns="http://www.w3.org/2000/svg">
                      <text x="0" y="18" font-family="Helvetica Neue, Arial, sans-serif" font-size="14" font-weight="bold" fill="#94A3B8">MY VIDYON</text>
                    </svg>
                  </div>
                 <div class="signatory">Authorized Signatory</div>
              </div>
            </div>
          </body>
        </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        if (!(await Sharing.isAvailableAsync())) {
            alert('Sharing is not available on your device');
            return;
        }
        await Sharing.shareAsync(uri);
    } catch (error) {
        console.error('Error generating invoice:', error);
        alert('Failed to generate invoice');
    }
};
