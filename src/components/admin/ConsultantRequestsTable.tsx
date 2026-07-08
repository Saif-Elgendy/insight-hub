import { useState, useEffect } from 'react';
import { Check, X, Eye, Loader2, FileText, ExternalLink, ShieldCheck, Globe } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ConsultantDocumentLink, ConsultantDocumentImage } from '@/components/consultant/ConsultantDocumentLink';

const SUPER_ADMIN_ID = '9a48cfb7-03ed-4df4-afc9-67a06d014d77';

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
  id_card_url: string | null;
  license_url: string | null;
  languages: string[] | null;
  rejection_reason: string | null;
  admin_reviewed_at: string | null;
  admin_reviewed_by: string | null;
  super_admin_approved_at: string | null;
  created_at: string;
  profile_name?: string | null;
}

export const ConsultantRequestsTable = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.id === SUPER_ADMIN_ID;
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

        return { ...req, profile_name: profile?.full_name || null };
      }));

      setRequests(enriched as ConsultantRequest[]);
    } catch (error) {
      console.error('Error fetching consultant requests:', error);
      toast.error('حدث خطأ أثناء تحميل طلبات الاستشاريين');
    } finally {
      setLoading(false);
    }
  };

  const validateDocuments = (req: ConsultantRequest): string | null => {
    if (!req.photo_url) return 'الصورة الشخصية مفقودة';
    if (!req.id_card_url) return 'بطاقة الهوية مفقودة';
    if (!req.license_url) return 'ترخيص مزاولة المهنة مفقود';
    if (!req.certificates_urls || req.certificates_urls.length === 0) return 'الشهادات العلمية مفقودة';
    return null;
  };

  // Stage 1: admin marks as admin_reviewed
  const handleAdminReview = async (request: ConsultantRequest) => {
    const missing = validateDocuments(request);
    if (missing) {
      toast.error('لا يمكن المراجعة: ' + missing);
      return;
    }
    setProcessing(request.id);
    try {
      const { error } = await supabase
        .from('consultant_requests')
        .update({ status: 'admin_reviewed', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'تم مراجعة طلبك من قبل الإدارة',
        message: 'تم اعتماد طلبك من قبل أحد المسؤولين، بانتظار التأكيد النهائي من السوبر آدمن.',
        type: 'consultant',
      });

      toast.success('تمت المراجعة - بانتظار تأكيد السوبر آدمن');
      fetchRequests();
    } catch (error) {
      console.error('Error reviewing:', error);
      toast.error('حدث خطأ أثناء المراجعة');
    } finally {
      setProcessing(null);
    }
  };

  // Super admin final approval (works from 'pending' or 'admin_reviewed')
  const handleFinalApprove = async (request: ConsultantRequest) => {
    if (!isSuperAdmin) {
      toast.error('الموافقة النهائية للسوبر آدمن فقط');
      return;
    }
    const missing = validateDocuments(request);
    if (missing) {
      toast.error('لا يمكن الاعتماد: ' + missing);
      return;
    }
    setProcessing(request.id);
    try {
      // If still pending, set admin_reviewed_at first to satisfy the DB trigger
      if (request.status === 'pending') {
        const { error: preErr } = await supabase
          .from('consultant_requests')
          .update({ status: 'admin_reviewed', reviewed_at: new Date().toISOString() })
          .eq('id', request.id);
        if (preErr) throw preErr;
      }

      // Update consultant_requests; trigger sync_specialist_on_approval will create/update specialists
      const { error: updateError } = await supabase
        .from('consultant_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Update role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'consultant' })
        .eq('user_id', request.user_id);

      if (roleError) throw roleError;

      // Sync languages on the specialist record
      if (request.languages && request.languages.length > 0) {
        await supabase
          .from('specialists')
          .update({ languages: request.languages })
          .eq('user_id', request.user_id);
      }

      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'تم اعتمادك نهائياً كاستشاري! 🎉',
        message: 'تهانينا! تم اعتماد طلبك بشكل نهائي ويمكنك الآن استقبال الاستشارات وتشخيص المرضى.',
        type: 'consultant',
      });

      toast.success('تم الاعتماد النهائي بنجاح');
      fetchRequests();
    } catch (error: any) {
      console.error('Error final approving:', error);
      toast.error(error?.message || 'حدث خطأ أثناء القبول');
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
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600">قبول مبدئي - بانتظار المستندات</Badge>;
      case 'admin_reviewed': return <Badge className="bg-blue-500/10 text-blue-600">بانتظار السوبر آدمن</Badge>;
      case 'approved': return <Badge className="bg-green-500/10 text-green-600">معتمد نهائياً</Badge>;
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

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'admin_reviewed');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const renderActions = (req: ConsultantRequest) => {
    const docsMissing = validateDocuments(req);
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(req); setDetailsOpen(true); }}>
          <Eye className="w-4 h-4 ml-1" /> عرض التفاصيل
        </Button>
        {(req.status === 'pending' || req.status === 'admin_reviewed') && isSuperAdmin && (
          <>
            {!docsMissing ? (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleFinalApprove(req)}
                disabled={processing === req.id}
              >
                {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 ml-1" />}
                اعتماد نهائي
              </Button>
            ) : (
              <span className="text-xs text-destructive">⚠️ {docsMissing}</span>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => { setRejectingId(req.id); setRejectDialogOpen(true); }}
              disabled={processing === req.id}
            >
              <X className="w-4 h-4 ml-1" /> رفض
            </Button>
          </>
        )}
        {(req.status === 'pending' || req.status === 'admin_reviewed') && !isSuperAdmin && (
          <span className="text-xs text-muted-foreground">بانتظار المسؤول الأعلى</span>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Highlighted Pending Requests Panel for Super Admin */}
      {isSuperAdmin && pendingRequests.length > 0 && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              🔔 طلبات بانتظار قرارك ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map(req => {
              const missing = validateDocuments(req);
              return (
                <div key={req.id} className="bg-card rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg">{req.profile_name || 'غير محدد'}</span>
                        {statusBadge(req.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-sm">
                        <div><span className="text-muted-foreground">التخصص:</span> <b>{req.specialty}</b></div>
                        <div><span className="text-muted-foreground">الخبرة:</span> <b>{req.years_experience || 0} سنة</b></div>
                        <div><span className="text-muted-foreground">السعر:</span> <b>{req.consultation_price || 0} ج.م</b></div>
                        <div><span className="text-muted-foreground">التاريخ:</span> <b>{new Date(req.created_at).toLocaleDateString('ar-EG')}</b></div>
                      </div>
                      {req.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{req.bio}</p>}
                      {missing ? (
                        <p className="text-xs text-destructive mt-2">⚠️ {missing}</p>
                      ) : (
                        <p className="text-xs text-emerald-600 mt-2">✅ جميع المستندات مرفوعة</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t">{renderActions(req)}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Rejected Requests with Reasons */}
      {rejectedRequests.length > 0 && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <X className="w-4 h-4" /> الطلبات المرفوضة ({rejectedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rejectedRequests.map(req => (
              <div key={req.id} className="bg-card rounded-lg border p-3 text-sm flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium">{req.profile_name || 'غير محدد'} — <span className="text-muted-foreground">{req.specialty}</span></div>
                  {req.rejection_reason && (
                    <div className="text-destructive mt-1">
                      <b>سبب الرفض:</b> {req.rejection_reason}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(req); setDetailsOpen(true); }}>
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}


    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            طلبات الاستشاريين ({requests.length})
            {isSuperAdmin && (
              <Badge className="bg-primary/10 text-primary mr-2">
                <ShieldCheck className="w-3 h-3 ml-1" />
                سوبر آدمن
              </Badge>
            )}
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
                  <TableHead className="text-right">الخبرة</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const docsMissing = validateDocuments(req);
                  return (
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedRequest(req); setDetailsOpen(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {req.status === 'pending' && (
                            <>
                              {isSuperAdmin && !docsMissing && (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleFinalApprove(req)}
                                  disabled={processing === req.id}
                                  title="اعتماد نهائي مباشر"
                                >
                                  {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                  <span className="text-xs mr-1">اعتماد نهائي</span>
                                </Button>
                              )}
                              {isSuperAdmin && docsMissing && (
                                <span className="text-xs text-muted-foreground">{docsMissing}</span>
                              )}
                              {!isSuperAdmin && (
                                <span className="text-xs text-muted-foreground">بانتظار المستندات والاعتماد من المسؤول الأعلى</span>
                              )}
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

                          {req.status === 'admin_reviewed' && isSuperAdmin && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleFinalApprove(req)}
                                disabled={processing === req.id}
                              >
                                {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                <span className="text-xs mr-1">اعتماد نهائي</span>
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
                          {req.status === 'admin_reviewed' && !isSuperAdmin && (
                            <span className="text-xs text-muted-foreground">بانتظار تأكيد المسؤول الأعلى</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

              {selectedRequest.languages && selectedRequest.languages.length > 0 && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Globe className="w-4 h-4" /> اللغات
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRequest.languages.map((l, i) => (
                      <Badge key={i} variant="secondary">{l}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.bio && (
                <div>
                  <Label className="text-muted-foreground">نبذة شخصية</Label>
                  <p className="mt-1">{selectedRequest.bio}</p>
                </div>
              )}

              {selectedRequest.photo_url && (
                <div>
                  <Label className="text-muted-foreground">الصورة الشخصية</Label>
                  <ConsultantDocumentImage path={selectedRequest.photo_url} alt="صورة الاستشاري" className="w-32 h-32 rounded-xl object-cover mt-2" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">بطاقة الهوية</Label>
                  {selectedRequest.id_card_url ? (
                    <ConsultantDocumentLink path={selectedRequest.id_card_url} className="flex items-center gap-1 text-primary hover:underline mt-1">
                      <ExternalLink className="w-4 h-4" /> عرض البطاقة
                    </ConsultantDocumentLink>
                  ) : <p className="text-destructive text-sm mt-1">غير مرفوعة</p>}
                </div>
                <div>
                  <Label className="text-muted-foreground">ترخيص مزاولة المهنة</Label>
                  {selectedRequest.license_url ? (
                    <ConsultantDocumentLink path={selectedRequest.license_url} className="flex items-center gap-1 text-primary hover:underline mt-1">
                      <ExternalLink className="w-4 h-4" /> عرض الترخيص
                    </ConsultantDocumentLink>
                  ) : <p className="text-destructive text-sm mt-1">غير مرفوع</p>}
                </div>
              </div>

              {selectedRequest.video_url && (
                <div>
                  <Label className="text-muted-foreground">فيديو تعريفي</Label>
                  <div className="mt-2">
                    <ConsultantDocumentLink path={selectedRequest.video_url} className="flex items-center gap-2 text-primary hover:underline">
                      <ExternalLink className="w-4 h-4" />
                      مشاهدة الفيديو
                    </ConsultantDocumentLink>
                  </div>
                </div>
              )}

              {selectedRequest.certificates_urls && selectedRequest.certificates_urls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">الشهادات ({selectedRequest.certificates_urls.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRequest.certificates_urls.map((url, i) => (
                      <ConsultantDocumentLink key={i} path={url} className="flex items-center gap-1 text-primary hover:underline text-sm">
                        <FileText className="w-4 h-4" />
                        شهادة {i + 1}
                      </ConsultantDocumentLink>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.admin_reviewed_at && (
                <div className="bg-blue-500/10 p-3 rounded-xl text-sm">
                  ✅ تمت مراجعة الآدمن في {new Date(selectedRequest.admin_reviewed_at).toLocaleString('ar-EG')}
                </div>
              )}
              {selectedRequest.super_admin_approved_at && (
                <div className="bg-emerald-500/10 p-3 rounded-xl text-sm">
                  ✅ تم القبول النهائي من السوبر آدمن في {new Date(selectedRequest.super_admin_approved_at).toLocaleString('ar-EG')}
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
