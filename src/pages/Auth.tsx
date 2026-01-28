import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Mail, Lock, User, Eye, EyeOff, ArrowLeft, GraduationCap, BookOpen, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'البريد الإلكتروني غير صحيح' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, { message: 'الاسم يجب أن يكون حرفين على الأقل' }).max(100),
  confirmPassword: z.string(),
  role: z.enum(['student', 'instructor']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

type AuthMode = 'login' | 'signup' | 'forgot-password';

const AuthPage = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'instructor'>('student');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const resetForm = () => {
    setErrors({});
    setFormData({ email: '', password: '', fullName: '', confirmPassword: '' });
    setSelectedRole('student');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const emailResult = z.string().trim().email({ message: 'البريد الإلكتروني غير صحيح' }).safeParse(formData.email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error('حدث خطأ أثناء إرسال رابط الاستعادة');
      } else {
        toast.success('تم إرسال رابط استعادة كلمة المرور! 📧', {
          description: `تحقق من بريدك الإلكتروني ${formData.email}`,
          duration: 6000,
        });
        setAuthMode('login');
        resetForm();
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (authMode === 'login') {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
          } else {
            toast.error('حدث خطأ أثناء تسجيل الدخول');
          }
        } else {
          toast.success('تم تسجيل الدخول بنجاح!');
          navigate('/profile');
        }
      } else if (authMode === 'signup') {
        const result = signupSchema.safeParse({ ...formData, role: selectedRole });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.fullName, selectedRole);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('هذا البريد الإلكتروني مسجل مسبقاً');
          } else {
            toast.error('حدث خطأ أثناء إنشاء الحساب');
          }
        } else {
          toast.success('تم إنشاء حسابك بنجاح! 🎉', {
            description: `تم إرسال رسالة تأكيد إلى ${formData.email}. يرجى التحقق من بريدك الإلكتروني.`,
            duration: 6000,
          });
          navigate('/profile');
        }
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-accent flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/3 left-1/4 w-96 h-96 rounded-full bg-wellness-lavender/20 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Back to Home */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </Link>

        {/* Auth Card */}
        <div className="bg-card rounded-3xl shadow-elevated p-8 border border-border/50">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center">
                <Brain className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">نفسي</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              {authMode === 'login' ? 'تسجيل الدخول' : authMode === 'signup' ? 'إنشاء حساب جديد' : 'استعادة كلمة المرور'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {authMode === 'login' ? 'مرحباً بعودتك!' : authMode === 'signup' ? 'انضم إلى رحلتك نحو الصحة النفسية' : 'أدخل بريدك الإلكتروني لاستعادة كلمة المرور'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {authMode === 'forgot-password' ? (
              <motion.form
                key="forgot-password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleForgotPassword}
                className="space-y-5"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <KeyRound className="w-8 h-8 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      جاري الإرسال...
                    </span>
                  ) : (
                    'إرسال رابط الاستعادة'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); resetForm(); }}
                  className="w-full text-center text-primary font-medium hover:underline"
                >
                  العودة لتسجيل الدخول
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="auth"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {authMode === 'signup' && (
                  <>
                    {/* Role Selection */}
                    <div className="space-y-3">
                      <Label>نوع الحساب</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRole('student')}
                          className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                            selectedRole === 'student'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <GraduationCap className="w-6 h-6" />
                          <span className="font-medium text-sm">طالب</span>
                          <span className="text-[10px] text-muted-foreground">قراءة فقط</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRole('instructor')}
                          className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                            selectedRole === 'instructor'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <BookOpen className="w-6 h-6" />
                          <span className="font-medium text-sm">مدرب</span>
                          <span className="text-[10px] text-muted-foreground">إنشاء وتعديل</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">الاسم الكامل</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="أدخل اسمك الكامل"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="pr-10"
                        />
                      </div>
                      {errors.fullName && (
                        <p className="text-sm text-destructive">{errors.fullName}</p>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">كلمة المرور</Label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot-password'); resetForm(); }}
                        className="text-sm text-primary hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="pr-10 pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                {authMode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pr-10"
                        dir="ltr"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      جاري التحميل...
                    </span>
                  ) : authMode === 'login' ? (
                    'تسجيل الدخول'
                  ) : (
                    'إنشاء حساب'
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Toggle */}
          {authMode !== 'forgot-password' && (
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {authMode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    resetForm();
                  }}
                  className="text-primary font-medium hover:underline mr-2"
                >
                  {authMode === 'login' ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
                </button>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
