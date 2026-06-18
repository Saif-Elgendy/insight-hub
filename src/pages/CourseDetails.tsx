import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Lock, 
  Clock, 
  Users, 
  Star, 
  BookOpen, 
  CheckCircle, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
  FileText,
  Download,
  Video,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getSignedUrl } from '@/lib/storage';
import { useEnrollment } from '@/hooks/useEnrollment';
import { useUserRole } from '@/hooks/useUserRole';
import { MaterialUploadDialog } from '@/components/materials/MaterialUploadDialog';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Lesson player uses the unified VideoPlayer which supports YouTube, Vimeo,
// Google Drive, Dailymotion, Facebook, direct mp4/webm/ogg and Supabase Storage paths.

async function openMaterial(url: string) {
  const isYoutube = /youtu\.?be/.test(url);
  if (isYoutube || !url.includes('/course-materials/')) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const signed = await getSignedUrl('course-materials', url);
  if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
  else toast.error('تعذر فتح الملف. تأكد من تسجيلك في الكورس.');
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  category: string | null;
  image_url: string | null;
  lessons_count: number | null;
  is_featured: boolean | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration: string | null;
  order_index: number;
  is_free: boolean | null;
}

interface CourseProgress {
  completed_lessons: number | null;
  total_lessons: number | null;
  is_completed: boolean | null;
  last_lesson_id: string | null;
  completed_lesson_ids: string[] | null;
}

interface CourseMaterial {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  youtube_url: string | null;
}

const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageCourses } = useUserRole();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<CourseMaterial | null>(null);

  const { enrollment, isEnrolled, isPending, enroll, activateEnrollment, loading: enrollmentLoading } = useEnrollment(id);

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
      fetchMaterials();
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      fetchProgress();
    }
  }, [user, id]);

  const fetchCourseDetails = async () => {
    setLoading(true);
    
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      toast.error('حدث خطأ في تحميل الكورس');
      navigate('/');
      return;
    }

    if (!courseData) {
      toast.error('الكورس غير موجود');
      navigate('/');
      return;
    }

    setCourse(courseData);

    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', id)
      .order('order_index');

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
    } else {
      setLessons(lessonsData || []);
      // Default active lesson — will be overridden by Resume effect if progress exists
      if (lessonsData && lessonsData.length > 0 && !activeLesson) {
        const firstFreeLesson = lessonsData.find(l => l.is_free);
        setActiveLesson(firstFreeLesson || lessonsData[0]);
      }
    }

    setLoading(false);
  };

  const fetchProgress = async () => {
    if (!user || !id) return;

    const { data, error } = await supabase
      .from('course_progress')
      .select('completed_lessons, total_lessons, is_completed, last_lesson_id, completed_lesson_ids')
      .eq('user_id', user.id)
      .eq('course_id', id)
      .maybeSingle();

    if (!error && data) {
      setProgress(data as CourseProgress);
    }
  };

  const fetchMaterials = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('course_materials')
      .select('id, title, description, file_url, file_type, file_size, youtube_url')
      .eq('course_id', id)
      .order('created_at', { ascending: false });

    if (!error) {
      setMaterials(data || []);
    }
  };

  const handleDeleteMaterial = async (material: CourseMaterial) => {
    if (!confirm('هل تريد حذف هذا الملف؟')) return;
    setDeletingMaterialId(material.id);
    try {
      if (material.file_type !== 'youtube' && material.file_url.includes('course-materials')) {
        const path = material.file_url.split('/course-materials/')[1];
        if (path) {
          await supabase.storage.from('course-materials').remove([path]);
        }
      }
      const { error } = await supabase.from('course_materials').delete().eq('id', material.id);
      if (error) throw error;
      toast.success('تم حذف الملف بنجاح');
      fetchMaterials();
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setDeletingMaterialId(null);
    }
  };

  const handleEnrollCourse = async () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول للتسجيل في الكورس');
      navigate('/auth');
      return;
    }

    setEnrolling(true);
    const result = await enroll();
    setEnrolling(false);

    if (result.success) {
      toast.success('تم التسجيل بنجاح! في انتظار تأكيد الدفع');
    } else {
      toast.error(result.error || 'حدث خطأ أثناء التسجيل');
    }
  };

  const handleActivateEnrollment = async () => {
    setEnrolling(true);
    const result = await activateEnrollment();
    setEnrolling(false);

    if (result.success) {
      toast.success('تم تفعيل التسجيل بنجاح!');
      // Create progress record
      if (user && id) {
        await supabase
          .from('course_progress')
          .insert({
            user_id: user.id,
            course_id: id,
            total_lessons: lessons.length,
            completed_lessons: 0,
          });
        fetchProgress();
      }
    } else {
      toast.error(result.error || 'حدث خطأ');
    }
  };

  // Resume: jump to last viewed lesson once both progress and lessons are loaded
  useEffect(() => {
    if (progress?.last_lesson_id && lessons.length > 0) {
      const last = lessons.find(l => l.id === progress.last_lesson_id);
      if (last && canAccessLesson(last)) {
        setActiveLesson(last);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.last_lesson_id, lessons.length, isEnrolled]);

  const toggleLessonExpand = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId);
    } else {
      newExpanded.add(lessonId);
    }
    setExpandedLessons(newExpanded);
  };

  const canAccessLesson = (lesson: Lesson) => {
    return lesson.is_free || (user && isEnrolled);
  };

  const persistLastLesson = async (lessonId: string) => {
    if (!user || !id || !isEnrolled) return;
    const payload = {
      user_id: user.id,
      course_id: id,
      last_lesson_id: lessonId,
      completed_lesson_ids: progress?.completed_lesson_ids ?? [],
    };
    const { error } = await supabase
      .from('course_progress')
      .upsert(payload, { onConflict: 'user_id,course_id' });
    if (!error) {
      setProgress(p => ({
        completed_lessons: p?.completed_lessons ?? 0,
        total_lessons: p?.total_lessons ?? lessons.length,
        is_completed: p?.is_completed ?? false,
        completed_lesson_ids: p?.completed_lesson_ids ?? [],
        last_lesson_id: lessonId,
      }));
    }
  };

  const selectLesson = (lesson: Lesson) => {
    if (canAccessLesson(lesson)) {
      setActiveLesson(lesson);
      persistLastLesson(lesson.id);
    } else {
      toast.error('يرجى التسجيل في الكورس للوصول لهذا الدرس');
    }
  };

  const isLessonCompleted = (lessonId: string) =>
    (progress?.completed_lesson_ids ?? []).includes(lessonId);

  const toggleLessonComplete = async (lesson: Lesson) => {
    if (!user || !id || !isEnrolled) return;
    const current = progress?.completed_lesson_ids ?? [];
    const already = current.includes(lesson.id);
    const next = already
      ? current.filter(x => x !== lesson.id)
      : [...current, lesson.id];

    const { error } = await supabase
      .from('course_progress')
      .upsert(
        {
          user_id: user.id,
          course_id: id,
          last_lesson_id: lesson.id,
          completed_lesson_ids: next,
        },
        { onConflict: 'user_id,course_id' }
      );

    if (error) {
      toast.error('تعذّر تحديث التقدم');
      return;
    }
    toast.success(already ? 'تم إلغاء إكمال الدرس' : 'تم تسجيل الدرس كمكتمل');
    fetchProgress();
  };

  const progressPercentage = progress
    ? ((progress.completed_lessons || 0) / (progress.total_lessons || lessons.length || 1)) * 100
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">جاري التحميل...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-hero py-12 md:py-16">
          <div className="container mx-auto px-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-primary-foreground/80 hover:text-primary-foreground mb-6"
              aria-label="العودة للصفحة الرئيسية"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>

            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary-foreground/20 text-primary-foreground text-sm font-medium mb-4">
                  {course.category || 'كورس مسجل'}
                </span>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                  {course.title}
                </h1>
                <p className="text-primary-foreground/80 text-lg mb-6">
                  {course.description}
                </p>

                <div className="flex flex-wrap items-center gap-6 text-primary-foreground/90 mb-8">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" aria-hidden="true" />
                    <span>{course.duration || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" aria-hidden="true" />
                    <span>{lessons.length} درس</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    <span>4.9</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" aria-hidden="true" />
                    <span>+500 طالب</span>
                  </div>
                </div>

                {!isEnrolled ? (
                  <div className="flex flex-col gap-3">
                    {isPending ? (
                      <>
                        <Badge variant="secondary" className="w-fit text-sm py-1.5 px-4">
                          في انتظار تأكيد الدفع
                        </Badge>
                        <Button 
                          size="lg" 
                          variant="hero-outline"
                          onClick={handleActivateEnrollment}
                          disabled={enrolling}
                          aria-label="تأكيد الدفع"
                        >
                          {enrolling ? (
                            <Loader2 className="w-5 h-5 animate-spin ml-2" />
                          ) : (
                            <CreditCard className="w-5 h-5 ml-2" />
                          )}
                          تأكيد الدفع وتفعيل الكورس
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="lg" 
                        variant="hero-outline"
                        onClick={handleEnrollCourse}
                        disabled={enrolling || enrollmentLoading}
                        aria-label="التسجيل في الكورس"
                      >
                        {enrolling ? (
                          <Loader2 className="w-5 h-5 animate-spin ml-2" />
                        ) : null}
                        التسجيل في الكورس
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Badge variant="default" className="w-fit text-sm py-1.5 px-4 bg-green-600">
                      <CheckCircle className="w-4 h-4 ml-2" />
                      مسجل في الكورس
                    </Badge>
                    {progress && (
                      <>
                        <div className="flex items-center justify-between text-primary-foreground text-sm">
                          <span>
                            تقدمك في الكورس ({progress.completed_lessons || 0} / {progress.total_lessons || lessons.length})
                          </span>
                          <span>{Math.round(progressPercentage)}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-3 bg-primary-foreground/20" />
                      </>
                    )}
                    {progress?.last_lesson_id && (() => {
                      const last = lessons.find(l => l.id === progress.last_lesson_id);
                      if (!last) return null;
                      return (
                        <Button
                          size="sm"
                          variant="hero-outline"
                          onClick={() => selectLesson(last)}
                          className="w-fit"
                        >
                          <Play className="w-4 h-4 ml-2" />
                          متابعة من: {last.title}
                        </Button>
                      );
                    })()}
                  </div>
                )}
              </motion.div>

              {/* Video Player */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                {activeLesson && canAccessLesson(activeLesson) ? (
                  <VideoPlayer url={activeLesson.video_url} title={activeLesson.title} />
                ) : (
                  <div className="aspect-video rounded-2xl overflow-hidden shadow-elevated bg-foreground/10 flex items-center justify-center">
                    <div className="text-center text-primary-foreground/60">
                      <Lock className="w-12 h-12 mx-auto mb-4" aria-hidden="true" />
                      <p>سجل في الكورس لمشاهدة الفيديو</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Lessons Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Lessons List */}
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-foreground mb-6">محتوى الكورس</h2>
                
                <div className="space-y-3">
                  <AnimatePresence>
                    {lessons.map((lesson, index) => (
                      <motion.div
                        key={lesson.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`
                          bg-card rounded-xl border transition-all duration-300
                          ${activeLesson?.id === lesson.id 
                            ? 'border-primary shadow-md' 
                            : 'border-border/50 hover:border-primary/50'
                          }
                        `}
                      >
                        <button
                          type="button"
                          onClick={() => toggleLessonExpand(lesson.id)}
                          className="w-full p-4 flex items-center gap-4 text-right"
                          aria-expanded={expandedLessons.has(lesson.id)}
                          aria-label={`درس ${index + 1}: ${lesson.title}`}
                        >
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center shrink-0
                            ${isLessonCompleted(lesson.id)
                              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                              : canAccessLesson(lesson)
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }
                          `}>
                            {isLessonCompleted(lesson.id) ? (
                              <CheckCircle className="w-4 h-4" aria-hidden="true" />
                            ) : canAccessLesson(lesson) ? (
                              <Play className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Lock className="w-4 h-4" aria-hidden="true" />
                            )}
                          </div>

                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">درس {index + 1}</span>
                              {lesson.is_free && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  مجاني
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-4 h-4" aria-hidden="true" />
                              {lesson.duration}
                            </span>
                            {expandedLessons.has(lesson.id) ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {expandedLessons.has(lesson.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-0">
                                <p className="text-muted-foreground text-sm mb-4 pr-14">
                                  {lesson.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mr-14">
                                  <Button
                                    size="sm"
                                    variant={canAccessLesson(lesson) ? 'default' : 'outline'}
                                    onClick={() => selectLesson(lesson)}
                                    disabled={!canAccessLesson(lesson)}
                                    aria-label={canAccessLesson(lesson) ? `مشاهدة ${lesson.title}` : 'يرجى التسجيل أولاً'}
                                  >
                                    {canAccessLesson(lesson) ? 'مشاهدة الدرس' : 'يرجى التسجيل'}
                                  </Button>
                                  {isEnrolled && canAccessLesson(lesson) && (
                                    <Button
                                      size="sm"
                                      variant={isLessonCompleted(lesson.id) ? 'secondary' : 'outline'}
                                      onClick={() => toggleLessonComplete(lesson)}
                                    >
                                      <CheckCircle className="w-4 h-4 ml-2" />
                                      {isLessonCompleted(lesson.id) ? 'تم الإكمال' : 'تحديد كمكتمل'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-6">
                  {/* Course Info Card */}
                  <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                    <h3 className="font-bold text-foreground mb-4">ماذا ستتعلم؟</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-muted-foreground text-sm">فهم الأساسيات والمفاهيم الرئيسية</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-muted-foreground text-sm">تطبيق التقنيات العملية في حياتك</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-muted-foreground text-sm">تمارين وأنشطة تفاعلية</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-muted-foreground text-sm">شهادة إتمام معتمدة</span>
                      </li>
                    </ul>
                  </div>

                  {/* CTA Card */}
                  {!isEnrolled && !isPending && (
                    <div className="bg-gradient-hero rounded-2xl p-6 text-primary-foreground">
                      <h3 className="font-bold text-xl mb-2">ابدأ رحلتك الآن</h3>
                      <p className="text-primary-foreground/80 text-sm mb-4">
                        انضم لأكثر من 500 طالب وابدأ تعلم هذا الكورس
                      </p>
                      <Button 
                        variant="hero-outline" 
                        className="w-full"
                        onClick={handleEnrollCourse}
                        disabled={enrolling || enrollmentLoading}
                        aria-label="التسجيل في الكورس"
                      >
                        {enrolling ? (
                          <Loader2 className="w-5 h-5 animate-spin ml-2" />
                        ) : null}
                        سجل الآن
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Materials Section */}
        {(materials.length > 0 || canManageCourses) && (
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">المواد التعليمية</h2>
                {canManageCourses && (
                  <Button onClick={() => setUploadOpen(true)} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    إضافة محتوى
                  </Button>
                )}
              </div>

              {materials.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">لا توجد مواد تعليمية بعد</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map((material) => (
                    <div key={material.id} className="bg-card rounded-xl border border-border/50 p-4 hover:shadow-card transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {material.file_type === 'youtube' || material.file_type === 'video' ? (
                            <Video className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{material.title}</h4>
                          {material.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{material.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {material.file_type === 'pdf' ? 'PDF' : material.file_type === 'youtube' ? 'يوتيوب' : material.file_type === 'video' ? 'فيديو' : material.file_type}
                            </Badge>
                            {material.file_size && (
                              <span className="text-xs text-muted-foreground">
                                {(material.file_size / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {material.file_type === 'youtube' || material.file_type === 'video' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => setPreviewMaterial(material)}
                          >
                            <Play className="w-3 h-3" />
                            مشاهدة
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => openMaterial(material.file_url)}
                          >
                            <Download className="w-3 h-3" />
                            تحميل
                          </Button>
                        )}
                        {canManageCourses && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive h-8 w-8"
                            onClick={() => handleDeleteMaterial(material)}
                            disabled={deletingMaterialId === material.id}
                          >
                            {deletingMaterialId === material.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <MaterialUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        courseId={id}
        target="course"
        onSuccess={fetchMaterials}
      />

      <Dialog open={!!previewMaterial} onOpenChange={(o) => !o && setPreviewMaterial(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{previewMaterial?.title}</DialogTitle>
          </DialogHeader>
          {previewMaterial && (
            <div className="p-4 pt-0">
              <VideoPlayer
                url={previewMaterial.youtube_url || previewMaterial.file_url}
                title={previewMaterial.title}
                bucket="course-materials"
              />
              {previewMaterial.description && (
                <p className="text-sm text-muted-foreground mt-3">{previewMaterial.description}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default CourseDetails;