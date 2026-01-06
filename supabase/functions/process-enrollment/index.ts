import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============= Structured Logger =============
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message, ...data }))
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), message, ...data }))
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'ERROR', timestamp: new Date().toISOString(), message, ...data }))
  },
  debug: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'DEBUG', timestamp: new Date().toISOString(), message, ...data }))
  }
}

// ============= Rate Limit Configuration =============
const RATE_LIMIT_CONFIG = {
  enroll: { maxRequests: 5, windowMinutes: 1 },
  activate: { maxRequests: 10, windowMinutes: 1 },
  cancel: { maxRequests: 3, windowMinutes: 1 },
}

interface RequestContext {
  userId: string
  action: string
  courseId?: string
  enrollmentId?: string
  ipAddress?: string
  userAgent?: string
  startTime: number
}

interface EnrollmentRequest {
  action: 'enroll' | 'activate' | 'cancel'
  course_id?: string
  enrollment_id?: string
}

// ============= Activity Logging =============
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logActivity(
  supabase: SupabaseClient<any, any, any>,
  ctx: RequestContext,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: ctx.userId,
      action: ctx.action,
      entity_type: 'enrollment',
      entity_id: ctx.enrollmentId || ctx.courseId,
      metadata: {
        ...metadata,
        duration_ms: Date.now() - ctx.startTime
      },
      ip_address: ctx.ipAddress,
      user_agent: ctx.userAgent
    })
    logger.debug('Activity logged', { action: ctx.action, userId: ctx.userId })
  } catch (error) {
    logger.warn('Failed to log activity', { error: String(error) })
  }
}

// ============= Error Logging =============
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logError(
  supabase: SupabaseClient<any, any, any>,
  ctx: RequestContext,
  error: Error,
  requestData?: Record<string, unknown>
) {
  try {
    await supabase.from('error_logs').insert({
      user_id: ctx.userId,
      function_name: 'process-enrollment',
      error_message: error.message,
      error_stack: error.stack,
      request_data: {
        action: ctx.action,
        courseId: ctx.courseId,
        enrollmentId: ctx.enrollmentId,
        ...requestData
      }
    })
    logger.debug('Error logged to database', { error: error.message })
  } catch (logError) {
    logger.error('Failed to log error to database', { error: String(logError) })
  }
}

// ============= Rate Limiting =============
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkRateLimit(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  action: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = RATE_LIMIT_CONFIG[action as keyof typeof RATE_LIMIT_CONFIG] || { maxRequests: 10, windowMinutes: 1 }
  
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      _user_id: userId,
      _action_type: `enrollment_${action}`,
      _max_requests: config.maxRequests,
      _window_minutes: config.windowMinutes
    })
    
    if (error) {
      logger.warn('Rate limit check failed, allowing request', { error: error.message })
      return { allowed: true }
    }
    
    if (!data) {
      logger.warn('Rate limit exceeded', { userId, action, maxRequests: config.maxRequests })
      return { allowed: false, retryAfter: config.windowMinutes * 60 }
    }
    
    return { allowed: true }
  } catch (error) {
    logger.warn('Rate limit error, allowing request', { error: String(error) })
    return { allowed: true }
  }
}

// ============= Validation =============
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function validateInput(body: EnrollmentRequest): { valid: boolean; error?: string } {
  const { action, course_id, enrollment_id } = body
  
  if (!action || typeof action !== 'string') {
    return { valid: false, error: 'الإجراء مطلوب' }
  }
  
  if (!['enroll', 'activate', 'cancel'].includes(action)) {
    return { valid: false, error: 'إجراء غير صالح' }
  }
  
  if (action === 'enroll') {
    if (!course_id || typeof course_id !== 'string') {
      return { valid: false, error: 'معرف الكورس مطلوب للتسجيل' }
    }
    if (!isValidUUID(course_id)) {
      return { valid: false, error: 'معرف الكورس غير صالح' }
    }
  }
  
  if (action === 'activate' || action === 'cancel') {
    if (!enrollment_id || typeof enrollment_id !== 'string') {
      return { valid: false, error: 'معرف التسجيل مطلوب' }
    }
    if (!isValidUUID(enrollment_id)) {
      return { valid: false, error: 'معرف التسجيل غير صالح' }
    }
  }
  
  return { valid: true }
}

// ============= Main Handler =============
Deno.serve(async (req) => {
  const startTime = Date.now()
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Extract request metadata for logging
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  logger.info('Enrollment request received', { method: req.method, ipAddress })

  try {
    // Validate authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header', { ipAddress })
      return new Response(
        JSON.stringify({ error: 'غير مصرح - يرجى تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Client with user's auth for validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Service role client for privileged operations (logging, rate limiting)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Validate user using getUser()
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Invalid token', { error: userError?.message, ipAddress })
      return new Response(
        JSON.stringify({ error: 'جلسة غير صالحة - يرجى تسجيل الدخول مرة أخرى' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    logger.info('User authenticated', { userId })

    // Parse request body
    const body: EnrollmentRequest = await req.json()

    // Create request context for logging
    const ctx: RequestContext = {
      userId,
      action: body.action,
      courseId: body.course_id,
      enrollmentId: body.enrollment_id,
      ipAddress,
      userAgent,
      startTime
    }

    // Validate input
    const validation = validateInput(body)
    if (!validation.valid) {
      logger.warn('Input validation failed', { userId, error: validation.error, body })
      await logActivity(supabaseAdmin, ctx, { status: 'validation_failed', error: validation.error })
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(supabaseAdmin, userId, body.action)
    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded', { userId, action: body.action })
      await logActivity(supabaseAdmin, ctx, { status: 'rate_limited' })
      return new Response(
        JSON.stringify({ 
          error: 'تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً',
          retryAfter: rateLimit.retryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter || 60)
          } 
        }
      )
    }

    logger.info('Processing enrollment action', { userId, action: body.action, courseId: body.course_id, enrollmentId: body.enrollment_id })

    let result

    switch (body.action) {
      case 'enroll': {
        // Check if course exists
        const { data: course, error: courseError } = await supabaseAuth
          .from('courses')
          .select('id, title')
          .eq('id', body.course_id)
          .single()

        if (courseError || !course) {
          logger.warn('Course not found', { courseId: body.course_id, error: courseError?.message })
          await logActivity(supabaseAdmin, ctx, { status: 'course_not_found' })
          return new Response(
            JSON.stringify({ error: 'الكورس غير موجود' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check for existing enrollment (excluding soft-deleted)
        const { data: existing } = await supabaseAdmin
          .from('enrollments')
          .select('id, status, deleted_at')
          .eq('user_id', userId)
          .eq('course_id', body.course_id)
          .is('deleted_at', null)
          .maybeSingle()

        if (existing) {
          if (existing.status === 'cancelled') {
            // Reactivate cancelled enrollment
            const { data, error } = await supabaseAdmin
              .from('enrollments')
              .update({ 
                status: 'pending', 
                paid_at: null,
                deleted_at: null,
                deleted_by: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
              .select()
              .single()

            if (error) {
              logger.error('Error reactivating enrollment', { enrollmentId: existing.id, error: error.message })
              await logError(supabaseAdmin, ctx, new Error(error.message), body as unknown as Record<string, unknown>)
              return new Response(
                JSON.stringify({ error: 'حدث خطأ أثناء إعادة التسجيل' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            ctx.enrollmentId = data.id
            await logActivity(supabaseAdmin, ctx, { status: 'reactivated', courseTitle: course.title })
            logger.info('Enrollment reactivated', { enrollmentId: data.id, duration_ms: Date.now() - startTime })
            result = { enrollment: data, message: 'تم إعادة التسجيل بنجاح' }
          } else {
            logger.info('User already enrolled', { userId, courseId: body.course_id, status: existing.status })
            return new Response(
              JSON.stringify({ error: 'أنت مسجل بالفعل في هذا الكورس' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          // Create new enrollment
          const { data, error } = await supabaseAdmin
            .from('enrollments')
            .insert({
              user_id: userId,
              course_id: body.course_id,
              status: 'pending'
            })
            .select()
            .single()

          if (error) {
            logger.error('Error creating enrollment', { userId, courseId: body.course_id, error: error.message })
            await logError(supabaseAdmin, ctx, new Error(error.message), body as unknown as Record<string, unknown>)
            return new Response(
              JSON.stringify({ error: 'حدث خطأ أثناء التسجيل' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          ctx.enrollmentId = data.id
          await logActivity(supabaseAdmin, ctx, { status: 'created', courseTitle: course.title })
          logger.info('Enrollment created', { enrollmentId: data.id, duration_ms: Date.now() - startTime })
          result = { enrollment: data, message: 'تم التسجيل بنجاح - في انتظار تأكيد الدفع' }
        }
        break
      }

      case 'activate': {
        // Verify enrollment exists and belongs to user (check soft delete)
        const { data: enrollment, error: enrollmentError } = await supabaseAdmin
          .from('enrollments')
          .select('id, user_id, status, course_id, deleted_at')
          .eq('id', body.enrollment_id)
          .is('deleted_at', null)
          .single()

        if (enrollmentError || !enrollment) {
          logger.warn('Enrollment not found', { enrollmentId: body.enrollment_id, error: enrollmentError?.message })
          await logActivity(supabaseAdmin, ctx, { status: 'enrollment_not_found' })
          return new Response(
            JSON.stringify({ error: 'التسجيل غير موجود' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify ownership or admin role
        const { data: userRole } = await supabaseAdmin.rpc('get_user_role', { _user_id: userId })
        
        if (enrollment.user_id !== userId && userRole !== 'admin') {
          logger.warn('Unauthorized activation attempt', { userId, enrollmentId: body.enrollment_id, ownerId: enrollment.user_id })
          await logActivity(supabaseAdmin, ctx, { status: 'unauthorized' })
          return new Response(
            JSON.stringify({ error: 'غير مصرح لك بتعديل هذا التسجيل' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (enrollment.status !== 'pending') {
          logger.info('Enrollment not pending', { enrollmentId: body.enrollment_id, status: enrollment.status })
          return new Response(
            JSON.stringify({ error: 'لا يمكن تفعيل هذا التسجيل' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Activate enrollment
        const { data, error } = await supabaseAdmin
          .from('enrollments')
          .update({ 
            status: 'active', 
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', body.enrollment_id)
          .select()
          .single()

        if (error) {
          logger.error('Error activating enrollment', { enrollmentId: body.enrollment_id, error: error.message })
          await logError(supabaseAdmin, ctx, new Error(error.message), body as unknown as Record<string, unknown>)
          return new Response(
            JSON.stringify({ error: 'حدث خطأ أثناء تفعيل التسجيل' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create course progress record
        const { data: course } = await supabaseAuth
          .from('courses')
          .select('lessons_count')
          .eq('id', enrollment.course_id)
          .single()

        const { data: lessons } = await supabaseAuth
          .from('lessons')
          .select('id')
          .eq('course_id', enrollment.course_id)

        await supabaseAdmin
          .from('course_progress')
          .upsert({
            user_id: userId,
            course_id: enrollment.course_id,
            total_lessons: lessons?.length || course?.lessons_count || 0,
            completed_lessons: 0,
            started_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,course_id'
          })

        await logActivity(supabaseAdmin, ctx, { status: 'activated', previousStatus: 'pending' })
        logger.info('Enrollment activated', { enrollmentId: data.id, duration_ms: Date.now() - startTime })
        result = { enrollment: data, message: 'تم تفعيل التسجيل بنجاح' }
        break
      }

      case 'cancel': {
        // Verify enrollment exists (check soft delete)
        const { data: enrollment, error: enrollmentError } = await supabaseAdmin
          .from('enrollments')
          .select('id, user_id, status, deleted_at')
          .eq('id', body.enrollment_id)
          .is('deleted_at', null)
          .single()

        if (enrollmentError || !enrollment) {
          logger.warn('Enrollment not found for cancellation', { enrollmentId: body.enrollment_id })
          await logActivity(supabaseAdmin, ctx, { status: 'enrollment_not_found' })
          return new Response(
            JSON.stringify({ error: 'التسجيل غير موجود' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify ownership or admin role
        const { data: userRole } = await supabaseAdmin.rpc('get_user_role', { _user_id: userId })
        
        if (enrollment.user_id !== userId && userRole !== 'admin') {
          logger.warn('Unauthorized cancellation attempt', { userId, enrollmentId: body.enrollment_id })
          await logActivity(supabaseAdmin, ctx, { status: 'unauthorized' })
          return new Response(
            JSON.stringify({ error: 'غير مصرح لك بتعديل هذا التسجيل' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (enrollment.status === 'cancelled') {
          return new Response(
            JSON.stringify({ error: 'التسجيل ملغي بالفعل' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (enrollment.status === 'completed') {
          return new Response(
            JSON.stringify({ error: 'لا يمكن إلغاء كورس مكتمل' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const previousStatus = enrollment.status

        // Soft delete: update status and set deleted_at
        const { data, error } = await supabaseAdmin
          .from('enrollments')
          .update({ 
            status: 'cancelled',
            deleted_at: new Date().toISOString(),
            deleted_by: userId,
            updated_at: new Date().toISOString()
          })
          .eq('id', body.enrollment_id)
          .select()
          .single()

        if (error) {
          logger.error('Error cancelling enrollment', { enrollmentId: body.enrollment_id, error: error.message })
          await logError(supabaseAdmin, ctx, new Error(error.message), body as unknown as Record<string, unknown>)
          return new Response(
            JSON.stringify({ error: 'حدث خطأ أثناء إلغاء التسجيل' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        await logActivity(supabaseAdmin, ctx, { status: 'cancelled', previousStatus, softDeleted: true })
        logger.info('Enrollment cancelled (soft deleted)', { enrollmentId: data.id, previousStatus, duration_ms: Date.now() - startTime })
        result = { enrollment: data, message: 'تم إلغاء التسجيل' }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'إجراء غير معروف' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    logger.info('Request completed successfully', { userId, action: body.action, duration_ms: Date.now() - startTime })

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    logger.error('Unhandled error in process-enrollment', { 
      error: errorMessage,
      stack: errorStack,
      duration_ms: Date.now() - startTime 
    })

    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
