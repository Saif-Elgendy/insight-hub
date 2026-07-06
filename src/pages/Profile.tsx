import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Brain, User, Mail, Phone, Edit2, Save, LogOut, 
  BookOpen, Award, Clock, ChevronLeft, ArrowLeft, Lock, Eye, EyeOff, Camera, Loader2, Trash2,
  GraduationCap, RefreshCw, CheckCircle2, XCircle, Clock3, Globe, LockKeyhole,
  Stethoscope, Upload, FileText, Video, DollarSign, Briefcase, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check } from 'lucide-react';
import { ConsultantDocumentLink, ConsultantDocumentImage, ConsultantDocumentVideo } from '@/components/consultant/ConsultantDocumentLink';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public_profile: boolean;
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
interface InstructorRequest {
  id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

interface ConsultantRequest {
  id: string;
  user_id: string;
  specialty: string;
  bio: string | null;
  consultation_price: number | null;
  years_experience: number | null;
  photo_url: string | null;
  video_url: string | null;
  certificates_urls: string[] | null;
  id_card_url: string | null;
  license_url: string | null;
  languages: string[] | null;
  status: string;
  rejection_reason: string | null;
  admin_reviewed_at: string | null;
  super_admin_approved_at: string | null;
  last_save_error: string | null;
  last_save_error_at: string | null;
  created_at: string;
}

const ProfilePage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isStudent, isInstructor, isAdmin, isConsultant } = useUserRole();
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

  // Instructor request state
  const [instructorRequest, setInstructorRequest] = useState<InstructorRequest | null>(null);
  const [resubmitting, setResubmitting] = useState(false);

  // Consultant request state
  const [consultantRequest, setConsultantRequest] = useState<ConsultantRequest | null>(null);
  const [consultantFormData, setConsultantFormData] = useState({
    specialty: '',
    bio: '',
    consultation_price: '',
    years_experience: '',
    languages: '',
  });
  const [savingConsultant, setSavingConsultant] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCourseProgress();
      fetchInstructorRequest();
      fetchConsultantRequest();
    }
  }, [user]);

  const fetchInstructorRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('instructor_requests')
        .select('id, status, created_at, reviewed_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setInstructorRequest(data);
    } catch (error) {
      console.error('Error fetching instructor request:', error);
    }
  };

  const handleResubmitInstructorRequest = async () => {
    if (!user) return;
    setResubmitting(true);
    try {
      const { error } = await supabase
        .from('instructor_requests')
        .insert({ user_id: user.id, status: 'pending' });

      if (error) throw error;
      toast.success('تم إعادة إرسال طلب المدرب بنجاح');
      fetchInstructorRequest();
    } catch (error: any) {
      console.error('Error resubmitting:', error);
      toast.error('حدث خطأ أثناء إعادة إرسال الطلب');
    } finally {
      setResubmitting(false);
    }
  };

  const fetchConsultantRequest = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('consultant_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConsultantRequest(data as ConsultantRequest);
        setConsultantFormData({
          specialty: data.specialty || '',
          bio: data.bio || '',
          consultation_price: data.consultation_price?.toString() || '',
          years_experience: data.years_experience?.toString() || '',
          languages: (data.languages || []).join(', '),
        });
      }
    } catch (error) {
      console.error('Error fetching consultant request:', error);
    }
  };

  const getRequiredDocsStatus = () => {
    const r = consultantRequest;
    return [
      { key: 'photo', label: 'الصورة الشخصية', ok: !!r?.photo_url },
      { key: 'id_card', label: 'بطاقة الهوية', ok: !!r?.id_card_url },
      { key: 'license', label: 'ترخيص مزاولة المهنة', ok: !!r?.license_url },
      { key: 'certificates', label: 'الشهادات العلمية', ok: !!(r?.certificates_urls && r.certificates_urls.length > 0) },
    ];
  };

  const handleAttemptSaveConsultant = () => {
    if (!user || !consultantRequest) return;
    if (!consultantFormData.specialty.trim()) {
      toast.error('يرجى إدخال التخصص');
      return;
    }
    const missing = getRequiredDocsStatus().filter(d => !d.ok);
    if (missing.length > 0) {
      toast.error(`المستندات الناقصة: ${missing.map(m => m.label).join('، ')}`);
      return;
    }
    setConfirmSubmitOpen(true);
  };

  const handleSaveConsultantData = async () => {
    if (!user || !consultantRequest) return;
    if (!consultantFormData.specialty.trim()) {
      toast.error('يرجى إدخال التخصص');
      return;
    }
    if (!consultantRequest.photo_url) {
      toast.error('يرجى رفع الصورة الشخصية قبل الحفظ');
      return;
    }
    if (!consultantRequest.id_card_url) {
      toast.error('يرجى رفع بطاقة الهوية قبل الحفظ');
      return;
    }
    if (!consultantRequest.license_url) {
      toast.error('يرجى رفع ترخيص مزاولة المهنة قبل الحفظ');
      return;
    }
    if (!consultantRequest.certificates_urls || consultantRequest.certificates_urls.length === 0) {
      toast.error('يرجى رفع شهادة واحدة على الأقل قبل الحفظ');
      return;
    }
    setSavingConsultant(true);
    try {
      const langs = consultantFormData.languages
        .split(',')
        .map(l => l.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from('consultant_requests')
        .update({
          specialty: consultantFormData.specialty.trim(),
          bio: consultantFormData.bio.trim() || null,
          consultation_price: parseInt(consultantFormData.consultation_price) || 0,
          years_experience: parseInt(consultantFormData.years_experience) || 0,
          languages: langs,
        })
        .eq('id', consultantRequest.id);

      if (error) throw error;
      toast.success('تم حفظ البيانات بنجاح');
      fetchConsultantRequest();
      navigate('/consultant-request-status');
    } catch (error: any) {
      console.error('Error saving consultant data:', error);
      const msg: string = error?.message || '';
      if (msg.includes('الصورة الشخصية')) {
        toast.error('لا يمكن حفظ الطلب: يجب رفع الصورة الشخصية أولاً');
      } else if (msg.includes('بطاقة الهوية')) {
        toast.error('لا يمكن حفظ الطلب: يجب رفع بطاقة الهوية أولاً');
      } else if (msg.includes('ترخيص')) {
        toast.error('لا يمكن حفظ الطلب: يجب رفع ترخيص مزاولة المهنة أولاً');
      } else if (msg.includes('الشهادات')) {
        toast.error('لا يمكن حفظ الطلب: يجب رفع الشهادات العلمية أولاً');
      } else if (msg.includes('المستندات الإجبارية')) {
        toast.error('لا يمكن حفظ الطلب: جميع المستندات الإجبارية مطلوبة (الصورة، الشهادات، الترخيص، بطاقة الهوية)');
      } else {
        toast.error('حدث خطأ أثناء حفظ البيانات');
      }
    } finally {
      setSavingConsultant(false);
      setConfirmSubmitOpen(false);
    }
  };

  const handleConsultantFileUpload = async (
    file: File,
    type: 'photo' | 'video' | 'certificate' | 'id_card' | 'license'
  ) => {
    if (!user || !consultantRequest) return;

    const setUploading =
      type === 'photo' ? setUploadingPhoto :
      type === 'video' ? setUploadingVideo :
      type === 'id_card' ? setUploadingIdCard :
      type === 'license' ? setUploadingLicense :
      setUploadingCert;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('consultant-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the storage object path only. Signed URLs are minted on demand
      // when rendering, with a short TTL (see useSignedUrl in @/lib/storage).
      const storedValue = fileName;

      if (type === 'photo') {
        await supabase.from('consultant_requests').update({ photo_url: storedValue }).eq('id', consultantRequest.id);
      } else if (type === 'video') {
        await supabase.from('consultant_requests').update({ video_url: storedValue }).eq('id', consultantRequest.id);
      } else if (type === 'id_card') {
        await supabase.from('consultant_requests').update({ id_card_url: storedValue }).eq('id', consultantRequest.id);
      } else if (type === 'license') {
        await supabase.from('consultant_requests').update({ license_url: storedValue }).eq('id', consultantRequest.id);
      } else {
        const currentCerts = consultantRequest.certificates_urls || [];
        await supabase.from('consultant_requests').update({ certificates_urls: [...currentCerts, storedValue] }).eq('id', consultantRequest.id);
      }

      toast.success('تم رفع الملف بنجاح');
      fetchConsultantRequest();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('حدث خطأ أثناء رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCertificate = async (url: string) => {
    if (!consultantRequest) return;
    try {
      const updatedCerts = (consultantRequest.certificates_urls || []).filter(c => c !== url);
      await supabase.from('consultant_requests').update({ certificates_urls: updatedCerts }).eq('id', consultantRequest.id);
      toast.success('تم حذف الشهادة');
      fetchConsultantRequest();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data as Profile);
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

  const handleAvatarDelete = async () => {
    if (!user || !profile?.avatar_url) return;

    setUploadingAvatar(true);
    try {
      // Extract file path from URL
      const avatarPath = profile.avatar_url.split('/avatars/')[1];
      if (avatarPath) {
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([avatarPath]);

        if (deleteError) throw deleteError;
      }

      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
      toast.success('تم حذف الصورة الشخصية بنجاح');
    } catch (error: any) {
      console.error('Error deleting avatar:', error);
      toast.error('حدث خطأ أثناء حذف الصورة');
    } finally {
      setUploadingAvatar(false);
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
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      title="تغيير الصورة"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                    {profile?.avatar_url && (
                      <button
                        onClick={handleAvatarDelete}
                        className="p-2 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors"
                        title="حذف الصورة"
                      >
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </>
                )}
              </div>
              
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
                      placeholder="01XXXXXXXXX"
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

                {/* Profile Visibility Toggle */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {profile?.is_public_profile ? (
                        <Globe className="w-4 h-4 text-primary" />
                      ) : (
                        <LockKeyhole className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <Label className="text-sm font-medium">
                          {profile?.is_public_profile ? 'ملف شخصي عام' : 'ملف شخصي خاص'}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {profile?.is_public_profile 
                            ? 'يمكن للطلاب الآخرين رؤية ملفك الشخصي' 
                            : 'ملفك الشخصي مخفي عن الطلاب الآخرين'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.is_public_profile ?? false}
                      onCheckedChange={async (checked) => {
                        if (!user) return;
                        const { error } = await supabase
                          .from('profiles')
                          .update({ is_public_profile: checked } as any)
                          .eq('user_id', user.id);
                        if (error) {
                          toast.error('حدث خطأ أثناء تحديث إعدادات الخصوصية');
                        } else {
                          setProfile(prev => prev ? { ...prev, is_public_profile: checked } : null);
                          toast.success(checked ? 'تم جعل ملفك الشخصي عاماً' : 'تم جعل ملفك الشخصي خاصاً');
                        }
                      }}
                    />
                  </div>
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

                {/* Instructor Request Section */}
                {isStudent && !isInstructor && !isAdmin && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                      <GraduationCap className="w-4 h-4" />
                      طلب الترقية لمدرب
                    </h3>
                    
                    {!instructorRequest && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          يمكنك التقديم للحصول على صلاحيات المدرب لإنشاء وإدارة الكورسات.
                        </p>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={handleResubmitInstructorRequest}
                          disabled={resubmitting}
                        >
                          {resubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <GraduationCap className="w-4 h-4" />
                          )}
                          {resubmitting ? 'جاري الإرسال...' : 'تقديم طلب مدرب'}
                        </Button>
                      </div>
                    )}

                    {instructorRequest?.status === 'pending' && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        <Clock3 className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">طلبك قيد المراجعة</span>
                      </div>
                    )}

                    {instructorRequest?.status === 'approved' && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">تمت الموافقة على طلبك</span>
                      </div>
                    )}

                    {instructorRequest?.status === 'rejected' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                          <XCircle className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm">تم رفض طلبك</span>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={handleResubmitInstructorRequest}
                          disabled={resubmitting}
                        >
                          {resubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          {resubmitting ? 'جاري الإرسال...' : 'إعادة إرسال الطلب'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {/* Consultant Profile Section */}
                {(isConsultant || consultantRequest) && consultantRequest && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                      <Stethoscope className="w-4 h-4" />
                      بيانات الاستشاري
                    </h3>

                    {/* Status Badge */}
                    <div className="mb-4">
                      {consultantRequest.status === 'pending' && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                          <Clock3 className="w-3 h-3 ml-1" />
                          قيد المراجعة
                        </Badge>
                      )}
                      {consultantRequest.status === 'admin_reviewed' && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                          <CheckCircle2 className="w-3 h-3 ml-1" />
                          تمت مراجعة الآدمن - بانتظار التأكيد النهائي
                        </Badge>
                      )}
                      {consultantRequest.status === 'approved' && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 ml-1" />
                          تمت الموافقة
                        </Badge>
                      )}
                      {consultantRequest.status === 'rejected' && (
                        <div className="space-y-2">
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                            <XCircle className="w-3 h-3 ml-1" />
                            مرفوض
                          </Badge>
                          {consultantRequest.rejection_reason && (
                            <p className="text-sm text-destructive">{consultantRequest.rejection_reason}</p>
                          )}
                        </div>
                      )}
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/consultant-request-status')}
                        >
                          عرض حالة الطلب بالتفصيل
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Specialty */}
                      <div className="space-y-2">
                        <Label>التخصص *</Label>
                        <Input
                          value={consultantFormData.specialty}
                          onChange={(e) => setConsultantFormData({ ...consultantFormData, specialty: e.target.value })}
                          placeholder="مثال: طب نفسي، إرشاد أسري"
                        />
                      </div>

                      {/* Bio */}
                      <div className="space-y-2">
                        <Label>نبذة مهنية</Label>
                        <Textarea
                          value={consultantFormData.bio}
                          onChange={(e) => setConsultantFormData({ ...consultantFormData, bio: e.target.value })}
                          placeholder="اكتب نبذة عن خبرتك وتخصصك..."
                          rows={3}
                        />
                      </div>

                      {/* Price & Experience */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            سعر الاستشارة (ج.م)
                          </Label>
                          <Input
                            type="number"
                            value={consultantFormData.consultation_price}
                            onChange={(e) => setConsultantFormData({ ...consultantFormData, consultation_price: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            سنوات الخبرة
                          </Label>
                          <Input
                            type="number"
                            value={consultantFormData.years_experience}
                            onChange={(e) => setConsultantFormData({ ...consultantFormData, years_experience: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Languages */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          اللغات (افصل بينها بفاصلة)
                        </Label>
                        <Input
                          value={consultantFormData.languages}
                          onChange={(e) => setConsultantFormData({ ...consultantFormData, languages: e.target.value })}
                          placeholder="العربية, English, Français"
                        />
                        <p className="text-xs text-muted-foreground">اللغات التي يمكنك التشخيص بها</p>
                      </div>

                      {isAdmin && consultantRequest?.last_save_error && (
                        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm">
                          <p className="font-semibold text-destructive mb-1 flex items-center gap-2">
                            <X className="w-4 h-4" /> سبب رفض آخر محاولة حفظ
                          </p>
                          <p className="text-destructive/90 text-xs">{consultantRequest.last_save_error}</p>
                          {consultantRequest.last_save_error_at && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {new Date(consultantRequest.last_save_error_at).toLocaleString('ar-EG')}
                            </p>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={handleAttemptSaveConsultant}
                        disabled={savingConsultant}
                        className="w-full gap-2"
                      >
                        {savingConsultant ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {savingConsultant ? 'جاري الحفظ...' : 'حفظ البيانات'}
                      </Button>

                      <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد إرسال الطلب</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                              <div className="space-y-3 text-right">
                                <p>يرجى مراجعة المستندات المطلوبة قبل الإرسال:</p>
                                <ul className="space-y-2">
                                  {getRequiredDocsStatus().map(d => (
                                    <li key={d.key} className="flex items-center gap-2 text-sm">
                                      {d.ok ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <X className="w-4 h-4 text-destructive" />
                                      )}
                                      <span className={d.ok ? '' : 'text-destructive'}>{d.label}</span>
                                    </li>
                                  ))}
                                </ul>
                                <p className="text-xs text-muted-foreground">
                                  بعد الإرسال سيقوم الآدمن بمراجعة طلبك ثم يتم اعتماده نهائياً من السوبر آدمن.
                                </p>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={savingConsultant}>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => { e.preventDefault(); handleSaveConsultantData(); }}
                              disabled={savingConsultant || getRequiredDocsStatus().some(d => !d.ok)}
                            >
                              {savingConsultant ? 'جاري الحفظ...' : 'تأكيد وإرسال'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>


                      {/* Required documents notice */}
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm">
                        <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">📋 المستندات الإجبارية للقبول:</p>
                        <ul className="list-disc pr-4 space-y-0.5 text-amber-700 dark:text-amber-300 text-xs">
                          <li>صورة شخصية احترافية</li>
                          <li>الشهادات العلمية</li>
                          <li>ترخيص مزاولة المهنة</li>
                          <li>بطاقة الهوية</li>
                          <li>فيديو تعريفي قصير</li>
                        </ul>
                      </div>

                      {/* ID Card Upload */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          بطاقة الهوية * (إجباري)
                        </Label>
                        {consultantRequest.id_card_url && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <ConsultantDocumentLink path={consultantRequest.id_card_url} className="text-sm text-primary hover:underline">
                              عرض بطاقة الهوية
                            </ConsultantDocumentLink>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => idCardInputRef.current?.click()}
                          disabled={uploadingIdCard}
                          className="gap-2"
                        >
                          {uploadingIdCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {consultantRequest.id_card_url ? 'تغيير البطاقة' : 'رفع بطاقة الهوية'}
                        </Button>
                        <input
                          ref={idCardInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) { toast.error('الحد الأقصى 10 ميجابايت'); return; }
                              handleConsultantFileUpload(file, 'id_card');
                            }
                          }}
                        />
                      </div>

                      {/* License Upload */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          ترخيص مزاولة المهنة * (إجباري)
                        </Label>
                        {consultantRequest.license_url && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <ConsultantDocumentLink path={consultantRequest.license_url} className="text-sm text-primary hover:underline">
                              عرض الترخيص
                            </ConsultantDocumentLink>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => licenseInputRef.current?.click()}
                          disabled={uploadingLicense}
                          className="gap-2"
                        >
                          {uploadingLicense ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {consultantRequest.license_url ? 'تغيير الترخيص' : 'رفع الترخيص'}
                        </Button>
                        <input
                          ref={licenseInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) { toast.error('الحد الأقصى 10 ميجابايت'); return; }
                              handleConsultantFileUpload(file, 'license');
                            }
                          }}
                        />
                      </div>

                      {/* Photo Upload */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          صورة الاستشاري
                        </Label>
                        {consultantRequest.photo_url ? (
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border">
                            <img src={consultantRequest.photo_url} alt="صورة" className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="gap-2"
                        >
                          {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {consultantRequest.photo_url ? 'تغيير الصورة' : 'رفع صورة'}
                        </Button>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) { toast.error('الحد الأقصى 5 ميجابايت'); return; }
                              handleConsultantFileUpload(file, 'photo');
                            }
                          }}
                        />
                      </div>

                      {/* Video Upload */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          فيديو تعريفي
                        </Label>
                        {consultantRequest.video_url ? (
                          <video src={consultantRequest.video_url} controls className="w-full rounded-xl max-h-48" />
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploadingVideo}
                          className="gap-2"
                        >
                          {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {consultantRequest.video_url ? 'تغيير الفيديو' : 'رفع فيديو'}
                        </Button>
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 50 * 1024 * 1024) { toast.error('الحد الأقصى 50 ميجابايت'); return; }
                              handleConsultantFileUpload(file, 'video');
                            }
                          }}
                        />
                      </div>

                      {/* Certificates Upload */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          الشهادات والمؤهلات
                        </Label>
                        {(consultantRequest.certificates_urls || []).length > 0 && (
                          <div className="space-y-2">
                            {(consultantRequest.certificates_urls || []).map((url, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                                  شهادة {idx + 1}
                                </a>
                                <button onClick={() => handleRemoveCertificate(url)} className="text-destructive hover:text-destructive/80">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => certInputRef.current?.click()}
                          disabled={uploadingCert}
                          className="gap-2"
                        >
                          {uploadingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          رفع شهادة
                        </Button>
                        <input
                          ref={certInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) { toast.error('الحد الأقصى 10 ميجابايت'); return; }
                              handleConsultantFileUpload(file, 'certificate');
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
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
