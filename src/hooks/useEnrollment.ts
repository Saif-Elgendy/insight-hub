import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type EnrollmentStatus = Database['public']['Enums']['enrollment_status'];

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useEnrollment = (courseId: string | undefined) => {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEnrollment = useCallback(async () => {
    if (!user || !courseId) {
      setEnrollment(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching enrollment:', error);
      } else {
        setEnrollment(data);
      }
    } catch (error) {
      console.error('Error fetching enrollment:', error);
    } finally {
      setLoading(false);
    }
  }, [user, courseId]);

  useEffect(() => {
    fetchEnrollment();
  }, [fetchEnrollment]);

  const enroll = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'يرجى تسجيل الدخول أولاً' };
    }

    if (!courseId) {
      return { success: false, error: 'الكورس غير موجود' };
    }

    try {
      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'أنت مسجل بالفعل في هذا الكورس' };
        }
        console.error('Error enrolling:', error);
        return { success: false, error: 'حدث خطأ أثناء التسجيل' };
      }

      setEnrollment(data);
      return { success: true };
    } catch (error) {
      console.error('Error enrolling:', error);
      return { success: false, error: 'حدث خطأ أثناء التسجيل' };
    }
  };

  const activateEnrollment = async (): Promise<{ success: boolean; error?: string }> => {
    if (!enrollment) {
      return { success: false, error: 'لم يتم العثور على التسجيل' };
    }

    try {
      const { data, error } = await supabase
        .from('enrollments')
        .update({
          status: 'active',
          paid_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id)
        .select()
        .single();

      if (error) {
        console.error('Error activating enrollment:', error);
        return { success: false, error: 'حدث خطأ أثناء تفعيل التسجيل' };
      }

      setEnrollment(data);
      return { success: true };
    } catch (error) {
      console.error('Error activating enrollment:', error);
      return { success: false, error: 'حدث خطأ أثناء تفعيل التسجيل' };
    }
  };

  const cancelEnrollment = async (): Promise<{ success: boolean; error?: string }> => {
    if (!enrollment) {
      return { success: false, error: 'لم يتم العثور على التسجيل' };
    }

    try {
      const { data, error } = await supabase
        .from('enrollments')
        .update({ status: 'cancelled' })
        .eq('id', enrollment.id)
        .select()
        .single();

      if (error) {
        console.error('Error cancelling enrollment:', error);
        return { success: false, error: 'حدث خطأ أثناء إلغاء التسجيل' };
      }

      setEnrollment(data);
      return { success: true };
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      return { success: false, error: 'حدث خطأ أثناء إلغاء التسجيل' };
    }
  };

  const isEnrolled = enrollment?.status === 'active' || enrollment?.status === 'completed';
  const isPending = enrollment?.status === 'pending';
  const isCancelled = enrollment?.status === 'cancelled';

  return {
    enrollment,
    loading,
    enroll,
    activateEnrollment,
    cancelEnrollment,
    isEnrolled,
    isPending,
    isCancelled,
    refetch: fetchEnrollment,
  };
};
