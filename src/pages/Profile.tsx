import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Brain, User, Mail, Phone, Edit2, Save, LogOut, 
  BookOpen, Award, Clock, ChevronLeft, ArrowLeft, Lock, Eye, EyeOff, Camera, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface CourseProgress {
  id: string;
  course_id: string;
  completed_lessons: number;
  total_lessons: number;
  is_completed: boolean;
  started_at: string;
  courses: {
    title: string;
    category: string;
    image_url: string | null;
  } | null;
}

const ProfilePage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
  });
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCourseProgress();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          bio: data.bio || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('course_progress')
        .select(`
          *,
          courses (
            title,
            category,
            image_url
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      setCourseProgress(data || []);
    } catch (error) {
      console.error('Error fetching course progress:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          bio: formData.bio,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile({ ...profile!, ...formData });
      setIsEditing(false);
      toast.success('تم حفظ التغييرات بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    toast.success('تم تسجيل الخروج بنجاح');
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success('تم تغيير كلمة المرور بنجاح');
      setIsChangingPassword(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('يرجى اختيار صورة بصيغة JPEG أو PNG أو WebP أو GIF');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('تم تحديث الصورة الشخصية بنجاح');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const completedCourses = courseProgress.filter(p => p.is_completed).length;
  const totalHours = courseProgress.reduce((acc, p) => acc + (p.completed_lessons * 0.5), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-hero text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">نفسي</span>
            </Link>
            <Button
              variant="hero-outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar with Upload */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-primary-foreground/20 flex items-center justify-center text-4xl font-bold overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="الصورة الشخصية" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  formData.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'م'
                )}
              </div>
              
              {/* Upload overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            
            <div className="text-center md:text-right">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {formData.full_name || 'مستخدم جديد'}
              </h1>
              <p className="text-primary-foreground/80">{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg mx-auto md:mx-0">
            <div className="bg-primary-foreground/10 rounded-xl p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2" />
              <div className="text-2xl font-bold">{courseProgress.length}</div>
              <div className="text-sm text-primary-foreground/70">كورس مسجل</div>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl p-4 text-center">
              <Award className="w-6 h-6 mx-auto mb-2" />
              <div className="text-2xl font-bold">{completedCourses}</div>
              <div className="text-sm text-primary-foreground/70">شهادة</div>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2" />
              <div className="text-2xl font-bold">{totalHours}</div>
              <div className="text-sm text-primary-foreground/70">ساعة تعلم</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl shadow-card p-6 border border-border/50"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">المعلومات الشخصية</h2>
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 ml-2" />
                    حفظ
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  {isEditing ? (
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="أدخل اسمك"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-foreground p-2 bg-muted rounded-lg">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{formData.full_name || 'لم يتم التحديد'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <div className="flex items-center gap-2 text-foreground p-2 bg-muted rounded-lg">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span dir="ltr">{user?.email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  {isEditing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+966 5X XXX XXXX"
                      dir="ltr"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-foreground p-2 bg-muted rounded-lg">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span dir="ltr">{formData.phone || 'لم يتم التحديد'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>نبذة عنك</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="اكتب نبذة قصيرة عنك..."
                      rows={4}
                    />
                  ) : (
                    <div className="text-foreground p-2 bg-muted rounded-lg min-h-[80px]">
                      {formData.bio || 'لم يتم إضافة نبذة بعد'}
                    </div>
                  )}
                </div>

                {/* Password Change Section */}
                <div className="pt-4 border-t border-border">
                  {!isChangingPassword ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      <Lock className="w-4 h-4" />
                      تغيير كلمة المرور
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        تغيير كلمة المرور
                      </h3>
                      
                      <div className="space-y-2">
                        <Label>كلمة المرور الجديدة</Label>
                        <div className="relative">
                          <Input
                            type={showPasswords.new ? 'text' : 'password'}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            placeholder="أدخل كلمة المرور الجديدة"
                            className="pl-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>تأكيد كلمة المرور الجديدة</Label>
                        <div className="relative">
                          <Input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder="أعد إدخال كلمة المرور الجديدة"
                            className="pl-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={handlePasswordChange}
                          disabled={savingPassword}
                        >
                          {savingPassword ? 'جاري الحفظ...' : 'حفظ'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsChangingPassword(false);
                            setPasswordData({ newPassword: '', confirmPassword: '' });
                          }}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Courses Progress */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-bold text-foreground mb-6">كورساتي</h2>

              {courseProgress.length === 0 ? (
                <div className="bg-card rounded-2xl shadow-card p-8 text-center border border-border/50">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">لم تسجل في أي كورس بعد</h3>
                  <p className="text-muted-foreground mb-6">
                    ابدأ رحلتك التعليمية الآن واكتشف كورساتنا المميزة
                  </p>
                  <Button variant="hero" asChild>
                    <Link to="/#courses">
                      استكشف الكورسات
                      <ChevronLeft className="w-4 h-4 mr-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {courseProgress.map((progress) => (
                    <div
                      key={progress.id}
                      className="bg-card rounded-2xl shadow-card p-6 border border-border/50 hover:shadow-elevated transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-xl bg-gradient-hero flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-foreground">
                                {progress.courses?.title || 'كورس'}
                              </h3>
                              <span className="text-sm text-primary">
                                {progress.courses?.category}
                              </span>
                            </div>
                            {progress.is_completed && (
                              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                مكتمل
                              </span>
                            )}
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">
                                {progress.completed_lessons} من {progress.total_lessons} درس
                              </span>
                              <span className="font-medium text-foreground">
                                {progress.total_lessons > 0
                                  ? Math.round((progress.completed_lessons / progress.total_lessons) * 100)
                                  : 0}%
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-hero rounded-full transition-all duration-500"
                                style={{
                                  width: `${progress.total_lessons > 0
                                    ? (progress.completed_lessons / progress.total_lessons) * 100
                                    : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
