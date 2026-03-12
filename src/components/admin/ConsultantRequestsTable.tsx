import { useState, useEffect } from 'react';
import { Check, X, Eye, Loader2, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConsultantRequest {
  id: string;
  user_id: string;
  status: string;
  specialty: string;
  bio: string | null;
  years_experience: number | null;
  consultation_price: number | null;
  photo_url: string | null;
  video_url: string | null;
  certificates_urls: string[] | null;
  rejection_reason: string | null;
  created_at: string;
  profile_name?: string | null;
  profile_email?: string | null;
}

export const ConsultantRequestsTable = () => {
  const [requests, setRequests] = useState<ConsultantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ConsultantRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('consultant_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all((data || []).map(async (req) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', req.user_id)
          .maybeSingle();

        return {
          ...req,
          profile_name: profile?.full_name || null,
          profile_email: null,
        };
      }));

      setRequests(enriched);
    } catch (error) {
      console.error('Error fetching consultant requests:', error);
      toast.error('حدث خطأ أثناء تحميل طلبات الاستشاريين');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: ConsultantRequest) => {
    setProcessing(request.id);
    try {
      // 1. Update consultant request status
      const { error: updateError } = await supabase
        .from('consultant_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // 2. Update user role to consultant
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'consultant' })
        .eq('user_id', request.user_id);

      if (roleError) throw roleError;

      // 3. Create specialist entry
      const { error: specialistError } = await supabase
        .from('specialists')
        .insert({
          user_id: request.user_id,
          full_name: request.profile_name || 'استشاري',
          title: 'استشاري',
          specialty: request.specialty,
          bio: request.bio,
          years_experience: request.years_experience || 0,
          image_url: request.photo_url,
          is_available: true,
        });

      if (specialistError) throw specialistError;

      // 4. Send notification
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'تم قبول طلبك كاستشاري! 🎉',
        message: 'تهانينا! تم قبول طلبك كاستشاري. يمكنك الآن استقبال الاستشارات من المرضى.',
        type: 'consultant',
      });

      toast.success('تم قبول الاستشاري بنجاح');
      fetchRequests();
    } catch (error) {
      console.error('Error approving consultant:', error);
      toast.error('حدث خطأ أثناء قبول الطلب');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) {
      toast.error('يرجى كتابة سبب الرفض');
      return;
    }

    setProcessing(rejectingId);
    try {
      const { error } = await supabase
        .from('consultant_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', rejectingId);

      if (error) throw error;

      const request = requests.find(r => r.id === rejectingId);
      if (request) {
        await supabase.from('notifications').insert({
          user_id: request.user_id,
          title: 'تم رفض طلب الاستشاري',
          message: `تم رفض طلبك كاستشاري. السبب: ${rejectionReason.trim()}`,
          type: 'consultant',
        });
      }

      toast.success('تم رفض الطلب');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setRejectingId(null);
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting consultant:', error);
      toast.error('حدث خطأ');
    } finally {
      setProcessing(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600">قيد المراجعة</Badge>;
      case 'approved': return <Badge className="bg-green-500/10 text-green-600">مقبول</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-600">مرفوض</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            طلبات الاستشاريين ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">لا توجد طلبات</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">التخصص</TableHead>
                  <TableHead className="text-right">سنوات الخبرة</TableHead>
                  <TableHead className="text-right">سعر الاستشارة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.profile_name || 'غير محدد'}</TableCell>
                    <TableCell>{req.specialty}</TableCell>
                    <TableCell>{req.years_experience || 0} سنة</TableCell>
                    <TableCell>{req.consultation_price || 0} ج.م</TableCell>
                    <TableCell>{statusBadge(req.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedRequest(req); setDetailsOpen(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {req.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(req)}
                              disabled={processing === req.id}
                            >
                              {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => { setRejectingId(req.id); setRejectDialogOpen(true); }}
                              disabled={processing === req.id}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب الاستشاري</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">الاسم</Label>
                  <p className="font-medium">{selectedRequest.profile_name || 'غير محدد'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">التخصص</Label>
                  <p className="font-medium">{selectedRequest.specialty}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">سنوات الخبرة</Label>
                  <p className="font-medium">{selectedRequest.years_experience || 0} سنة</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">سعر الاستشارة</Label>
                  <p className="font-medium">{selectedRequest.consultation_price || 0} ج.م</p>
                </div>
              </div>

              {selectedRequest.bio && (
                <div>
                  <Label className="text-muted-foreground">نبذة شخصية</Label>
                  <p className="mt-1">{selectedRequest.bio}</p>
                </div>
              )}

              {selectedRequest.photo_url && (
                <div>
                  <Label className="text-muted-foreground">الصورة الشخصية</Label>
                  <img src={selectedRequest.photo_url} alt="صورة الاستشاري" className="w-32 h-32 rounded-xl object-cover mt-2" />
                </div>
              )}

              {selectedRequest.video_url && (
                <div>
                  <Label className="text-muted-foreground">فيديو تعريفي</Label>
                  <div className="mt-2">
                    <a href={selectedRequest.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <ExternalLink className="w-4 h-4" />
                      مشاهدة الفيديو
                    </a>
                  </div>
                </div>
              )}

              {selectedRequest.certificates_urls && selectedRequest.certificates_urls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">الشهادات ({selectedRequest.certificates_urls.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRequest.certificates_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline text-sm">
                        <FileText className="w-4 h-4" />
                        شهادة {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-xl">
                  <Label className="text-red-600">سبب الرفض</Label>
                  <p className="mt-1 text-red-700 dark:text-red-400">{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>سبب رفض الطلب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب سبب رفض الطلب..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleReject} variant="destructive" className="flex-1" disabled={!!processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد الرفض'}
              </Button>
              <Button onClick={() => setRejectDialogOpen(false)} variant="outline" className="flex-1">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
