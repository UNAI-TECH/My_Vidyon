import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
const FileSystemLegacy = require('expo-file-system/legacy');
import { Alert, Linking } from 'react-native';
import { Database } from '../types/supabase';

export type ReportType = 'students' | 'faculty' | 'fees' | 'exams';

export interface StudentReportDetail {
  register_number: string;
  name: string;
  class_name: string;
  section: string;
  parent_name: string;
  parent_phone: string;
  is_active: boolean;
}

export interface FacultyReportDetail {
  staff_id: string;
  full_name: string;
  department: string;
  role: string;
  phone: string;
}

export interface FeeReportDetail {
  student_name: string;
  class_name: string;
  section: string;
  amount_due: number;
  amount_paid: number;
  status: string;
}

export type ReportRow = Database['public']['Tables']['reports']['Row'];

export function useInstitutionReports(institutionId: string | null, academicYear: string) {
  return useQuery({
    queryKey: ['institution-reports', institutionId, academicYear],
    queryFn: async () => {
      if (!institutionId) return null;

      const { data: students } = await supabase
        .from('students')
        .select('register_number, name, class_name, section, parent_name, parent_phone, is_active')
        .eq('institution_id', institutionId)
        .eq('academic_year', academicYear) as { data: StudentReportDetail[] | null };

      const { data: faculty } = await supabase
        .from('profiles')
        .select('id, staff_id, full_name, department, role, phone')
        .eq('institution_id', institutionId)
        .neq('role', 'student')
        .neq('role', 'parent') as { data: (FacultyReportDetail & { id: string })[] | null };

      const { data: fees } = await supabase
        .from('student_fees')
        .select(`
          amount_due,
          amount_paid,
          status,
          students!inner(name, class_name, section, academic_year)
        `)
        .eq('institution_id', institutionId)
        .eq('students.academic_year', academicYear);

      const feeDetails: FeeReportDetail[] = (fees || []).map((f: any) => ({
        student_name: f.students.name,
        class_name: f.students.class_name,
        section: f.students.section,
        amount_due: Number(f.amount_due) || 0,
        amount_paid: Number(f.amount_paid) || 0,
        status: f.status
      }));

      return {
        enrollment: (students || []),
        faculty: (faculty || []),
        fees: feeDetails,
      };
    },
    enabled: !!institutionId && !!academicYear,
  });
}

export function useReportHistory(institutionId: string | null) {
  return useQuery({
    queryKey: ['report-history', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('institution_id', institutionId)
        .order('generated_at', { ascending: false })
        .limit(15);
      
      if (error) throw error;
      return (data || []) as ReportRow[];
    },
    enabled: !!institutionId,
  });
}

export const exportToExcel = async (data: any[], fileName: string, institutionId: string, category: string) => {
  try {
    if (!data || data.length === 0) throw new Error("No data available to export.");

    const ws = XLSX.utils.json_to_sheet(data);
    const wscols = Object.keys(data[0] || {}).map(() => ({ wch: 18 }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    // We generate TWO formats to avoid complex conversions in environment-limited React Native
    const wboutBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const wboutArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const uint8 = new Uint8Array(wboutArray);

    // 1. Save locally temporarily (using Base64 for Expo FileSystem)
    const FS = FileSystem as any;
    const baseDir = FS.cacheDirectory || FS.documentDirectory || "";
    const localUri = `${baseDir}${fileName}.xlsx`;
    
    try {
      await FileSystemLegacy.writeAsStringAsync(localUri, wboutBase64, {
        encoding: 'base64'
      });
    } catch (fsErr) {
      console.warn('Local FS cache write failed, continuing with cloud upload...', fsErr);
    }

    // 2. Upload to Supabase Storage using Uint8Array (Supported natively by Supabase JS)
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const storagePath = `reports/${institutionId}/${cleanFileName}_${Date.now()}.xlsx`;
    
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(storagePath, uint8, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload Failed: ${uploadError.message}. Ensure the "reports" storage bucket exists and is accessible.`);
    }

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('reports')
      .getPublicUrl(storagePath);

    // 4. Record in reports table
    const { error: dbError } = await (supabase.from('reports') as any)
      .insert({
        institution_id: institutionId,
        title: fileName.replace(/_/g, ' '),
        type: category,
        url: publicUrl,
        status: 'completed',
        generated_at: new Date().toISOString()
      });

    if (dbError) console.error('Error logging report history:', dbError);

    // 5. Open URL directly
    await Linking.openURL(publicUrl);

    return publicUrl;
  } catch (error: any) {
    console.error('Report Generation Error:', error);
    Alert.alert(
      'Report Error', 
      error.message || 'Failed to generate report. Please try again.'
    );
    throw error;
  }
};
