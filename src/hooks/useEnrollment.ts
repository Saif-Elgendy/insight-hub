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
  const { user, session } = useAuth();
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
    if (!user || !session) {
      return { success: false, error: 'يرجى تسجيل الدخول أولاً' };
    }

    if (!courseId) {
      return { success: false, error: 'الكورس غير موجود' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('process-enrollment', {
        body: { action: 'enroll', course_id: courseId }
      });

      if (error) {
        console.error('Error enrolling:', error);
        return { success: false, error: 'حدث خطأ أثناء التسجيل' };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      setEnrollment(data.enrollment);
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
      const { data, error } = await supabase.functions.invoke('process-enrollment', {
        body: { action: 'activate', enrollment_id: enrollment.id }
      });

      if (error) {
        console.error('Error activating enrollment:', error);
        return { success: false, error: 'حدث خطأ أثناء تفعيل التسجيل' };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      setEnrollment(data.enrollment);
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
      const { data, error } = await supabase.functions.invoke('process-enrollment', {
        body: { action: 'cancel', enrollment_id: enrollment.id }
      });

      if (error) {
        console.error('Error cancelling enrollment:', error);
        return { success: false, error: 'حدث خطأ أثناء إلغاء التسجيل' };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      setEnrollment(data.enrollment);
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
