import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Brain, Plus, Edit, Trash2, BookOpen, Video, 
  Users, Calendar, ArrowRight, Loader2, Upload, Image, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

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
  duration: string | null;
  video_url: string | null;
  order_index: number;
  is_free: boolean | null;
  course_id: string;
}

const DoctorDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isDoctor, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Course form
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    duration: '',
    category: '',
    image_url: '',
    is_featured: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Lesson form
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    duration: '',
    video_url: '',
    is_free: false,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && !isDoctor && user) {
      toast.error('ليس لديك صلاحية الوصول لهذه الصفحة');
      navigate('/profile');
    }
  }, [roleLoading, isDoctor, user, navigate]);

  useEffect(() => {
    if (isDoctor) {
      fetchCourses();
    }
  }, [isDoctor]);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('حدث خطأ أثناء تحميل الكورسات');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setCourseForm({ ...courseForm, image_url: '' });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `courses/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('course-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast.error('حجم الفيديو يجب أن يكون أقل من 500 ميجابايت');
        return;
      }
      setVideoFile(file);
      setVideoPreview(file.name);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setLessonForm({ ...lessonForm, video_url: '' });
  };

  const uploadVideo = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `lessons/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('lesson-videos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('lesson-videos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSaveCourse = async () => {
    if (!courseForm.title.trim()) {
      toast.error('عنوان الكورس مطلوب');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = courseForm.image_url;

      // Upload new image if selected
      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImage(imageFile) || '';
        setUploadingImage(false);
      }

      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update({
            title: courseForm.title,
            description: courseForm.description || null,
            duration: courseForm.duration || null,
            category: courseForm.category || null,
            image_url: imageUrl || null,
            is_featured: courseForm.is_featured,
          })
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast.success('تم تحديث الكورس بنجاح');
      } else {
        const { error } = await supabase
          .from('courses')
          .insert({
            title: courseForm.title,
            description: courseForm.description || null,
            duration: courseForm.duration || null,
            category: courseForm.category || null,
            image_url: imageUrl || null,
            is_featured: courseForm.is_featured,
          });

        if (error) throw error;
        toast.success('تم إنشاء الكورس بنجاح');
      }

      setCourseDialogOpen(false);
      resetCourseForm();
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('حدث خطأ أثناء حفظ الكورس');
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكورس؟')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      toast.success('تم حذف الكورس بنجاح');
      fetchCourses();
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
        setLessons([]);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('حدث خطأ أثناء حذف الكورس');
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim() || !selectedCourse) {
      toast.error('عنوان الدرس مطلوب');
      return;
    }

    setSaving(true);
    try {
      let videoUrl = lessonForm.video_url;

      // Upload new video if selected
      if (videoFile) {
        setUploadingVideo(true);
        videoUrl = await uploadVideo(videoFile) || '';
        setUploadingVideo(false);
      }

      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update({
            title: lessonForm.title,
            description: lessonForm.description || null,
            duration: lessonForm.duration || null,
            video_url: videoUrl || null,
            is_free: lessonForm.is_free,
          })
          .eq('id', editingLesson.id);

        if (error) throw error;
        toast.success('تم تحديث الدرس بنجاح');
      } else {
        const { error } = await supabase
          .from('lessons')
          .insert({
            title: lessonForm.title,
            description: lessonForm.description || null,
            duration: lessonForm.duration || null,
            video_url: videoUrl || null,
            is_free: lessonForm.is_free,
            course_id: selectedCourse.id,
            order_index: lessons.length,
          });

        if (error) throw error;
        toast.success('تم إنشاء الدرس بنجاح');

        // Update lessons count
        await supabase
          .from('courses')
          .update({ lessons_count: lessons.length + 1 })
          .eq('id', selectedCourse.id);
      }

      setLessonDialogOpen(false);
      resetLessonForm();
      fetchLessons(selectedCourse.id);
      fetchCourses();
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error('حدث خطأ أثناء حفظ الدرس');
    } finally {
      setSaving(false);
      setUploadingVideo(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدرس؟') || !selectedCourse) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      toast.success('تم حذف الدرس بنجاح');
      fetchLessons(selectedCourse.id);

      // Update lessons count
      await supabase
        .from('courses')
        .update({ lessons_count: lessons.length - 1 })
        .eq('id', selectedCourse.id);
      
      fetchCourses();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('حدث خطأ أثناء حذف الدرس');
    }
  };

  const resetCourseForm = () => {
    setEditingCourse(null);
    setCourseForm({
      title: '',
      description: '',
      duration: '',
      category: '',
      image_url: '',
      is_featured: false,
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const resetLessonForm = () => {
    setEditingLesson(null);
    setLessonForm({
      title: '',
      description: '',
      duration: '',
      video_url: '',
      is_free: false,
    });
    setVideoFile(null);
    setVideoPreview(null);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      duration: course.duration || '',
      category: course.category || '',
      image_url: course.image_url || '',
      is_featured: course.is_featured || false,
    });
    setImageFile(null);
    setImagePreview(course.image_url || null);
    setCourseDialogOpen(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      duration: lesson.duration || '',
      video_url: lesson.video_url || '',
      is_free: lesson.is_free || false,
    });
    setVideoFile(null);
    setVideoPreview(lesson.video_url ? lesson.video_url.split('/').pop() || 'فيديو محفوظ' : null);
    setLessonDialogOpen(true);
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">لوحة تحكم الدكتور</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/doctor-consultations">
              <Button variant="hero">
                <Calendar className="w-4 h-4 ml-2" />
                الاستشارات
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline">الملف الشخصي</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Courses List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  الكورسات
                </h2>
                <Dialog open={courseDialogOpen} onOpenChange={(open) => {
                  setCourseDialogOpen(open);
                  if (!open) resetCourseForm();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="hero">
                      <Plus className="w-4 h-4 ml-1" />
                      كورس جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCourse ? 'تعديل الكورس' : 'إنشاء كورس جديد'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>عنوان الكورس *</Label>
                        <Input
                          value={courseForm.title}
                          onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                          placeholder="أدخل عنوان الكورس"
                        />
                      </div>
                      <div>
                        <Label>الوصف</Label>
                        <Textarea
                          value={courseForm.description}
                          onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                          placeholder="وصف مختصر للكورس"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>المدة</Label>
                          <Input
                            value={courseForm.duration}
                            onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                            placeholder="مثال: 8 ساعات"
                          />
                        </div>
                        <div>
                          <Label>التصنيف</Label>
                          <Select
                            value={courseForm.category}
                            onValueChange={(value) => setCourseForm({ ...courseForm, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر التصنيف" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="علاج نفسي">علاج نفسي</SelectItem>
                              <SelectItem value="تنمية ذاتية">تنمية ذاتية</SelectItem>
                              <SelectItem value="علاقات">علاقات</SelectItem>
                              <SelectItem value="صحة نفسية">صحة نفسية</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>صورة الكورس</Label>
                        {imagePreview ? (
                          <div className="relative mt-2">
                            <img
                              src={imagePreview}
                              alt="معاينة الصورة"
                              className="w-full h-40 object-cover rounded-lg border border-border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 left-2 w-8 h-8"
                              onClick={removeImage}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mt-2">
                            <div className="flex flex-col items-center justify-center py-4">
                              <Image className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">اضغط لرفع صورة</p>
                              <p className="text-xs text-muted-foreground mt-1">PNG, JPG حتى 5MB</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>كورس مميز</Label>
                        <Switch
                          checked={courseForm.is_featured}
                          onCheckedChange={(checked) => setCourseForm({ ...courseForm, is_featured: checked })}
                        />
                      </div>
                      <Button
                        className="w-full"
                        variant="hero"
                        onClick={handleSaveCourse}
                        disabled={saving || uploadingImage}
                      >
                        {saving || uploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        ) : null}
                        {uploadingImage ? 'جاري رفع الصورة...' : editingCourse ? 'تحديث' : 'إنشاء'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {courses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد كورسات بعد
                  </p>
                ) : (
                  courses.map((course) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedCourse?.id === course.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedCourse(course)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{course.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {course.lessons_count || 0} درس
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCourse(course);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCourse(course.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Lessons Panel */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl border border-border p-6">
              {selectedCourse ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Video className="w-5 h-5 text-primary" />
                        دروس: {selectedCourse.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {lessons.length} درس
                      </p>
                    </div>
                    <Dialog open={lessonDialogOpen} onOpenChange={(open) => {
                      setLessonDialogOpen(open);
                      if (!open) resetLessonForm();
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="hero">
                          <Plus className="w-4 h-4 ml-1" />
                          درس جديد
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {editingLesson ? 'تعديل الدرس' : 'إضافة درس جديد'}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>عنوان الدرس *</Label>
                            <Input
                              value={lessonForm.title}
                              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                              placeholder="أدخل عنوان الدرس"
                            />
                          </div>
                          <div>
                            <Label>الوصف</Label>
                            <Textarea
                              value={lessonForm.description}
                              onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                              placeholder="وصف مختصر للدرس"
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label>المدة</Label>
                            <Input
                              value={lessonForm.duration}
                              onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                              placeholder="مثال: 15 دقيقة"
                            />
                          </div>
                          <div>
                            <Label>فيديو الدرس</Label>
                            {videoPreview ? (
                              <div className="flex items-center gap-3 mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                                <Video className="w-8 h-8 text-primary" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{videoPreview}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB` : 'فيديو محفوظ'}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="w-8 h-8 shrink-0"
                                  onClick={removeVideo}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mt-2">
                                <div className="flex flex-col items-center justify-center py-4">
                                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                  <p className="text-sm text-muted-foreground">اضغط لرفع فيديو</p>
                                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV حتى 500MB</p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="video/*"
                                  onChange={handleVideoChange}
                                />
                              </label>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>درس مجاني</Label>
                            <Switch
                              checked={lessonForm.is_free}
                              onCheckedChange={(checked) => setLessonForm({ ...lessonForm, is_free: checked })}
                            />
                          </div>
                          <Button
                            className="w-full"
                            variant="hero"
                            onClick={handleSaveLesson}
                            disabled={saving || uploadingVideo}
                          >
                            {saving || uploadingVideo ? (
                              <Loader2 className="w-4 h-4 animate-spin ml-2" />
                            ) : null}
                            {uploadingVideo ? 'جاري رفع الفيديو...' : editingLesson ? 'تحديث' : 'إضافة'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-3">
                    {lessons.length === 0 ? (
                      <div className="text-center py-12">
                        <Video className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          لا توجد دروس في هذا الكورس بعد
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setLessonDialogOpen(true)}
                        >
                          <Plus className="w-4 h-4 ml-1" />
                          أضف أول درس
                        </Button>
                      </div>
                    ) : (
                      lessons.map((lesson, index) => (
                        <motion.div
                          key={lesson.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 transition-all"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{lesson.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              {lesson.duration && (
                                <span className="text-sm text-muted-foreground">
                                  {lesson.duration}
                                </span>
                              )}
                              {lesson.is_free && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  مجاني
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEditLesson(lesson)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteLesson(lesson.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    اختر كورس لعرض دروسه
                  </h3>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    أو قم بإنشاء كورس جديد من القائمة الجانبية
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
