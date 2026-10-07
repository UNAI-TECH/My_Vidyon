import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface LinkedStudent {
  link_id?: string;
  student_id: string;
  relationship_type?: string;
  is_primary_guardian?: boolean;
  can_pickup?: boolean;
  student: {
    id: string;
    name: string;
    class_name?: string | null;
    section?: string | null;
    image_url?: string | null;
    roll_number?: string | null;
    institution_id: string;
    dob?: string | null;
    gender?: string | null;
    blood_group?: string | null;
  };
}

interface ParentStudentsContextType {
  children: LinkedStudent[];
  selectedChild: LinkedStudent | null;
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ParentStudentsContext = createContext<ParentStudentsContextType>({
  children: [],
  selectedChild: null,
  selectedChildId: null,
  setSelectedChildId: () => {},
  loading: false,
  error: null,
  refetch: async () => {},
});

export function ParentStudentsProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [childrenList, setChildrenList] = useState<LinkedStudent[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!user?.id) {
      setChildrenList([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Try fetching from parent_student_links with student join
      const { data: links } = await (supabase as any)
        .from('parent_student_links')
        .select(`
          id,
          student_id,
          relationship_type,
          is_primary_guardian,
          can_pickup,
          students (
            id,
            name,
            class_name,
            section,
            image_url,
            roll_number,
            institution_id,
            dob,
            gender,
            blood_group
          )
        `)
        .eq('parent_profile_id', user.id);

      if (links && links.length > 0) {
        const mapped: LinkedStudent[] = links
          .filter((l: any) => Boolean(l.students))
          .map((l: any) => ({
            link_id: l.id,
            student_id: l.student_id,
            relationship_type: l.relationship_type,
            is_primary_guardian: l.is_primary_guardian,
            can_pickup: l.can_pickup,
            student: l.students,
          }));

        setChildrenList(mapped);
        if (mapped.length > 0 && !selectedChildId) {
          setSelectedChildId(mapped[0].student_id);
        }
        return;
      }

      // 2. Backward compatibility fallback: query students where parent_id = user.id
      const { data: students } = await (supabase as any)
        .from('students')
        .select('id, name, class_name, section, image_url, roll_number, institution_id, dob, gender, blood_group')
        .eq('parent_id', user.id);

      if (students && students.length > 0) {
        const fallbackMapped: LinkedStudent[] = students.map((s: any) => ({
          student_id: s.id,
          relationship_type: 'parent',
          is_primary_guardian: true,
          student: s,
        }));
        setChildrenList(fallbackMapped);
        if (!selectedChildId) {
          setSelectedChildId(fallbackMapped[0].student_id);
        }
      } else {
        setChildrenList([]);
      }
    } catch (err: any) {
      console.warn('Error loading linked students:', err);
      setError(err.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedChildId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const selectedChild =
    childrenList.find((c) => c.student_id === selectedChildId) ||
    (childrenList.length > 0 ? childrenList[0] : null);

  return (
    <ParentStudentsContext.Provider
      value={{
        children: childrenList,
        selectedChild,
        selectedChildId: selectedChild?.student_id || null,
        setSelectedChildId,
        loading,
        error,
        refetch: fetchChildren,
      }}
    >
      {reactChildren}
    </ParentStudentsContext.Provider>
  );
}

export function useParentStudents() {
  return useContext(ParentStudentsContext);
}
