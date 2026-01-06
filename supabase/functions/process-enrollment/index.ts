import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrollmentRequest {
  action: 'enroll' | 'activate' | 'cancel';
  course_id?: string;
  enrollment_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'غير مصرح - يرجى تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Invalid token:', claimsError);
      return new Response(
        JSON.stringify({ error: 'جلسة غير صالحة - يرجى تسجيل الدخول مرة أخرى' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log('Processing enrollment for user:', userId);

    // Parse and validate request body
    const body: EnrollmentRequest = await req.json();
    
    if (!body.action) {
      return new Response(
        JSON.stringify({ error: 'الإجراء مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate action-specific parameters
    if (body.action === 'enroll' && !body.course_id) {
      return new Response(
        JSON.stringify({ error: 'معرف الكورس مطلوب للتسجيل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((body.action === 'activate' || body.action === 'cancel') && !body.enrollment_id) {
      return new Response(
        JSON.stringify({ error: 'معرف التسجيل مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (body.course_id && !uuidRegex.test(body.course_id)) {
      return new Response(
        JSON.stringify({ error: 'معرف الكورس غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.enrollment_id && !uuidRegex.test(body.enrollment_id)) {
      return new Response(
        JSON.stringify({ error: 'معرف التسجيل غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (body.action) {
      case 'enroll': {
        // Check if course exists
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', body.course_id)
          .single();

        if (courseError || !course) {
          console.error('Course not found:', courseError);
          return new Response(
            JSON.stringify({ error: 'الكورس غير موجود' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for existing enrollment
        const { data: existing, error: existingError } = await supabase
          .from('enrollments')
          .select('id, status')
          .eq('user_id', userId)
          .eq('course_id', body.course_id)
          .maybeSingle();

        if (existing) {
          if (existing.status === 'cancelled') {
            // Reactivate cancelled enrollment
            const { data, error } = await supabase
              .from('enrollments')
              .update({ status: 'pending', paid_at: null })
              .eq('id', existing.id)
              .select()
              .single();

            if (error) {
              console.error('Error reactivating enrollment:', error);
              return new Response(
                JSON.stringify({ error: 'حدث خطأ أثناء إعادة التسجيل' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            result = { enrollment: data, message: 'تم إعادة التسجيل بنجاح' };
          } else {
            return new Response(
              JSON.stringify({ error: 'أنت مسجل بالفعل في هذا الكورس' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // Create new enrollment
          const { data, error } = await supabase
            .from('enrollments')
            .insert({
              user_id: userId,
              course_id: body.course_id,
              status: 'pending'
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating enrollment:', error);
            return new Response(
              JSON.stringify({ error: 'حدث خطأ أثناء التسجيل' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log('Enrollment created:', data.id);
          result = { enrollment: data, message: 'تم التسجيل بنجاح - في انتظار تأكيد الدفع' };
        }
        break;
      }

      case 'activate': {
        // Verify enrollment belongs to user
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id, user_id, status, course_id')
          .eq('id', body.enrollment_id)
          .single();

        if (enrollmentError || !enrollment) {
          console.error('Enrollment not found:', enrollmentError);
          return new Response(
            JSON.stringify({ error: 'التسجيل غير موجود' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (enrollment.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'غير مصرح لك بتعديل هذا التسجيل' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (enrollment.status !== 'pending') {
          return new Response(
            JSON.stringify({ error: 'لا يمكن تفعيل هذا التسجيل' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Activate enrollment
        const { data, error } = await supabase
          .from('enrollments')
          .update({ 
            status: 'active', 
            paid_at: new Date().toISOString() 
          })
          .eq('id', body.enrollment_id)
          .select()
          .single();

        if (error) {
          console.error('Error activating enrollment:', error);
          return new Response(
            JSON.stringify({ error: 'حدث خطأ أثناء تفعيل التسجيل' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create course progress record
        const { data: course } = await supabase
          .from('courses')
          .select('lessons_count')
          .eq('id', enrollment.course_id)
          .single();

        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', enrollment.course_id);

        await supabase
          .from('course_progress')
          .upsert({
            user_id: userId,
            course_id: enrollment.course_id,
            total_lessons: lessons?.length || course?.lessons_count || 0,
            completed_lessons: 0,
            started_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,course_id'
          });

        console.log('Enrollment activated:', data.id);
        result = { enrollment: data, message: 'تم تفعيل التسجيل بنجاح' };
        break;
      }

      case 'cancel': {
        // Verify enrollment belongs to user
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id, user_id, status')
          .eq('id', body.enrollment_id)
          .single();

        if (enrollmentError || !enrollment) {
          console.error('Enrollment not found:', enrollmentError);
          return new Response(
            JSON.stringify({ error: 'التسجيل غير موجود' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (enrollment.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'غير مصرح لك بتعديل هذا التسجيل' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (enrollment.status === 'cancelled') {
          return new Response(
            JSON.stringify({ error: 'التسجيل ملغي بالفعل' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (enrollment.status === 'completed') {
          return new Response(
            JSON.stringify({ error: 'لا يمكن إلغاء كورس مكتمل' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Cancel enrollment
        const { data, error } = await supabase
          .from('enrollments')
          .update({ status: 'cancelled' })
          .eq('id', body.enrollment_id)
          .select()
          .single();

        if (error) {
          console.error('Error cancelling enrollment:', error);
          return new Response(
            JSON.stringify({ error: 'حدث خطأ أثناء إلغاء التسجيل' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Enrollment cancelled:', data.id);
        result = { enrollment: data, message: 'تم إلغاء التسجيل' };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'إجراء غير معروف' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
