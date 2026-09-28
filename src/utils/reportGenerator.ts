import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { resolveImageToBase64 } from './fileUpload';

export const generateFinancialReport = async (stats: any, institutionName?: string, logoUrl?: string) => {
    const resolvedLogo = await resolveImageToBase64(logoUrl);

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #1e293b; background: white; }
            .header { background: #FAB75A; padding: 40px; color: #1E293B; display: flex; justify-content: space-between; align-items: center; }
            .header-left { display: flex; align-items: center; gap: 20px; }
            .inst-name { font-size: 24px; font-weight: bold; margin: 0; color: #1E293B; }
            .header-right { text-align: right; }
            .invoice-title { font-size: 24px; font-weight: 800; color: #F59E0B; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
            .invoice-meta { font-size: 11px; margin-top: 8px; font-weight: bold; opacity: 0.9; color: #1E293B; }

            .content { padding: 40px; }
            .section-title { font-size: 11px; font-weight: bold; color: #94A3B8; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 1px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; }
              
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; border-radius: 12px; overflow: hidden; border: 1px solid #F1F5F9; }
            th, td { padding: 16px; border-bottom: 1px solid #F1F5F9; text-align: left; font-size: 13px; color: #1E293B; }
            th { font-weight: bold; color: #64748B; text-transform: uppercase; font-size: 10px; background-color: #F8FAFC; }
            td { background-color: white; }
            .paid { color: #10B981; font-weight: bold; }

            .footer { padding: 40px; border-top: 1px solid #F1F5F9; margin-top: 10px; }
            .footer-text { font-size: 10px; color: #94A3B8; line-height: 16px; }
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
              <h2 class="invoice-title">FINANCIAL REPORT</h2>
              <div class="invoice-meta">DATE: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="content">
            <div class="section-title">Overview Dashboard</div>
            <table>
              <tr><th>Total Revenue (Collected)</th><td class="paid">₹${(stats?.totalRevenue || 0).toLocaleString()}</td></tr>
              <tr><th>Outstanding Dues (Pending)</th><td style="color: #F59E0B; font-weight: bold;">₹${(stats?.outstandingAmount || 0).toLocaleString()}</td></tr>
              <tr><th>Total Transactions</th><td>${stats?.transactionCount || 0}</td></tr>
              <tr><th>Collection Rate</th><td style="font-weight: bold;">${stats?.totalRevenue > 0 ? Math.round((stats.totalRevenue / (stats.totalRevenue + stats.outstandingAmount)) * 100) : 0}%</td></tr>
            </table>

            <div class="section-title">Recent Transactions Ledger</div>
            ${(stats?.recentPayments && stats.recentPayments.length > 0) ? `
            <table>
              <tr><th>Date Transacted</th><th>Student</th><th>Amount (₹)</th><th>Status</th></tr>
              ${stats.recentPayments.map((t: any) => `
                <tr>
                  <td>${new Date(t.payment_date).toLocaleDateString()}</td>
                  <td style="font-weight: bold;">${t.students?.name || 'Unknown'}</td>
                  <td class="paid">₹${t.amount_paid?.toLocaleString()}</td>
                  <td style="font-size: 10px; font-weight: bold; color: #94A3B8; letter-spacing: 0.5px;">${(t.status || 'Verified').toUpperCase()}</td>
                </tr>
              `).join('')}
            </table>
            ` : '<p style="color: #64748b; font-size: 13px;">No recent transactions available.</p>'}
          </div>
          
          <div class="footer">
            <p class="footer-text">
              This is a computer-generated financial summary report and doesn't require a physical signature.
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
        console.error('Error generating report:', error);
        alert('Failed to generate report');
    }
};

import { supabase } from '../lib/supabase';

export const generateDailyCollectionReport = async (institutionId: string, institutionName?: string, logoUrl?: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // Fetch all payments for today connected to the institution
        const { data: todayPayments, error } = await supabase
            .from('fee_payments')
            .select('*, students(name, register_number, class_name)')
            .eq('institution_id', institutionId)
            .gte('payment_date', `${today}T00:00:00.000Z`)
            .lte('payment_date', `${today}T23:59:59.999Z`)
            .order('payment_date', { ascending: false });

        if (error) {
            console.error('Error fetching today payments:', error);
            throw error;
        }

        const validPayments = todayPayments || [];
        const totalCollected = validPayments.reduce((acc: number, curr: any) => acc + (curr.amount_paid || 0), 0);

        const htmlContent = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #1e293b; background: white; }
                .header { background: #FAB75A; padding: 40px; color: #1E293B; display: flex; justify-content: space-between; align-items: center; }
                .header-left { display: flex; align-items: center; gap: 20px; }
                .inst-name { font-size: 24px; font-weight: bold; margin: 0; color: #1E293B; }
                .header-right { text-align: right; }
                .invoice-title { font-size: 24px; font-weight: 800; color: #F59E0B; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
                .invoice-meta { font-size: 11px; margin-top: 8px; font-weight: bold; opacity: 0.9; color: #1E293B; }

                .content { padding: 40px; }
                .section-title { font-size: 11px; font-weight: bold; color: #94A3B8; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 1px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; }
                  
                table { width: 100%; border-collapse: collapse; margin-bottom: 40px; border-radius: 12px; overflow: hidden; border: 1px solid #F1F5F9; }
                th, td { padding: 16px; border-bottom: 1px solid #F1F5F9; text-align: left; font-size: 13px; color: #1E293B; }
                th { font-weight: bold; color: #64748B; text-transform: uppercase; font-size: 10px; background-color: #F8FAFC; }
                td { background-color: white; }
                .total-row { background-color: #ECFDF5; }
                .paid { color: #10B981; font-weight: bold; }

                .footer { padding: 40px; border-top: 1px solid #F1F5F9; margin-top: 10px; }
                .footer-text { font-size: 10px; color: #94A3B8; line-height: 16px; }
                .footer-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; }
                .vidyon-logo { font-weight: bold; font-size: 14px; color: #64748B; opacity: 0.6; }
                .signatory { border-top: 1px solid #E2E8F0; width: 200px; text-align: center; padding-top: 8px; font-size: 10px; color: #94A3B8; font-weight: bold; text-transform: uppercase; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="header-left">
                  ${logoUrl ? `<img src="${logoUrl}" style="height: 60px; width: 60px; object-fit: contain; border-radius: 8px;" />` : ''}
                  <div>
                    <h1 class="inst-name">${institutionName || 'Institution'}</h1>
                  </div>
                </div>
                <div class="header-right">
                  <h2 class="invoice-title">DAILY COLLECTION</h2>
                  <div class="invoice-meta">DATE: ${new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <div class="content">
                <div class="section-title">Collection Overview</div>
                <table>
                  <tr><th>Date</th><td style="font-weight: bold;">${new Date().toLocaleDateString()}</td></tr>
                  <tr><th>Total Collections Today</th><td class="paid" style="font-size: 16px;">₹${totalCollected.toLocaleString()}</td></tr>
                  <tr><th>Total Transactions Today</th><td style="font-weight: bold;">${validPayments.length}</td></tr>
                </table>

                <div class="section-title">Daily Transactions Ledger</div>
                ${validPayments.length > 0 ? `
                <table>
                  <tr><th>Time</th><th>Student Name</th><th>Class Details</th><th>Amount (₹)</th><th>Txn ID</th></tr>
                  ${validPayments.map((t: any) => {
                      const time = new Date(t.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const stu = t.students || {};
                      
                      return `
                      <tr>
                          <td style="font-family: monospace; font-size: 11px;">${time}</td>
                          <td><strong>${stu.name || 'Unknown Student'}</strong><br/>
                              <span style="font-size: 10px; color: #94A3B8;">REG: ${stu.register_number || 'N/A'}</span>
                          </td>
                          <td style="font-weight: 500;">${stu.class_name || 'N/A'}</td>
                          <td class="paid">₹${t.amount_paid?.toLocaleString()}</td>
                          <td style="font-size: 10px; color: #94A3B8; font-family: monospace;">${t.transaction_id || 'N/A'}</td>
                      </tr>
                      `;
                  }).join('')}
                  <tr class="total-row">
                      <td colspan="3" style="text-align: right; font-size: 12px; font-weight: bold; color: #64748B; text-transform: uppercase;">Day's Total Collected</td>
                      <td colspan="2" style="font-size: 16px; color: #10B981; font-weight: bold;">₹${totalCollected.toLocaleString()}</td>
                  </tr>
                </table>
                ` : '<p style="color: #64748b; font-size: 13px;">No collections recorded today.</p>'}
              </div>
              
              <div class="footer">
                <p class="footer-text">
                  This is a computer-generated daily collection report and doesn't require a physical signature.
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

        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        if (!(await Sharing.isAvailableAsync())) {
            alert('Sharing is not available on your device');
            return;
        }
        await Sharing.shareAsync(uri);
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate daily collection report');
    }
};
