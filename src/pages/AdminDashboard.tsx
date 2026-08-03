import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, UserCog, Search, ChevronDown, AlertTriangle, Activity, UserCheck, Trash2, FileSearch, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ErrorLogsTable } from '@/components/admin/ErrorLogsTable';
import { ActivityLogsTable } from '@/components/admin/ActivityLogsTable';
import { InstructorRequestsTable } from '@/components/admin/InstructorRequestsTable';
import { ConsultantRequestsTable } from '@/components/admin/ConsultantRequestsTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConsultantDocumentLink, ConsultantDocumentImage, ConsultantDocumentVideo } from '@/components/consultant/ConsultantDocumentLink';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const SUPER_ADMIN_ID = '9a48cfb7-03ed-4df4-afc9-67a06d014d77';

interface UserWithRole {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'مسؤول',
  instructor: 'مدرب',
  student: 'طالب',
  consultant: 'استشاري',
};

const roleBadgeVariants: Record<AppRole, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  instructor: 'secondary',
  student: 'outline',
  consultant: 'secondary',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [pendingRoleRequests, setPendingRoleRequests] = useState<Record<string, 'instructor' | 'consultant'>>({});
  const [docsDialogUserId, setDocsDialogUserId] = useState<string | null>(null);
  const [docsDialogData, setDocsDialogData] = useState<any | null>(null);
  const [docsDialogLoading, setDocsDialogLoading] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionBusy, setDecisionBusy] = useState<null | 'approved' | 'rejected' | 'postponed'>(null);
  const isSuperAdmin = user?.id === SUPER_ADMIN_ID;


  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/');
        toast({
          title: 'غير مصرح',
          description: 'ليس لديك صلاحية الوصول لهذه الصفحة',
          variant: 'destructive',
        });
      }
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate, toast]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await supabase.functions.invoke('get-users', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (response.error) throw response.error;
        
        const data = response.data as { users: UserWithRole[] };
        setUsers(data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء جلب بيانات المستخدمين',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchUsers();
      // fetch pending role change requests (instructor + consultant)
      (async () => {
        const map: Record<string, 'instructor' | 'consultant'> = {};
        const { data: inst } = await supabase
          .from('instructor_requests')
          .select('user_id, status')
          .in('status', ['pending']);
        (inst || []).forEach((r: any) => { map[r.user_id] = 'instructor'; });
        const { data: cons } = await supabase
          .from('consultant_requests')
          .select('user_id, status')
          .in('status', ['pending', 'admin_reviewed']);
        (cons || []).forEach((r: any) => { map[r.user_id] = 'consultant'; });
        setPendingRoleRequests(map);
      })();
    }
  }, [isAdmin, toast]);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    // Prevent changing own role
    if (userId === user?.id) {
      toast({
        title: 'غير مسموح',
        description: 'لا يمكنك تغيير صلاحياتك الخاصة',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, role: newRole } : u
        )
      );

      toast({
        title: 'تم التحديث',
        description: `تم تغيير صلاحية المستخدم إلى ${roleLabels[newRole]}`,
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'خطأ',
        description: error?.message || 'حدث خطأ أثناء تحديث الصلاحية',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (response.error) throw response.error;

      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      toast({
        title: 'تم الحذف',
        description: 'تم حذف حساب المستخدم بنجاح',
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'خطأ',
        description: error?.message || 'حدث خطأ أثناء حذف المستخدم',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleConsultantDecision = async (decision: 'approved' | 'rejected' | 'postponed') => {
    const req = docsDialogData?.data;
    if (!req || docsDialogData.kind !== 'consultant') return;
    const note = decisionNote.trim();

    if (decision !== 'approved' && !note) {
      toast({ title: 'التعليق مطلوب', description: 'اكتب سبب الرفض أو ما هو الناقص قبل الحفظ', variant: 'destructive' });
      return;
    }

    if (decision === 'approved') {
      const missing: string[] = [];
      if (!req.photo_url) missing.push('الصورة الشخصية');
      if (!req.id_card_url) missing.push('بطاقة الهوية');
      if (!req.license_url) missing.push('ترخيص مزاولة المهنة');
      if (!req.certificates_urls?.length) missing.push('الشهادات العلمية');
      if (missing.length) {
        toast({ title: 'مستندات ناقصة', description: `لا يمكن القبول النهائي: ${missing.join('، ')}`, variant: 'destructive' });
        return;
      }
    }

    setDecisionBusy(decision);
    try {
      if (decision === 'approved') {
        if (!req.admin_reviewed_at) {
          const { error: e1 } = await supabase
            .from('consultant_requests')
            .update({ status: 'admin_reviewed', admin_review_notes: note || null })
            .eq('id', req.id);
          if (e1) throw e1;
        }
        const { error: e2 } = await supabase
          .from('consultant_requests')
          .update({ status: 'approved', admin_review_notes: note || null, rejection_reason: null })
          .eq('id', req.id);
        if (e2) throw e2;

        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: 'consultant' as AppRole })
          .eq('user_id', req.user_id);
        if (roleError) {
          toast({ title: 'تم القبول', description: `تم قبول الطلب لكن تعذر تحديث الصلاحية: ${roleError.message}`, variant: 'destructive' });
        } else {
          setUsers((prev) => prev.map((u) => (u.user_id === req.user_id ? { ...u, role: 'consultant' as AppRole } : u)));
          toast({ title: 'تم القبول', description: 'تم اعتماد الاستشاري وتحديث صلاحيته' });
        }
      } else if (decision === 'rejected') {
        const { error } = await supabase
          .from('consultant_requests')
          .update({ status: 'rejected', rejection_reason: note, admin_review_notes: note })
          .eq('id', req.id);
        if (error) throw error;
        toast({ title: 'تم الرفض', description: 'تم إرسال سبب الرفض للاستشاري' });
      } else {
        const { error } = await supabase
          .from('consultant_requests')
          .update({ status: 'postponed', admin_review_notes: note })
          .eq('id', req.id);
        if (error) throw error;
        toast({ title: 'تم التأجيل', description: 'تم إرسال التعليق للاستشاري لاستكمال الناقص' });
      }

      setPendingRoleRequests((prev) => {
        if (decision === 'postponed') return prev;
        const next = { ...prev };
        delete next[req.user_id];
        return next;
      });
      setDecisionNote('');
      setDocsDialogUserId(null);
      setDocsDialogData(null);
    } catch (e: any) {
      toast({ title: 'خطأ', description: e?.message || 'تعذر تنفيذ القرار', variant: 'destructive' });
    } finally {
      setDecisionBusy(null);
    }
  };

  const openDocsDialog = async (userId: string, kind: 'instructor' | 'consultant') => {
    setDecisionNote('');
    setDocsDialogUserId(userId);

    setDocsDialogData(null);
    setDocsDialogLoading(true);
    try {
      if (kind === 'consultant') {
        const { data, error } = await supabase
          .from('consultant_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        setDocsDialogData({ kind, data });
      } else {
        const { data, error } = await supabase
          .from('instructor_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        setDocsDialogData({ kind, data });
      }
    } catch (e: any) {
      toast({ title: 'خطأ', description: e?.message || 'تعذر تحميل المستندات', variant: 'destructive' });
      setDocsDialogUserId(null);
    } finally {
      setDocsDialogLoading(false);
    }
  };


  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery)
  );

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    instructors: users.filter((u) => u.role === 'instructor').length,
    consultants: users.filter((u) => u.role === 'consultant').length,
    students: users.filter((u) => u.role === 'student').length,
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">لوحة تحكم المسؤول</h1>
                <p className="text-muted-foreground">إدارة المستخدمين والصلاحيات</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/admin/diagnostics')}>
                <Activity className="w-4 h-4 ml-2" />
                تشخيصات الموقع
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>إجمالي المستخدمين</CardDescription>
                  <CardTitle className="text-3xl">{stats.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>المسؤولين</CardDescription>
                  <CardTitle className="text-3xl text-primary">{stats.admins}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>المدربين</CardDescription>
                  <CardTitle className="text-3xl text-secondary-foreground">{stats.instructors}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>الاستشاريين</CardDescription>
                  <CardTitle className="text-3xl text-secondary-foreground">{stats.consultants}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>الطلاب</CardDescription>
                  <CardTitle className="text-3xl text-muted-foreground">{stats.students}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Tabs for different sections */}
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 max-w-2xl">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  المستخدمين
                </TabsTrigger>
                <TabsTrigger value="instructor-requests" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  طلبات المدربين
                </TabsTrigger>
                <TabsTrigger value="consultant-requests" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  طلبات الاستشاريين
                </TabsTrigger>
                <TabsTrigger value="errors" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  الأخطاء
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  النشاطات
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                {/* Users Table */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-primary" />
                        <CardTitle>إدارة المستخدمين</CardTitle>
                      </div>
                      <div className="relative max-w-sm">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="ابحث عن مستخدم..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        لا يوجد مستخدمين
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right">المستخدم</TableHead>
                              <TableHead className="text-right">البريد الإلكتروني</TableHead>
                              <TableHead className="text-right">الهاتف</TableHead>
                              <TableHead className="text-right">الصلاحية</TableHead>
                              <TableHead className="text-right">تاريخ الانضمام</TableHead>
                              <TableHead className="text-right">الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.map((u) => (
                              <TableRow key={u.user_id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                      {u.avatar_url ? (
                                        <img
                                          src={u.avatar_url}
                                          alt={u.full_name || 'User'}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <UserCog className="w-5 h-5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <span className="font-medium">
                                      {u.full_name || 'مستخدم بدون اسم'}
                                      {u.user_id === SUPER_ADMIN_ID && (
                                        <Badge variant="default" className="mr-2 text-xs">
                                          المسؤول الأعلى
                                        </Badge>
                                      )}
                                      {u.user_id === user?.id && u.user_id !== SUPER_ADMIN_ID && (
                                        <Badge variant="outline" className="mr-2 text-xs">
                                          أنت
                                        </Badge>
                                      )}
                                      {pendingRoleRequests[u.user_id] && (
                                        <>
                                          <Badge className="mr-2 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                            🔔 يطلب صلاحية: {roleLabels[pendingRoleRequests[u.user_id]]}
                                          </Badge>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="mr-2 h-7 px-2 gap-1 text-xs"
                                            onClick={() => openDocsDialog(u.user_id, pendingRoleRequests[u.user_id])}
                                          >
                                            <FileSearch className="w-3.5 h-3.5" />
                                            عرض المستندات والتحقق
                                          </Button>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {u.email || '—'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {u.phone || '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={roleBadgeVariants[u.role]}>
                                    {roleLabels[u.role]}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {new Date(u.created_at).toLocaleDateString('ar-EG')}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={u.user_id === user?.id || u.user_id === SUPER_ADMIN_ID || updatingUserId === u.user_id}
                                        >
                                          {updatingUserId === u.user_id ? (
                                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                          ) : (
                                            <>
                                              تغيير الصلاحية
                                              <ChevronDown className="w-4 h-4 mr-2" />
                                            </>
                                          )}
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleRoleChange(u.user_id, 'admin')}
                                          disabled={u.role === 'admin'}
                                        >
                                          <Shield className="w-4 h-4 ml-2" />
                                          مسؤول
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleRoleChange(u.user_id, 'consultant')}
                                          disabled={u.role === 'consultant'}
                                        >
                                          <UserCog className="w-4 h-4 ml-2" />
                                          استشاري
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleRoleChange(u.user_id, 'instructor')}
                                          disabled={u.role === 'instructor'}
                                        >
                                          <UserCog className="w-4 h-4 ml-2" />
                                          مدرب
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleRoleChange(u.user_id, 'student')}
                                          disabled={u.role === 'student'}
                                        >
                                          <Users className="w-4 h-4 ml-2" />
                                          طالب
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>

                                    {u.user_id !== SUPER_ADMIN_ID && u.user_id !== user?.id && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={deletingUserId === u.user_id}
                                          >
                                            {deletingUserId === u.user_id ? (
                                              <div className="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
                                            ) : (
                                              <Trash2 className="w-4 h-4" />
                                            )}
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent dir="rtl">
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              هل أنت متأكد من حذف حساب "{u.full_name || u.email}"؟ هذا الإجراء لا يمكن التراجع عنه.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter className="flex-row-reverse gap-2">
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleDeleteUser(u.user_id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              حذف
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructor-requests">
                <InstructorRequestsTable />
              </TabsContent>

              <TabsContent value="consultant-requests">
                <ConsultantRequestsTable />
              </TabsContent>

              <TabsContent value="errors">
                <ErrorLogsTable />
              </TabsContent>

              <TabsContent value="activity">
                <ActivityLogsTable />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <Footer />

      <Dialog open={!!docsDialogUserId} onOpenChange={(v) => { if (!v) { setDocsDialogUserId(null); setDocsDialogData(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5" />
              مراجعة المستندات والتحقق
            </DialogTitle>
            <DialogDescription>
              راجع المستندات المرفوعة قبل اعتماد تغيير الصلاحية.
            </DialogDescription>
          </DialogHeader>

          {docsDialogLoading && (
            <div className="py-8 text-center text-muted-foreground">جارٍ التحميل...</div>
          )}

          {!docsDialogLoading && docsDialogData?.kind === 'instructor' && (
            <div className="space-y-3">
              {!docsDialogData.data ? (
                <p className="text-muted-foreground">لا يوجد طلب حالي.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">حالة الطلب</Badge>
                    <span className="text-sm">{docsDialogData.data.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">طلب مدرب لا يتطلب مستندات إضافية. يمكنك تغيير الصلاحية مباشرة إلى مدرب من قائمة الصلاحيات.</p>
                </>
              )}
            </div>
          )}

          {!docsDialogLoading && docsDialogData?.kind === 'consultant' && (
            <div className="space-y-4">
              {!docsDialogData.data ? (
                <p className="text-muted-foreground">لا يوجد طلب استشاري.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">التخصص: </span>{docsDialogData.data.specialty || '—'}</div>
                    <div><span className="text-muted-foreground">سنوات الخبرة: </span>{docsDialogData.data.years_experience ?? '—'}</div>
                    <div><span className="text-muted-foreground">سعر الاستشارة: </span>{docsDialogData.data.consultation_price ?? '—'} ج.م</div>
                    <div><span className="text-muted-foreground">الحالة: </span>{docsDialogData.data.status}</div>
                  </div>
                  {docsDialogData.data.bio && (
                    <div className="text-sm bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">النبذة</p>
                      <p>{docsDialogData.data.bio}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">المستندات الإجبارية</p>
                    {[
                      { key: 'photo_url', label: 'الصورة الشخصية' },
                      { key: 'id_card_url', label: 'بطاقة الهوية' },
                      { key: 'license_url', label: 'ترخيص مزاولة المهنة' },
                    ].map((d) => {
                      const val = docsDialogData.data[d.key];
                      return (
                        <div key={d.key} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
                          <div className="flex items-center gap-2">
                            {val ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-destructive" />}
                            <span className="text-sm">{d.label}</span>
                          </div>
                          {val ? (
                            <ConsultantDocumentLink path={val} className="text-sm text-primary hover:underline">
                              عرض
                            </ConsultantDocumentLink>
                          ) : (
                            <span className="text-xs text-destructive">غير مرفوع</span>
                          )}
                        </div>
                      );
                    })}

                    <div className="p-2 rounded-lg border space-y-2">
                      <div className="flex items-center gap-2">
                        {docsDialogData.data.certificates_urls?.length ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-destructive" />}
                        <span className="text-sm">الشهادات العلمية ({docsDialogData.data.certificates_urls?.length || 0})</span>
                      </div>
                      {(docsDialogData.data.certificates_urls || []).map((c: string, i: number) => (
                        <ConsultantDocumentLink key={i} path={c} className="block text-sm text-primary hover:underline">
                          عرض الشهادة {i + 1}
                        </ConsultantDocumentLink>
                      ))}
                    </div>

                    {docsDialogData.data.video_url && (
                      <div className="p-2 rounded-lg border">
                        <p className="text-sm mb-2">الفيديو التعريفي</p>
                        <ConsultantDocumentVideo path={docsDialogData.data.video_url} className="w-full rounded-lg max-h-56" />
                      </div>
                    )}
                  </div>

                  {docsDialogData.data.admin_review_notes && (
                    <div className="text-sm bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">آخر تعليق للإدارة</p>
                      <p>{docsDialogData.data.admin_review_notes}</p>
                    </div>
                  )}

                  {isSuperAdmin ? (
                    <div className="space-y-3 border-t border-border pt-4">
                      <p className="text-sm font-semibold">قرار المسؤول الأعلى</p>
                      <Textarea
                        value={decisionNote}
                        onChange={(e) => setDecisionNote(e.target.value)}
                        placeholder="اكتب تعليقاً للاستشاري (ما هو الناقص أو سبب الرفض). التعليق يظهر له في صفحة حالة الطلب."
                        rows={3}
                        dir="rtl"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => handleConsultantDecision('approved')}
                          disabled={!!decisionBusy}
                          className="gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {decisionBusy === 'approved' ? 'جارٍ القبول...' : 'قبول نهائي'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleConsultantDecision('postponed')}
                          disabled={!!decisionBusy}
                          className="gap-1"
                        >
                          <Clock className="w-4 h-4" />
                          {decisionBusy === 'postponed' ? 'جارٍ التأجيل...' : 'تأجيل الطلب'}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleConsultantDecision('rejected')}
                          disabled={!!decisionBusy}
                          className="gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          {decisionBusy === 'rejected' ? 'جارٍ الرفض...' : 'رفض الطلب'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        التعليق إجباري للرفض والتأجيل. القبول النهائي يشترط اكتمال المستندات ويحدّث صلاحية المستخدم إلى استشاري تلقائياً.
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                      بعد التحقق من المستندات، الاعتماد النهائي (قبول / رفض / تأجيل) متاح للمسؤول الأعلى فقط.
                    </div>
                  )}

                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
