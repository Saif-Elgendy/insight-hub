import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, UserCog, Search, ChevronDown, AlertTriangle, Activity, UserCheck, Trash2 } from 'lucide-react';
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
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الصلاحية',
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

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery)
  );

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    instructors: users.filter((u) => u.role === 'instructor').length,
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
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">لوحة تحكم المسؤول</h1>
                <p className="text-muted-foreground">إدارة المستخدمين والصلاحيات</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <CardDescription>الطلاب</CardDescription>
                  <CardTitle className="text-3xl text-muted-foreground">{stats.students}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Tabs for different sections */}
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 max-w-lg">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  المستخدمين
                </TabsTrigger>
                <TabsTrigger value="instructor-requests" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  طلبات المدربين
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
    </div>
  );
};

export default AdminDashboard;
