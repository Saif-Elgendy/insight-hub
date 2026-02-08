import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface InstructorRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  full_name: string | null;
}

export const InstructorRequestsTable = () => {
  const [requests, setRequests] = useState<InstructorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('instructor_requests')
        .select('id, user_id, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile names
      const userIds = data.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const enriched: InstructorRequest[] = data.map((r) => ({
        ...r,
        full_name: profiles?.find((p) => p.user_id === r.user_id)?.full_name || null,
      }));

      setRequests(enriched);
    } catch (error) {
      console.error('Error fetching instructor requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (request: InstructorRequest) => {
    setProcessingId(request.id);
    try {
      // Update role to instructor
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'instructor' })
        .eq('user_id', request.user_id);

      if (roleError) throw roleError;

      // Update request status
      const { error: reqError } = await supabase
        .from('instructor_requests')
        .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      if (reqError) throw reqError;

      // Notify the user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'تمت الموافقة على طلبك! 🎉',
        message: 'تم ترقية حسابك إلى مدرب. يمكنك الآن إنشاء وتعديل الكورسات.',
        type: 'role',
      });

      toast({ title: 'تمت الموافقة', description: 'تم ترقية المستخدم إلى مدرب' });
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الموافقة', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: InstructorRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('instructor_requests')
        .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      if (error) throw error;

      // Notify the user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'تم رفض طلب المدرب',
        message: 'للأسف تم رفض طلبك للترقية إلى مدرب. يمكنك التواصل مع الإدارة لمزيد من المعلومات.',
        type: 'role',
      });

      toast({ title: 'تم الرفض', description: 'تم رفض طلب المدرب' });
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الرفض', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const statusLabels: Record<string, string> = {
    pending: 'قيد المراجعة',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
  };

  const statusVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <UserCog className="w-5 h-5 text-primary" />
          <CardTitle>طلبات المدربين</CardTitle>
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} قيد المراجعة</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد طلبات مدربين
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الطلب</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.full_name || 'مستخدم بدون اسم'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[req.status]}>
                        {req.status === 'pending' && <Clock className="w-3 h-3 ml-1" />}
                        {statusLabels[req.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      {req.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(req)}
                            disabled={processingId === req.id}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(req)}
                            disabled={processingId === req.id}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">تمت المراجعة</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
