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
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
}

const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
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
      // Set first lesson as active by default
      if (lessonsData && lessonsData.length > 0) {
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
      .select('completed_lessons, total_lessons, is_completed')
      .eq('user_id', user.id)
      .eq('course_id', id)
      .maybeSingle();

    if (!error && data) {
      setProgress(data);
    }
  };

  const handleStartCourse = async () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول للبدء في الكورس');
      navigate('/auth');
      return;
    }

    // Check if progress already exists
    const { data: existingProgress } = await supabase
      .from('course_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', id)
      .maybeSingle();

    if (!existingProgress) {
      // Create new progress record
      const { error } = await supabase
        .from('course_progress')
        .insert({
          user_id: user.id,
          course_id: id!,
          total_lessons: lessons.length,
          completed_lessons: 0,
        });

      if (error) {
        console.error('Error creating progress:', error);
        toast.error('حدث خطأ');
        return;
      }

      toast.success('تم تسجيلك في الكورس!');
      fetchProgress();
    }
  };

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
    return lesson.is_free || (user && progress);
  };

  const selectLesson = (lesson: Lesson) => {
    if (canAccessLesson(lesson)) {
      setActiveLesson(lesson);
    } else {
      toast.error('يرجى التسجيل في الكورس للوصول لهذا الدرس');
    }
  };

  const progressPercentage = progress 
    ? ((progress.completed_lessons || 0) / (progress.total_lessons || 1)) * 100 
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

                {!progress ? (
                  <Button 
                    size="lg" 
                    variant="hero-outline"
                    onClick={handleStartCourse}
                    aria-label="ابدأ الكورس الآن"
                  >
                    ابدأ الكورس مجاناً
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-primary-foreground text-sm">
                      <span>تقدمك في الكورس</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-3 bg-primary-foreground/20" />
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
                  <div className="aspect-video rounded-2xl overflow-hidden shadow-elevated bg-foreground/10">
                    <iframe
                      src={activeLesson.video_url || ''}
                      title={activeLesson.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
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
                            ${canAccessLesson(lesson) 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-muted text-muted-foreground'
                            }
                          `}>
                            {canAccessLesson(lesson) ? (
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
                                <Button
                                  size="sm"
                                  variant={canAccessLesson(lesson) ? 'default' : 'outline'}
                                  onClick={() => selectLesson(lesson)}
                                  disabled={!canAccessLesson(lesson)}
                                  className="mr-14"
                                  aria-label={canAccessLesson(lesson) ? `مشاهدة ${lesson.title}` : 'يرجى التسجيل أولاً'}
                                >
                                  {canAccessLesson(lesson) ? 'مشاهدة الدرس' : 'يرجى التسجيل'}
                                </Button>
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
                  {!progress && (
                    <div className="bg-gradient-hero rounded-2xl p-6 text-primary-foreground">
                      <h3 className="font-bold text-xl mb-2">ابدأ رحلتك الآن</h3>
                      <p className="text-primary-foreground/80 text-sm mb-4">
                        انضم لأكثر من 500 طالب وابدأ تعلم هذا الكورس
                      </p>
                      <Button 
                        variant="hero-outline" 
                        className="w-full"
                        onClick={handleStartCourse}
                        aria-label="التسجيل في الكورس"
                      >
                        سجل الآن مجاناً
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CourseDetails;