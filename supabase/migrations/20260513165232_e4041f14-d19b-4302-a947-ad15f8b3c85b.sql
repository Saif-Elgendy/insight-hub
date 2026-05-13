
-- 1) Private schema for RLS helpers
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION private.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;
CREATE OR REPLACE FUNCTION private.can_manage_courses(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','instructor'))
$$;
CREATE OR REPLACE FUNCTION private.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;
CREATE OR REPLACE FUNCTION private.is_consultation_participant(_user_id uuid, _consultation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = _consultation_id
      AND (c.user_id = _user_id
           OR c.specialist_id IN (SELECT s.id FROM public.specialists s WHERE s.user_id = _user_id))
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_any_role(uuid, public.app_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_manage_courses(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_user_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_consultation_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_courses(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_consultation_participant(uuid, uuid) TO authenticated;

-- 2) Recreate public table policies
DROP POLICY IF EXISTS "Admins can view all activity_logs" ON public.activity_logs;
CREATE POLICY "Admins can view all activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Participants can update chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can view chat messages" ON public.chat_messages;
CREATE POLICY "Participants can view chat messages" ON public.chat_messages FOR SELECT TO authenticated USING (private.is_consultation_participant(auth.uid(), consultation_id));
CREATE POLICY "Participants can send chat messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid()=sender_id AND private.is_consultation_participant(auth.uid(), consultation_id));
CREATE POLICY "Participants can update chat messages" ON public.chat_messages FOR UPDATE TO authenticated USING (private.is_consultation_participant(auth.uid(), consultation_id));

DROP POLICY IF EXISTS "Admins can update consultant requests" ON public.consultant_requests;
DROP POLICY IF EXISTS "Admins can view all consultant requests" ON public.consultant_requests;
CREATE POLICY "Admins can update consultant requests" ON public.consultant_requests FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all consultant requests" ON public.consultant_requests FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can delete course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Admins can manage course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Admins can update course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Enrolled users or instructors can view course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Instructors can delete own course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Instructors can insert own course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Instructors can update own course materials" ON public.course_materials;
CREATE POLICY "Admins can delete course materials" ON public.course_materials FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can manage course materials" ON public.course_materials FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update course materials" ON public.course_materials FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Enrolled users or instructors can view course materials" ON public.course_materials FOR SELECT TO authenticated USING (
  private.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_materials.course_id AND c.instructor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_materials.course_id AND e.user_id = auth.uid() AND e.status='active'::enrollment_status AND e.deleted_at IS NULL)
);
CREATE POLICY "Instructors can delete own course materials" ON public.course_materials FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'instructor') AND course_id IN (SELECT id FROM public.courses WHERE instructor_id=auth.uid()));
CREATE POLICY "Instructors can insert own course materials" ON public.course_materials FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'instructor') AND course_id IN (SELECT id FROM public.courses WHERE instructor_id=auth.uid()));
CREATE POLICY "Instructors can update own course materials" ON public.course_materials FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'instructor') AND course_id IN (SELECT id FROM public.courses WHERE instructor_id=auth.uid()));

DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can insert own courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can delete own courses" ON public.courses;
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can insert own courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'instructor') AND instructor_id=auth.uid());
CREATE POLICY "Instructors can update own courses" ON public.courses FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'instructor') AND instructor_id=auth.uid());
CREATE POLICY "Instructors can delete own courses" ON public.courses FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'instructor') AND instructor_id=auth.uid());

DROP POLICY IF EXISTS "Admins can update any enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors can view own course enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.enrollments;
CREATE POLICY "Admins can update any enrollment" ON public.enrollments FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can view own course enrollments" ON public.enrollments FOR SELECT TO authenticated USING (
  private.has_role(auth.uid(),'instructor') AND course_id IN (SELECT id FROM public.courses WHERE instructor_id=auth.uid()) AND deleted_at IS NULL
);
CREATE POLICY "Users can update their own enrollments" ON public.enrollments
FOR UPDATE TO authenticated
USING (auth.uid()=user_id AND status='pending'::enrollment_status AND deleted_at IS NULL)
WITH CHECK (auth.uid()=user_id AND status='pending'::enrollment_status AND paid_at IS NULL AND deleted_at IS NULL AND deleted_by IS NULL);

DROP POLICY IF EXISTS "Admins can view error_logs" ON public.error_logs;
CREATE POLICY "Admins can view error_logs" ON public.error_logs FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can update instructor requests" ON public.instructor_requests;
DROP POLICY IF EXISTS "Admins can view all instructor requests" ON public.instructor_requests;
CREATE POLICY "Admins can update instructor requests" ON public.instructor_requests FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all instructor requests" ON public.instructor_requests FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Instructors can insert own course lessons" ON public.lessons;
DROP POLICY IF EXISTS "Instructors can update own course lessons" ON public.lessons;
DROP POLICY IF EXISTS "Instructors can delete own course lessons" ON public.lessons;
DROP POLICY IF EXISTS "Instructors can view own course lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can insert lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can view all lessons" ON public.lessons;
CREATE POLICY "Admins can view all lessons" ON public.lessons FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert lessons" ON public.lessons FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update lessons" ON public.lessons FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete lessons" ON public.lessons FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can view own course lessons" ON public.lessons FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'instructor') AND course_id IN (SELECT id FROM public.courses WHERE instructor_id=auth.uid()));
CREATE POLICY "Instructors can insert own course lessons" ON public.lessons FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'instructor') AND course_id IN (SELECT id FROM public.courses WHERE instructor_id=auth.uid()));
CREATE POLICY "Instructors can update own course lessons" ON public.lessons FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'instructor') AND course_id IN (SELECT id FROM public.courses WHERE instructor_id=auth.uid()));
CREATE POLICY "Instructors can delete own course lessons" ON public.lessons FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'instructor') AND course_id IN (SELECT id FROM public.courses WHERE instructor_id=auth.uid()));

DROP POLICY IF EXISTS "Admins can view all medical records" ON public.patient_medical_records;
CREATE POLICY "Admins can view all medical records" ON public.patient_medical_records FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Instructors can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can view enrolled student profiles" ON public.profiles FOR SELECT TO authenticated USING (
  private.has_role(auth.uid(),'instructor') AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.user_id = profiles.user_id AND c.instructor_id = auth.uid() AND e.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Admins can update resources" ON public.resource_library;
DROP POLICY IF EXISTS "Instructors can insert resources" ON public.resource_library;
DROP POLICY IF EXISTS "Admins can insert resources" ON public.resource_library;
DROP POLICY IF EXISTS "Instructors can delete own resources" ON public.resource_library;
DROP POLICY IF EXISTS "Instructors can update own resources" ON public.resource_library;
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resource_library;
CREATE POLICY "Admins can update resources" ON public.resource_library FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert resources" ON public.resource_library FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete resources" ON public.resource_library FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can insert resources" ON public.resource_library FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'instructor') AND uploaded_by=auth.uid());
CREATE POLICY "Instructors can delete own resources" ON public.resource_library FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'instructor') AND uploaded_by=auth.uid());
CREATE POLICY "Instructors can update own resources" ON public.resource_library FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'instructor') AND uploaded_by=auth.uid());

DROP POLICY IF EXISTS "Admins can view all reviews" ON public.specialist_reviews;
CREATE POLICY "Admins can view all reviews" ON public.specialist_reviews FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update any user role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete any user role" ON public.user_roles;
CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update any user role" ON public.user_roles FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete any user role" ON public.user_roles FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can view all violations" ON public.violations;
CREATE POLICY "Admins can view all violations" ON public.violations FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- 3) Consultations: scope to authenticated only
DROP POLICY IF EXISTS "Specialists can update their consultations" ON public.consultations;
DROP POLICY IF EXISTS "Specialists can view their consultations" ON public.consultations;
DROP POLICY IF EXISTS "Users can update their own consultations" ON public.consultations;
DROP POLICY IF EXISTS "Users can view their own consultations" ON public.consultations;
CREATE POLICY "Specialists can view their consultations" ON public.consultations FOR SELECT TO authenticated USING (specialist_id IN (SELECT id FROM public.specialists WHERE user_id=auth.uid()));
CREATE POLICY "Specialists can update their consultations" ON public.consultations FOR UPDATE TO authenticated USING (specialist_id IN (SELECT id FROM public.specialists WHERE user_id=auth.uid()));
CREATE POLICY "Users can view their own consultations" ON public.consultations FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Users can update their own consultations" ON public.consultations FOR UPDATE TO authenticated USING (auth.uid()=user_id);

-- 4) Storage policies: drop and recreate using private.*
DROP POLICY IF EXISTS "Admins can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete course images" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can upload lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload course materials files" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can upload course materials files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete course materials files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own consultant documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner or admin can view consultant documents" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled users or instructors can view lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled users or instructors can view course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update own lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete own lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete own course materials files" ON storage.objects;
DROP POLICY IF EXISTS "Participants can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Participants can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Participants can delete chat attachments" ON storage.objects;

CREATE POLICY "Admins can upload course images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='course-images' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can upload course images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='course-images' AND private.has_role(auth.uid(),'instructor'));
CREATE POLICY "Admins can update course images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='course-images' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can update course images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='course-images' AND private.has_role(auth.uid(),'instructor'));
CREATE POLICY "Admins can delete course images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='course-images' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can delete course images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='course-images' AND private.has_role(auth.uid(),'instructor'));

CREATE POLICY "Admins can upload lesson videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='lesson-videos' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can upload lesson videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='lesson-videos' AND private.has_role(auth.uid(),'instructor'));
CREATE POLICY "Admins can update lesson videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='lesson-videos' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete lesson videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='lesson-videos' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can update own lesson videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='lesson-videos' AND private.has_role(auth.uid(),'instructor') AND owner=auth.uid());
CREATE POLICY "Instructors can delete own lesson videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='lesson-videos' AND private.has_role(auth.uid(),'instructor') AND owner=auth.uid());

CREATE POLICY "Admins can upload course materials files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='course-materials' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can upload course materials files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='course-materials' AND private.has_role(auth.uid(),'instructor'));
CREATE POLICY "Admins can delete course materials files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='course-materials' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Instructors can delete own course materials files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='course-materials' AND private.has_role(auth.uid(),'instructor') AND owner=auth.uid());

CREATE POLICY "Users can view their own consultant documents" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='consultant-documents' AND ((auth.uid())::text = (storage.foldername(name))[1] OR private.has_role(auth.uid(),'admin'))
);
CREATE POLICY "Owner or admin can view consultant documents" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='consultant-documents' AND ((storage.foldername(name))[1] = (auth.uid())::text OR private.has_role(auth.uid(),'admin'))
);

CREATE POLICY "Enrolled users or instructors can view lesson videos" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='lesson-videos' AND (
    private.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.lessons l WHERE l.video_url LIKE '%/' || objects.name AND l.is_free = true)
    OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.courses c ON c.id=l.course_id WHERE l.video_url LIKE '%/' || objects.name AND c.instructor_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.enrollments e ON e.course_id=l.course_id WHERE l.video_url LIKE '%/' || objects.name AND e.user_id=auth.uid() AND e.status='active'::enrollment_status AND e.deleted_at IS NULL)
  )
);
CREATE POLICY "Enrolled users or instructors can view course materials" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='course-materials' AND (
    private.has_role(auth.uid(),'admin')
    OR (storage.foldername(name))[1] = 'library'
    OR ((storage.foldername(name))[1] = 'courses' AND (
      EXISTS (SELECT 1 FROM public.courses c WHERE c.id = ((storage.foldername(objects.name))[2])::uuid AND c.instructor_id=auth.uid())
      OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = ((storage.foldername(objects.name))[2])::uuid AND e.user_id=auth.uid() AND e.status='active'::enrollment_status AND e.deleted_at IS NULL)
    ))
  )
);

-- chat-attachments: view, upload, delete
CREATE POLICY "Participants can view chat attachments" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='chat-attachments' AND private.is_consultation_participant(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Participants can upload chat attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='chat-attachments' AND private.is_consultation_participant(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "Participants can delete chat attachments" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='chat-attachments' AND owner = auth.uid()
);

-- 5) Update sanitize/prevent functions to use private.has_role then drop public helpers
CREATE OR REPLACE FUNCTION public.sanitize_user_enrollment_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR private.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  NEW.status := 'pending'::enrollment_status;
  NEW.paid_at := NULL;
  NEW.deleted_at := NULL;
  NEW.deleted_by := NULL;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.prevent_user_enrollment_privilege_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR private.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by THEN
    RAISE EXCEPTION 'Not allowed to modify enrollment status, payment, or deletion fields';
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.sanitize_user_course_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total int; v_done int;
BEGIN
  IF auth.role() = 'service_role' OR private.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN NEW.certificate_issued := false;
  ELSE NEW.certificate_issued := COALESCE(OLD.certificate_issued, false); END IF;
  SELECT COUNT(*) INTO v_total FROM public.lessons WHERE course_id = NEW.course_id;
  v_done := COALESCE(array_length(NEW.completed_lesson_ids, 1), 0);
  NEW.total_lessons := v_total;
  NEW.completed_lessons := v_done;
  IF v_total > 0 AND v_done >= v_total THEN
    NEW.is_completed := true;
    IF NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  ELSE
    NEW.is_completed := false;
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_any_role(uuid, public.app_role[]);
DROP FUNCTION IF EXISTS public.can_manage_courses(uuid);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.is_consultation_participant(uuid, uuid);

-- 6) Revoke EXECUTE on remaining definer trigger/utility functions
REVOKE EXECUTE ON FUNCTION public.auto_expire_consultations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sanitize_user_enrollment_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_user_enrollment_privilege_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sanitize_user_course_progress() FROM PUBLIC, anon, authenticated;
