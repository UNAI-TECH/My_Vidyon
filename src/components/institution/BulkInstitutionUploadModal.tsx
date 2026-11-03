// ============================================================
// File: src/components/institution/BulkInstitutionUploadModal.tsx
// Purpose: Modal to download CSV template and bulk upload school/college
//          records directly into Supabase master_institutions_catalog.
//          Uploaded records immediately reflect in realtime in the 
//          SuperAdmin onboarding catalog dropdown.
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { theme } from '../../theme';
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertTriangle,
  Building2,
  FileText,
  Check,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';

interface BulkInstitutionUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (uploadedCount: number) => void;
}

export interface ParsedInstitutionRow {
  institution_code: string;
  name: string;
  institution_category: 'school' | 'college';
  ownership_type: 'private' | 'public';
  board_or_university: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
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

const CSV_HEADER = `institution_code,name,institution_category,ownership_type,board_or_university,address_line_1,address_line_2,city,state,pincode,latitude,longitude,map_link,email,office_phone,guard_phone,transport_phone,has_kg,academic_stages,default_structure_template_key,default_subject_template_key,default_timetable_template_key`;

const CSV_SAMPLE_ROWS = [
  `DPS-CHE-01,"Delhi Public School, East Coast Road",school,private,CBSE,"124 ECR Road, Akkarai","Sholinganallur",Chennai,Tamil Nadu,600119,12.8985,80.2458,"https://maps.google.com/?q=12.8985,80.2458",admin@dpschennai.vidyon.app,+91 44 2453 8899,+91 98401 12233,+91 98402 23344,true,"primary,middle,secondary,higher_secondary",school_private_k12,school_cbse_k12,tt_school_standard_8p`,
  `LOY-ENG-02,"Loyola-ICAM College of Engineering & Technology",college,private,"Engineering & Technology (AICTE / Anna Univ)","Loyola College Campus, Nungambakkam","Sterling Road",Chennai,Tamil Nadu,600034,13.0645,80.2335,"https://maps.google.com/?q=13.0645,80.2335",principal@licet.ac.in,+91 44 2817 8490,+91 98400 33445,+91 98400 44556,false,"higher_secondary",college_private_engineering,college_engineering_ug,tt_college_standard_8p`,
  `KV-IITM-03,"Kendriya Vidyalaya IIT Madras",school,public,CBSE,"IIT Madras Campus, Sardar Patel Road","Adyar",Chennai,Tamil Nadu,600036,12.9915,80.2337,"https://maps.google.com/?q=12.9915,80.2337",kviitmadras@vidyon.app,+91 44 2257 0055,+91 98400 55667,+91 98400 66778,true,"primary,middle,secondary,higher_secondary",school_public_1_12,school_cbse_k12,tt_school_public_7p`,
  `PRES-ART-04,"Presidency College Autonomous",college,public,"Arts & Science","Kamarajar Salai, Chepauk","Opposite Marina Beach",Chennai,Tamil Nadu,600005,13.0601,80.2818,"https://maps.google.com/?q=13.0601,80.2818",principal@presidencychennai.ac.in,+91 44 2854 4894,+91 98400 77889,+91 98400 88990,false,"higher_secondary",college_arts_science_3yr,college_arts_science_ug,tt_college_standard_8p`
].join('\n');

export const CSV_TEMPLATE_CONTENT = `${CSV_HEADER}\n${CSV_SAMPLE_ROWS}\n`;

/**
 * Robust CSV parser that handles quotes, escaped commas, newlines, and trims whitespace
 */
export function parseCSV(csvText: string): ParsedInstitutionRow[] {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  if (lines.length <= 1) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows: ParsedInstitutionRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2 || !values[0]?.trim()) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });

    const categoryRaw = (rowObj.institution_category || 'school').toLowerCase();
    const category: 'school' | 'college' = categoryRaw === 'college' ? 'college' : 'school';

    const ownershipRaw = (rowObj.ownership_type || 'private').toLowerCase();
    const ownership: 'private' | 'public' = ownershipRaw === 'public' ? 'public' : 'private';

    const code = rowObj.institution_code || `INST-${Date.now()}-${i}`;
    const name = rowObj.name || 'Unnamed Institution';

    const stagesStr = rowObj.academic_stages || '';
    const stages = stagesStr
      ? stagesStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : category === 'college'
      ? ['higher_secondary']
      : ['primary', 'middle', 'secondary'];

    rows.push({
      institution_code: code.trim(),
      name: name.trim(),
      institution_category: category,
      ownership_type: ownership,
      board_or_university: rowObj.board_or_university || (category === 'college' ? 'Engineering & Technology (AICTE / Anna Univ)' : 'CBSE'),
      address_line_1: rowObj.address_line_1 || '',
      address_line_2: rowObj.address_line_2 || '',
      city: rowObj.city || 'Chennai',
      state: rowObj.state || 'Tamil Nadu',
      pincode: rowObj.pincode || '',
      latitude: rowObj.latitude ? parseFloat(rowObj.latitude) : null,
      longitude: rowObj.longitude ? parseFloat(rowObj.longitude) : null,
      map_link: rowObj.map_link || '',
      email: rowObj.email || `admin@${code.toLowerCase().replace(/[^a-z0-9]/g, '')}.vidyon.app`,
      office_phone: rowObj.office_phone || '',
      guard_phone: rowObj.guard_phone || '',
      transport_phone: rowObj.transport_phone || '',
      has_kg: rowObj.has_kg ? rowObj.has_kg.toLowerCase() === 'true' : category === 'school',
      academic_stages: stages,
      default_structure_template_key: rowObj.default_structure_template_key || (category === 'college' ? 'college_private_engineering' : 'school_private_k12'),
      default_subject_template_key: rowObj.default_subject_template_key || (category === 'college' ? 'college_engineering_ug' : 'school_cbse_k12'),
      default_timetable_template_key: rowObj.default_timetable_template_key || (category === 'college' ? 'tt_college_standard_8p' : 'tt_school_standard_8p'),
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export const BulkInstitutionUploadModal: React.FC<BulkInstitutionUploadModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedInstitutionRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setUploading(false);
    setErrorMsg(null);
    setSuccessCount(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // 1. Download CSV Template
  const handleDownloadTemplate = async () => {
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([CSV_TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'vidyon_master_institutions_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileUri = `${FileSystem.documentDirectory}vidyon_master_institutions_template.csv`;
        await FileSystem.writeAsStringAsync(fileUri, CSV_TEMPLATE_CONTENT, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Download Institution CSV Template',
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not download template.');
    }
  };

  // 2. Pick CSV File
  const handlePickFile = async () => {
    try {
      setErrorMsg(null);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets?.[0]) return;

      const asset = res.assets[0];
      let content = '';

      if (Platform.OS === 'web') {
        const fetchRes = await fetch(asset.uri);
        content = await fetchRes.text();
      } else {
        content = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      if (!content || !content.trim()) {
        setErrorMsg('The selected CSV file is empty.');
        return;
      }

      const rows = parseCSV(content);
      if (rows.length === 0) {
        setErrorMsg('No valid institution rows found in the CSV. Please ensure you use our template columns.');
        return;
      }

      setSelectedFile({ name: asset.name, content });
      setParsedRows(rows);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reading CSV file.');
    }
  };

  // 3. Upload parsed rows into Supabase master_institutions_catalog
  const handleUploadData = async () => {
    if (parsedRows.length === 0) return;
    try {
      setUploading(true);
      setErrorMsg(null);

      // Prepare upsert payload
      const payload = parsedRows.map(r => ({
        institution_code: r.institution_code,
        name: r.name,
        institution_category: r.institution_category,
        ownership_type: r.ownership_type,
        board_or_university: r.board_or_university,
        address_line_1: r.address_line_1,
        address_line_2: r.address_line_2,
        city: r.city,
        state: r.state,
        pincode: r.pincode,
        latitude: r.latitude,
        longitude: r.longitude,
        map_link: r.map_link,
        email: r.email,
        office_phone: r.office_phone,
        guard_phone: r.guard_phone,
        transport_phone: r.transport_phone,
        has_kg: r.has_kg,
        academic_stages: r.academic_stages,
        default_structure_template_key: r.default_structure_template_key,
        default_subject_template_key: r.default_subject_template_key,
        default_timetable_template_key: r.default_timetable_template_key,
      }));

      const { data, error } = await (supabase
        .from('master_institutions_catalog') as any)
        .upsert(payload, { onConflict: 'institution_code' })
        .select('id, name');

      if (error) {
        throw new Error(error.message);
      }

      const count = data?.length || payload.length;
      setSuccessCount(count);

      setTimeout(() => {
        onSuccess(count);
        handleClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload institutions to master catalog.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconCircle}>
                <FileSpreadsheet size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Bulk Upload Institutions</Text>
                <Text style={styles.modalSubtitle}>
                  Import real-time Schools & Colleges into Master Catalog via CSV
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Step 1: Download Template */}
            <View style={styles.actionCard}>
              <View style={styles.actionCardHeader}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionCardTitle}>Download Standard CSV Template</Text>
                  <Text style={styles.actionCardSubtitle}>
                    Pre-populated with School (CBSE/Matric) and College (Engineering/Arts) schemas, bell schedules, and address coordinates.
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadTemplate}>
                <Download size={16} color={theme.colors.primary} />
                <Text style={styles.downloadBtnText}>Download .CSV Template</Text>
              </TouchableOpacity>
            </View>

            {/* Step 2: Upload CSV File */}
            <View style={[styles.actionCard, { marginTop: 14 }]}>
              <View style={styles.actionCardHeader}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionCardTitle}>Select Populated CSV File</Text>
                  <Text style={styles.actionCardSubtitle}>
                    Upload your institution list. Records will instantly become selectable in the onboarding wizard dropdown.
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.dropzone} onPress={handlePickFile}>
                <Upload size={24} color="#6366F1" />
                <Text style={styles.dropzoneTitle}>
                  {selectedFile ? selectedFile.name : 'Click to Browse & Select CSV File'}
                </Text>
                <Text style={styles.dropzoneSub}>
                  {selectedFile
                    ? `Ready to import ${parsedRows.length} institution${parsedRows.length > 1 ? 's' : ''}`
                    : 'Supports UTF-8 CSV with schools and colleges'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {errorMsg && (
              <View style={styles.errorBanner}>
                <AlertTriangle size={18} color="#DC2626" />
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            )}

            {/* Success Banner */}
            {successCount !== null && (
              <View style={styles.successBanner}>
                <CheckCircle size={18} color="#16A34A" />
                <Text style={styles.successBannerText}>
                  Successfully imported {successCount} institutions to the Master Catalog! Available immediately in onboarding dropdowns.
                </Text>
              </View>
            )}

            {/* Preview of Parsed Rows */}
            {parsedRows.length > 0 && (
              <View style={styles.previewSection}>
                <View style={styles.previewHeaderRow}>
                  <Text style={styles.previewTitle}>
                    Preview Catalog Records ({parsedRows.length})
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.pillSchool}>
                      <Text style={styles.pillSchoolText}>
                        {parsedRows.filter(r => r.institution_category === 'school').length} Schools
                      </Text>
                    </View>
                    <View style={styles.pillCollege}>
                      <Text style={styles.pillCollegeText}>
                        {parsedRows.filter(r => r.institution_category === 'college').length} Colleges
                      </Text>
                    </View>
                  </View>
                </View>

                {parsedRows.slice(0, 5).map((row, idx) => (
                  <View key={`${row.institution_code}_${idx}`} style={styles.previewCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} color={row.institution_category === 'college' ? '#7C3AED' : '#2563EB'} />
                      <Text style={styles.previewCardName} numberOfLines={1}>{row.name}</Text>
                    </View>
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaCode}>{row.institution_code}</Text>
                      <Text style={styles.previewMetaDot}>•</Text>
                      <Text style={styles.previewMetaType}>
                        {row.ownership_type.toUpperCase()} {row.institution_category.toUpperCase()}
                      </Text>
                      <Text style={styles.previewMetaDot}>•</Text>
                      <Text style={styles.previewMetaLoc}>{row.city}, {row.state}</Text>
                    </View>
                  </View>
                ))}

                {parsedRows.length > 5 && (
                  <Text style={styles.moreRowsText}>
                    + {parsedRows.length - 5} additional institutions in file
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={uploading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (parsedRows.length === 0 || uploading || successCount !== null) && styles.submitBtnDisabled,
              ]}
              onPress={handleUploadData}
              disabled={parsedRows.length === 0 || uploading || successCount !== null}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : successCount !== null ? (
                <>
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Imported</Text>
                </>
              ) : (
                <>
                  <Upload size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    Upload {parsedRows.length > 0 ? `(${parsedRows.length})` : ''} to Catalog
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalBody: {
    padding: 22,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 10,
    borderRadius: 12,
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C7D2FE',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338CA',
    marginTop: 8,
    textAlign: 'center',
  },
  dropzoneSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  successBannerText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
    flex: 1,
  },
  previewSection: {
    marginTop: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillSchool: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillSchoolText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  pillCollege: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillCollegeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
    marginBottom: 8,
  },
  previewCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  previewMetaCode: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  previewMetaDot: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  previewMetaType: {
    fontSize: 11,
    color: '#64748B',
  },
  previewMetaLoc: {
    fontSize: 11,
    color: '#64748B',
  },
  moreRowsText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
