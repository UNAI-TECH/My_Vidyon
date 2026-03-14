import { supabase } from '../lib/supabase';

/**
 * useFeeWorkflow
 * 
 * Implements the financial ecosystem:
 * Definition (Accountant) -> Payment (Parent) -> Ledger (Accountant)
 */
export function useFeeWorkflow() {
  const defineFeeStructure = async (institutionId: string, name: string, amount: number) => {
    return await supabase
      .from('fee_structures')
      // @ts-ignore: bypass 'never' type inference
      .insert({ institution_id: institutionId, name, amount });
  };

  const processPayment = async (studentId: string, feeStructureId: string, amountPaid: number, method: string) => {
    // 1. Record the transaction
    const { data: trans, error: transError } = await supabase
      .from('fee_payments')
      // @ts-ignore: bypass 'never' type inference
      .insert({ student_id: studentId, fee_structure_id: feeStructureId, amount_paid: amountPaid, status: 'verified' })
      .select()
      .single();

    if (transError) throw transError;
    if (!trans) throw new Error("Transaction failed");

    // 2. Update Student Fee Status
    await supabase
      .from('student_fees')
      // @ts-ignore: bypass 'never' type inference
      .update({ status: 'paid', last_payment_date: new Date().toISOString() })
      .eq('student_id', studentId)
      .eq('fee_structure_id', feeStructureId);

    return trans;
  };

  return { defineFeeStructure, processPayment };
}
