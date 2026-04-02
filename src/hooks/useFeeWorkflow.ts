import { supabase } from '../lib/supabase';

/**
 * useFeeWorkflow
 * 
 * Implements the financial ecosystem:
 * Definition (Accountant) -> Payment (Parent) -> Ledger (Accountant)
 */
export function useFeeWorkflow() {
  const defineFeeStructure = async (
    institutionId: string, 
    name: string, 
    amount: number, 
    className: string, 
    dueDate: string,
    components: { title: string, amount: number }[]
  ) => {
    return await supabase
      .from('fee_structures')
      // @ts-ignore: bypass 'never' type inference
      .insert({ 
        institution_id: institutionId, 
        name, 
        amount, 
        class_name: className, 
        due_date: dueDate,
        description: JSON.stringify(components)
      })
      .select()
      .single();
  };

  const processPayment = async (studentId: string, feeStructureId: string, amountPaid: number, method: string) => {
    // 1. Record the transaction
    const { data: trans, error: transError } = await supabase
      .from('fee_payments')
      // @ts-ignore: bypass 'never' type inference
      .insert({ 
        student_id: studentId, 
        fee_structure_id: feeStructureId, 
        amount_paid: amountPaid, 
        status: 'verified',
        payment_date: new Date().toISOString()
      })
      .select()
      .single();

    if (transError) throw transError;
    if (!trans) throw new Error("Transaction failed");

    // 2. Update Student Fee Status
    const { data: currentFee } = await supabase
      .from('student_fees')
      .select('amount_paid, amount_due')
      .eq('student_id', studentId)
      .eq('fee_structure_id', feeStructureId)
      .single();

    if (currentFee) {
      // @ts-ignore: bypass 'never' type inference
      const newPaid = (currentFee.amount_paid || 0) + amountPaid;
      // @ts-ignore: bypass 'never' type inference
      const newDue = Math.max(0, (currentFee.amount_due || 0) - amountPaid);
      
      await supabase
        .from('student_fees')
        // @ts-ignore: bypass 'never' type inference
        .update({ 
          amount_paid: newPaid,
          amount_due: newDue,
          status: newDue === 0 ? 'paid' : 'partial', 
          last_payment_date: new Date().toISOString() 
        })
        .eq('student_id', studentId)
        .eq('fee_structure_id', feeStructureId);
    }

    return trans;
  };

  const sendFeeReminder = async (institutionId: string, feeStructureId: string, className: string, amount: number) => {
    // 1. Fetch all students in the class with outstanding balance
    const { data: debtors } = await supabase
      .from('student_fees')
      .select('student_id, amount_due, students(user_id, full_name)')
      .eq('institution_id', institutionId)
      .eq('fee_structure_id', feeStructureId)
      .gt('amount_due', 0);

    if (!debtors || debtors.length === 0) return { count: 0 };

    // 2. Insert notifications for each
    const notifications = (debtors as any[]).map(d => ({
      user_id: d.students?.user_id,
      institution_id: institutionId,
      title: 'Fee Payment Reminder',
      message: `Dear ${d.students?.full_name}, you have an outstanding balance of ₹${d.amount_due} for the current fee structure. Please clear it by the due date.`,
      type: 'fee_reminder',
      read: false,
      created_at: new Date().toISOString()
    })).filter(n => !!n.user_id);

    if (notifications.length === 0) return { count: 0 };

    const { error } = await supabase
      .from('notifications')
      // @ts-ignore: bypass 'never' type inference
      .insert(notifications);

    if (error) throw error;
    return { count: notifications.length };
  };

  const sendIndividualReminder = async (institutionId: string, studentId: string, userId: string, fullName: string, amountDue: number) => {
    try {
      // 1. Fetch student's parent_id from students table
      const { data, error: studentError } = await supabase
        .from('students')
        .select('parent_id')
        .eq('id', studentId)
        .single();
      
      const studentData = data as any;

      if (studentError) throw studentError;

      // 2. Prepare notifications for student and parent
      const notifications = [
        {
          user_id: userId,
          institution_id: institutionId,
          title: 'Fee Payment Reminder',
          message: `Dear ${fullName}, you have an outstanding balance of ₹${amountDue}. Please clear it as soon as possible.`,
          type: 'fee_reminder',
          read: false,
          created_at: new Date().toISOString()
        }
      ];

      if (studentData?.parent_id) {
        notifications.push({
          user_id: studentData.parent_id,
          institution_id: institutionId,
          title: 'Child Fee Reminder',
          message: `Dear Parent, your child ${fullName} has an outstanding balance of ₹${amountDue}. Please clear it as soon as possible.`,
          type: 'fee_reminder',
          read: false,
          created_at: new Date().toISOString()
        });
      }

      const { error } = await supabase
        .from('notifications')
        // @ts-ignore
        .insert(notifications);

      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Reminder failed:', e);
      throw e;
    }
  };

  const updateStudentFeeOverride = async (
    institutionId: string, // NOTE: Expects SLUG (institutions.institution_id)
    studentId: string, 
    feeStructureId: string,
    totalAmount: number,
    components: { title: string, amount: number }[],
    dueDate: string
  ) => {
    // Check if record exists
    const { data: existing } = await supabase
      .from('student_fees')
      .select('id')
      .eq('student_id', studentId)
      .eq('fee_structure_id', feeStructureId)
      .single();

    if (existing) {
      return await supabase
        .from('student_fees')
        // @ts-ignore: bypass 'never' type inference
        .update({
          amount_due: totalAmount,
          description: JSON.stringify(components),
          due_date: dueDate,
          status: 'pending'
        })
        // @ts-ignore: bypass 'never' type inference
        .eq('id', (existing as any).id);

    } else {
      return await supabase
        .from('student_fees')
        // @ts-ignore: bypass 'never' type inference
        .insert({
          institution_id: institutionId,
          student_id: studentId,
          fee_structure_id: feeStructureId,
          amount_due: totalAmount,
          amount_paid: 0,
          description: JSON.stringify(components),
          due_date: dueDate,
          status: 'pending'
        });
    }
  };

  const completeStudentPayment = async (
    institutionId: string, // NOTE: Expects SLUG (institutions.institution_id)
    studentId: string,
    feeStructureId: string,
    amount: number,
    transactionId: string = `TX-${Date.now()}`
  ) => {
    // 1. Update student_fees record
    const { error: feeError } = await supabase
      .from('student_fees')
      // @ts-ignore
      .update({
        status: 'paid',
        amount_paid: amount,
        amount_due: 0,
        last_payment_date: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('fee_structure_id', feeStructureId);

    if (feeError) throw feeError;

    // 2. Insert into fee_payments
    const { error: payError } = await supabase
      .from('fee_payments')
      // @ts-ignore
      .insert({
        institution_id: institutionId,
        student_id: studentId,
        fee_structure_id: feeStructureId,
        amount_paid: amount,
        payment_date: new Date().toISOString(),
        status: 'paid',
        transaction_id: transactionId,
        created_at: new Date().toISOString()
      });

    if (payError) throw payError;
    return true;
  };

  const processQuickBill = async (
    institutionId: string,
    studentId: string,
    amount: number,
    category: string
  ) => {
    // 1. Find or create generic Quick Bill structure
    const structName = `Quick Bill: ${category}`;
    const { data: structure } = await supabase
      .from('fee_structures')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('name', structName)
      .maybeSingle();

    let structureId = (structure as any)?.id;

    if (!structureId) {
      const { data: newStruct, error: createError } = await defineFeeStructure(
        institutionId,
        structName,
        0,
        'Ad-hoc',
        new Date().toISOString().split('T')[0],
        [{ title: category, amount: 0 }]
      );
      if (createError) throw createError;
      structureId = (newStruct as any).id;
    }

    if (!structureId) throw new Error("Failed to resolve fee structure logic");

    // 2. Assign fee to student
    const { error: overrideError } = await updateStudentFeeOverride(
      institutionId,
      studentId,
      structureId,
      amount,
      [{ title: category, amount }],
      new Date().toISOString().split('T')[0]
    );

    if (overrideError) throw overrideError;

    const transactionId = `QB-${Date.now()}`;

    // 3. Pay it immediately
    await completeStudentPayment(
      institutionId,
      studentId,
      structureId,
      amount,
      transactionId
    );

    return transactionId;
  };

  return { defineFeeStructure, processPayment, sendFeeReminder, sendIndividualReminder, updateStudentFeeOverride, completeStudentPayment, processQuickBill };
}
