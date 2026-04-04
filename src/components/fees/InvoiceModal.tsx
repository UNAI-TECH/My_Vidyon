import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { theme } from '../../theme';
import { 
  CheckCircle2, 
  Download, 
  Share2, 
  X,
  Calendar,
  User,
  Hash,
  FileText
} from 'lucide-react-native';

// Safe requirement of native modules
let Print: any;
let Sharing: any;
try {
  Print = require('expo-print');
  Sharing = require('expo-sharing');
} catch (e) {
  console.error('Failed to load native Print/Sharing modules:', e);
}

interface InvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  institution: {
    name: string;
    logo_url: string | null;
    address: string;
  };
  student: {
    name: string;
    register_number: string;
    class_name: string;
    section?: string;
    roll_no?: string;
  };
  payment: {
    amount: number;
    date: string;
    transaction_id: string;
    components: { title: string, amount: number }[];
  };
  themeColor?: string;
}

export function InvoiceModal({ visible, onClose, institution, student, payment, themeColor = '#1e3a8a' }: InvoiceModalProps) {
  
  const generatePDF = async () => {
    try {
      if (!Print || !Print.printToFileAsync) {
        throw new Error('Native module ExpoPrint not found. Please rebuild your development client.');
      }

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #1e293b; background: white; }
              .header { background: #FAB75A; padding: 40px; color: #1E293B; display: flex; justify-content: space-between; align-items: center; }
              .header-left { display: flex; align-items: center; gap: 20px; }
              .logo { width: 70px; height: 70px; border-radius: 12px; background: white; }
              .inst-name { font-size: 24px; font-weight: bold; margin: 0; }
              .inst-sub { font-size: 13px; opacity: 0.8; margin-top: 4px; }
              .header-right { text-align: right; }
              .invoice-title { font-size: 32px; font-weight: 800; color: #F59E0B; margin: 0; letter-spacing: 2px; }
              .invoice-meta { font-size: 11px; margin-top: 8px; font-weight: bold; opacity: 0.9; }

              .content { padding: 40px; }
              .bill-row { display: flex; justify-content: space-between; margin-bottom: 40px; }
              .section-title { font-size: 11px; font-weight: bold; color: #94A3B8; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; }
              .bill-to h3 { font-size: 20px; font-weight: bold; margin: 0; color: #1E293B; }
              .bill-to p { font-size: 13px; color: #64748B; margin: 6px 0 0; }

              .summary-card { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 16px; padding: 24px; width: 300px; }
              .summary-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
              .summary-item.total { margin-top: 15px; padding-top: 15px; border-top: 2px solid #E2E8F0; }
              .summary-item.total span { font-size: 18px; font-weight: 800; color: #1E293B; }
              .summary-item.outstanding span { color: #EF4444; }
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
              .footer-text { font-size: 10px; color: #94A3B8; max-width: 300px; line-height: 16px; }
              .footer-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; }
              .vidyon-logo { font-weight: bold; font-size: 14px; color: #64748B; opacity: 0.6; }
              .signatory { border-top: 1px solid #E2E8F0; width: 200px; text-align: center; padding-top: 8px; font-size: 10px; color: #94A3B8; font-weight: bold; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-left">
                ${institution.logo_url ? `<img src="${institution.logo_url}" class="logo" />` : '<div class="logo"></div>'}
                <div>
                  <h1 class="inst-name">${institution.name}</h1>
                  <p class="inst-sub">${institution.address}</p>
                </div>
              </div>
              <div class="header-right">
                <h2 class="invoice-title">INVOICE</h2>
                <div class="invoice-meta">NO: ${payment.transaction_id.replace('TXN-', 'INV-')}</div>
                <div class="invoice-meta">DATE: ${new Date(payment.date).toLocaleDateString()}</div>
              </div>
            </div>

            <div class="content">
              <div class="bill-row">
                <div class="bill-to">
                  <div class="section-title">Bill To Student</div>
                  <h3>${student.name}</h3>
                  <p>Roll No: ${student.roll_no || student.register_number || 'N/A'}</p>
                  <p>${student.class_name}${student.section ? ` - Section ${student.section}` : ''}</p>
                </div>
                
                <div class="summary-card">
                  <div class="section-title">Payment Summary</div>
                  <div class="summary-item">
                    <span>Total</span>
                    <span>₹${payment.amount.toLocaleString()}</span>
                  </div>
                  <div class="summary-item paid">
                    <span>Amount Paid</span>
                    <span>₹${payment.amount.toLocaleString()}</span>
                  </div>
                  <div class="summary-item total outstanding">
                    <span>Outstanding</span>
                    <span>₹0</span>
                  </div>
                </div>
              </div>

              <div class="breakdown">
                <div class="section-title">Fee Breakdown</div>
                ${payment.components.map(c => `
                  <div class="breakdown-card">
                    <div class="breakdown-header">${c.title}</div>
                    <div class="breakdown-grid">
                      <div class="grid-item">
                        <div class="grid-label">Amount Due</div>
                        <div class="grid-value">₹${c.amount.toLocaleString()}</div>
                      </div>
                      <div class="grid-item">
                        <div class="grid-label">Paid</div>
                        <div class="grid-value paid">₹${c.amount.toLocaleString()}</div>
                      </div>
                      <div class="grid-item" style="text-align: right">
                        <div class="grid-label">Balance</div>
                        <div class="grid-value">₹0</div>
                      </div>
                    </div>
                  </div>
                `).join('')}
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

      const { uri } = await Print.printToFileAsync({ html });
      if (Sharing && Sharing.shareAsync) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      alert(e.message || 'Could not generate PDF. Please ensure your app is up to date.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {institution.logo_url ? (
              <Image source={{ uri: institution.logo_url }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder} />
            )}
            <View>
              <Text style={styles.instName}>{institution.name}</Text>
              <Text style={styles.instSub}>{institution.address}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>NO: {payment.transaction_id.replace('TXN-', 'INV-')}</Text>
            <Text style={styles.invoiceMeta}>DATE: {new Date(payment.date).toLocaleDateString()}</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.billRow}>
            <View style={styles.billTo}>
              <Text style={styles.sectionTitle}>Bill To Student</Text>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentMeta}>Roll No: {student.roll_no || student.register_number || 'N/A'}</Text>
              <Text style={styles.studentMeta}>{student.class_name}{student.section ? ` - Section ${student.section}` : ''}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Payment Summary</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>₹{payment.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Amount Paid</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>₹{payment.amount.toLocaleString()}</Text>
              </View>
              <View style={[styles.summaryItem, styles.totalRow]}>
                <Text style={styles.totalLabel}>Outstanding</Text>
                <Text style={styles.totalValue}>₹0</Text>
              </View>
            </View>
          </View>

          <View style={styles.breakdown}>
            <Text style={styles.sectionTitle}>Fee Breakdown</Text>
            {payment.components.map((c, i) => (
              <View key={i} style={styles.breakdownCard}>
                <Text style={styles.breakdownName}>{c.title}</Text>
                <View style={styles.breakdownGrid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Amount Due</Text>
                    <Text style={styles.gridValue}>₹{c.amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Paid</Text>
                    <Text style={[styles.gridValue, { color: '#10B981' }]}>₹{c.amount.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.gridItem, { alignItems: 'flex-end' }]}>
                    <Text style={styles.gridLabel}>Balance</Text>
                    <Text style={styles.gridValue}>₹0</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerInfo}>
              This is a computer-generated invoice and doesn't require a physical signature.
            </Text>
            <View style={styles.footerBottom}>
              <Image 
                source={require('../../../assets/logo.png')} 
                style={styles.vidyonLogoImg} 
              />
              <View style={styles.signatoryLine}>
                <Text style={styles.signatoryText}>Authorized Signatory</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBtn} onPress={generatePDF}>
            <Download size={20} color="white" style={{ marginRight: 8 }} {...({} as any)} />
            <Text style={styles.downloadBtnText}>Download Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { 
    backgroundColor: '#FAB75A', 
    paddingTop: 60, 
    paddingBottom: 40, 
    paddingHorizontal: 24, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logo: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'white' },
  logoPlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#FEF3C7' },
  instName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  instSub: { fontSize: 12, color: '#475569', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  invoiceTitle: { fontSize: 24, fontWeight: '900', color: '#F59E0B', letterSpacing: 1 },
  invoiceMeta: { fontSize: 10, color: '#475569', marginTop: 4, fontWeight: '700' },
  
  content: { flex: 1, padding: 24 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 20 },
  billTo: { flex: 1 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  studentName: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  studentMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  
  summaryCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, width: '45%' },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: '#64748B' },
  summaryValue: { fontSize: 12, fontWeight: 'bold', color: '#1E293B' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 12, paddingTop: 12 },
  totalLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  totalValue: { fontSize: 14, fontWeight: 'bold', color: '#EF4444' },

  breakdown: { marginBottom: 40 },
  breakdownCard: { borderColor: '#F1F5F9', borderWidth: 1, borderRadius: 20, padding: 20, marginBottom: 16 },
  breakdownName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  breakdownGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  gridItem: { flex: 1 },
  gridLabel: { fontSize: 9, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase' },
  gridValue: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginTop: 4 },

  footer: { paddingBottom: 100, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 32 },
  footerInfo: { fontSize: 11, color: '#94A3B8', textAlign: 'left', lineHeight: 18, width: '70%' },
  footerBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 },
  vidyonLogoImg: { width: 80, height: 24, opacity: 0.6, resizeMode: 'contain' },
  signatoryLine: { borderTopWidth: 1, borderTopColor: '#E2E8F0', width: 140, alignItems: 'center', paddingTop: 8 },
  signatoryText: { fontSize: 9, color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase' },

  actions: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: 'white', 
    padding: 24, 
    flexDirection: 'row', 
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  closeBtn: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  closeBtnText: { color: '#64748B', fontWeight: 'bold', fontSize: 15 },
  downloadBtn: { flex: 2, backgroundColor: '#FAB75A', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  downloadBtnText: { color: '#1E293B', fontWeight: 'bold', fontSize: 15 }
});
