import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface AcademicTerm {
  id: string;
  institution_id: string;
  academic_year: string;
  term_name: string;
  term_number: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FeeComponent {
  id?: string;
  fee_structure_id?: string;
  name: string;
  amount: number;
  is_optional?: boolean;
  is_transport?: boolean;
  category?: string;
}

export interface FeeStructure {
  id: string;
  institution_id: string;
  name: string;
  amount: number;
  term_id?: string | null;
  class_name?: string | null;
  category?: string;
  academic_year?: string;
  version_number?: number;
  is_active?: boolean;
  components?: FeeComponent[];
}

export interface StudentFeeLedgerItem {
  id: string;
  institution_id: string;
  student_id: string;
  fee_structure_id?: string | null;
  amount_due: number;
  amount_paid: number;
  concession_amount: number;
  status: string;
  due_date?: string | null;
  term_id?: string | null;
  academic_year?: string | null;
  class_name?: string | null;
  student?: {
    id: string;
    name: string;
    roll_number?: string;
    class?: string;
    section?: string;
  };
  balance?: number;
}

export interface FeePaymentRecord {
  id: string;
  student_fee_id: string;
  institution_id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_date: string;
  receipt_number?: string;
  notes?: string;
  collected_by?: string;
  student?: {
    name: string;
    roll_number?: string;
  };
}

export function useFeeManagement() {
  const { user, institutionId } = useAuth();
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [ledgers, setLedgers] = useState<StudentFeeLedgerItem[]>([]);
  const [payments, setPayments] = useState<FeePaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Academic Terms
  const fetchTerms = useCallback(async () => {
    if (!institutionId) return [];
    try {
      const { data, error: err } = await (supabase as any)
        .from('academic_terms')
        .select('*')
        .eq('institution_id', institutionId)
        .order('term_number', { ascending: true });

      if (err) throw err;
      setTerms(data || []);
      return data || [];
    } catch (e: any) {
      console.warn('Error fetching academic terms:', e);
      return [];
    }
  }, [institutionId]);

  // 2. Fetch Fee Structures + Components
  const fetchStructures = useCallback(async (termId?: string) => {
    if (!institutionId) return [];
    try {
      let query = (supabase as any)
        .from('fee_structures')
        .select('*, components:fee_components(*)')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (termId) {
        query = query.eq('term_id', termId);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setStructures(data || []);
      return data || [];
    } catch (e: any) {
      console.warn('Error fetching fee structures:', e);
      return [];
    }
  }, [institutionId]);

  // 3. Fetch Student Fees Ledger
  const fetchLedgers = useCallback(async (filters?: { termId?: string; className?: string; status?: string }) => {
    if (!institutionId) return [];
    try {
      let query = (supabase as any)
        .from('student_fees')
        .select('*, student:students(id, name, roll_number, class, section)')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (filters?.termId) {
        query = query.eq('term_id', filters.termId);
      }
      if (filters?.className) {
        query = query.eq('class_name', filters.className);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error: err } = await query;
      if (err) throw err;

      // Compute balance = amount_due - amount_paid - concession_amount
      const mapped = (data || []).map((row: any) => {
        const due = Number(row.amount_due || 0);
        const paid = Number(row.amount_paid || 0);
        const conc = Number(row.concession_amount || 0);
        return {
          ...row,
          balance: Math.max(0, due - paid - conc),
        };
      });

      setLedgers(mapped);
      return mapped;
    } catch (e: any) {
      console.warn('Error fetching student fee ledgers:', e);
      return [];
    }
  }, [institutionId]);

  // 4. Fetch Payments & Receipts History
  const fetchPayments = useCallback(async () => {
    if (!institutionId) return [];
    try {
      const { data, error: err } = await (supabase as any)
        .from('fee_payments')
        .select('*, student:students(name, roll_number)')
        .eq('institution_id', institutionId)
        .order('payment_date', { ascending: false })
        .limit(100);

      if (err) throw err;
      setPayments(data || []);
      return data || [];
    } catch (e: any) {
      console.warn('Error fetching fee payments:', e);
      return [];
    }
  }, [institutionId]);

  // 5. Create Academic Term
  const createTerm = async (term: {
    academic_year: string;
    term_name: string;
    term_number: number;
    start_date?: string;
    end_date?: string;
  }) => {
    if (!institutionId) throw new Error('No institution selected');
    setLoading(true);
    try {
      const { data, error: err } = await (supabase as any)
        .from('academic_terms')
        .insert({
          ...term,
          institution_id: institutionId,
          is_active: true,
        })
        .select()
        .single();

      if (err) throw err;
      await fetchTerms();
      return data;
    } finally {
      setLoading(false);
    }
  };

  // 6. Create Fee Structure with Components
  const createFeeStructure = async (
    structure: {
      name: string;
      term_id?: string;
      class_name?: string;
      academic_year?: string;
      category?: string;
    },
    components: Array<{ name: string; amount: number; is_optional?: boolean; is_transport?: boolean }>
  ) => {
    if (!institutionId) throw new Error('No institution selected');
    setLoading(true);
    try {
      const totalAmount = components.reduce((sum, c) => sum + (c.is_optional ? 0 : Number(c.amount || 0)), 0);

      // Insert fee_structure
      const { data: newStruct, error: structErr } = await (supabase as any)
        .from('fee_structures')
        .insert({
          institution_id: institutionId,
          name: structure.name,
          amount: totalAmount,
          term_id: structure.term_id || null,
          class_name: structure.class_name || null,
          academic_year: structure.academic_year || '2026-27',
          category: structure.category || 'tuition',
          is_active: true,
        })
        .select()
        .single();

      if (structErr) throw structErr;

      // Insert fee_components
      if (components.length > 0) {
        const rows = components.map((comp) => ({
          fee_structure_id: newStruct.id,
          name: comp.name,
          amount: Number(comp.amount || 0),
          is_optional: !!comp.is_optional,
          is_transport: !!comp.is_transport,
        }));

        const { error: compErr } = await (supabase as any).from('fee_components').insert(rows);
        if (compErr) throw compErr;
      }

      await fetchStructures();
      return newStruct;
    } finally {
      setLoading(false);
    }
  };

  // 7. Bulk Assign Fee Structure to Students of a Class
  const assignFeeStructureToClass = async (params: {
    feeStructureId: string;
    className: string;
    termId?: string;
    academicYear?: string;
    dueDate?: string;
  }) => {
    if (!institutionId) throw new Error('No institution selected');
    setLoading(true);
    try {
      // Find fee structure amount
      const { data: struct, error: sErr } = await (supabase as any)
        .from('fee_structures')
        .select('*')
        .eq('id', params.feeStructureId)
        .single();

      if (sErr || !struct) throw new Error('Fee structure not found');

      // Find all students in this class
      const { data: students, error: studErr } = await (supabase as any)
        .from('students')
        .select('id, name, class')
        .eq('institution_id', institutionId)
        .eq('class', params.className);

      if (studErr) throw studErr;
      if (!students || students.length === 0) {
        throw new Error(`No students found in class ${params.className}`);
      }

      const rows = students.map((s: any) => ({
        institution_id: institutionId,
        student_id: s.id,
        fee_structure_id: struct.id,
        amount_due: struct.amount,
        amount_paid: 0,
        concession_amount: 0,
        status: 'pending',
        due_date: params.dueDate || null,
        term_id: params.termId || struct.term_id || null,
        academic_year: params.academicYear || struct.academic_year || '2026-27',
        class_name: params.className,
      }));

      const { error: insErr } = await (supabase as any).from('student_fees').insert(rows);
      if (insErr) throw insErr;

      await fetchLedgers();
      return { assignedCount: rows.length };
    } finally {
      setLoading(false);
    }
  };

  // 8. Record Fee Payment (Append-only)
  const recordPayment = async (params: {
    studentFeeId: string;
    studentId: string;
    amount: number;
    paymentMethod: 'cash' | 'card' | 'upi' | 'netbanking' | 'cheque' | 'dd' | 'online' | 'other';
    paymentReference?: string;
    notes?: string;
  }) => {
    if (!institutionId) throw new Error('No institution selected');
    setLoading(true);
    try {
      const receiptNo = `REC-${Date.now().toString().slice(-8)}`;

      // 1. Insert fee_payment
      const { data: payment, error: pErr } = await (supabase as any)
        .from('fee_payments')
        .insert({
          student_fee_id: params.studentFeeId,
          institution_id: institutionId,
          student_id: params.studentId,
          amount: params.amount,
          payment_method: params.paymentMethod,
          payment_reference: params.paymentReference || null,
          receipt_number: receiptNo,
          notes: params.notes || null,
          collected_by: user?.id || null,
          payment_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (pErr) throw pErr;

      // 2. Fetch current student_fee to update amount_paid
      const { data: currFee, error: fErr } = await (supabase as any)
        .from('student_fees')
        .select('*')
        .eq('id', params.studentFeeId)
        .single();

      if (fErr || !currFee) throw new Error('Student fee record not found');

      const updatedPaid = Number(currFee.amount_paid || 0) + Number(params.amount);
      const totalDue = Number(currFee.amount_due || 0);
      const concession = Number(currFee.concession_amount || 0);
      const remaining = totalDue - concession - updatedPaid;

      const newStatus = remaining <= 0 ? 'paid' : updatedPaid > 0 ? 'partial' : 'pending';

      const { error: updErr } = await (supabase as any)
        .from('student_fees')
        .update({
          amount_paid: updatedPaid,
          status: newStatus,
        })
        .eq('id', params.studentFeeId);

      if (updErr) throw updErr;

      // 3. Insert fee_receipt
      await (supabase as any).from('fee_receipts').insert({
        receipt_number: receiptNo,
        payment_id: payment.id,
        institution_id: institutionId,
        student_id: params.studentId,
        amount: params.amount,
      });

      await fetchLedgers();
      await fetchPayments();
      return { payment, receiptNo };
    } finally {
      setLoading(false);
    }
  };

  // 9. Grant Concession
  const grantConcession = async (params: {
    studentFeeId: string;
    concessionType: string;
    amount: number;
    reason?: string;
  }) => {
    if (!institutionId) throw new Error('No institution selected');
    setLoading(true);
    try {
      // 1. Insert fee_concessions
      const { error: cErr } = await (supabase as any).from('fee_concessions').insert({
        student_fee_id: params.studentFeeId,
        concession_type: params.concessionType,
        amount: params.amount,
        reason: params.reason || null,
        approved_by: user?.id || null,
      });

      if (cErr) throw cErr;

      // 2. Update student_fees
      const { data: currFee, error: fErr } = await (supabase as any)
        .from('student_fees')
        .select('*')
        .eq('id', params.studentFeeId)
        .single();

      if (fErr || !currFee) throw new Error('Student fee record not found');

      const updatedConcession = Number(currFee.concession_amount || 0) + Number(params.amount);
      const totalDue = Number(currFee.amount_due || 0);
      const paid = Number(currFee.amount_paid || 0);
      const remaining = totalDue - updatedConcession - paid;
      const newStatus = remaining <= 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';

      await (supabase as any)
        .from('student_fees')
        .update({
          concession_amount: updatedConcession,
          status: newStatus,
        })
        .eq('id', params.studentFeeId);

      await fetchLedgers();
      return true;
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (institutionId) {
      fetchTerms();
      fetchStructures();
      fetchLedgers();
      fetchPayments();
    }
  }, [institutionId, fetchTerms, fetchStructures, fetchLedgers, fetchPayments]);

  return {
    terms,
    structures,
    ledgers,
    payments,
    loading,
    error,
    fetchTerms,
    fetchStructures,
    fetchLedgers,
    fetchPayments,
    createTerm,
    createFeeStructure,
    assignFeeStructureToClass,
    recordPayment,
    grantConcession,
  };
}
