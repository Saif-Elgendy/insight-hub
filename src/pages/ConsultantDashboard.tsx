import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Brain, Calendar, Clock, User, Video, Phone, MessageSquare,
  Check, X, Loader2, Filter, FileText, Save, ExternalLink, AlertTriangle, Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MessagesInbox from '@/components/dashboard/MessagesInbox';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type ConsultationStatus = Database['public']['Enums']['consultation_status'];
type ConsultationType = Database['public']['Enums']['consultation_type'];

interface Consultation {
  id: string;
  user_id: string;
  specialist_id: string;
  time_slot_id: string;
  consultation_type: ConsultationType;
  status: ConsultationStatus;
  notes: string | null;
  price: number;
  created_at: string;
  updated_at: string;
  meeting_link: string | null;
  patient_phone?: string | null;
  communication_platform: string | null;
  rejection_reason: string | null;
  patient_name?: string | null;
  profile_phone?: string | null;
  slot_date?: string | null;
  slot_time?: string | null;
}

const statusConfig = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  confirmed: { label: 'مؤكد', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  completed: { label: 'مكتمل', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  cancelled: { label: 'ملغي', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const typeConfig = {
  video: { label: 'فيديو', icon: Video, color: 'text-purple-500' },
  audio: { label: 'صوتي', icon: Phone, color: 'text-green-500' },
  chat: { label: 'نصي', icon: MessageSquare, color: 'text-blue-500' },
};

const ConsultantDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isConsultant, isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [savingMeetingLink, setSavingMeetingLink] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Profile completion state
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && !isConsultant && !isAdmin && user) {
      toast.error('ليس لديك صلاحية الوصول لهذه الصفحة');
      navigate('/profile');
    }
  }, [roleLoading, isConsultant, isAdmin, user, navigate]);

  useEffect(() => {
    if ((isConsultant || isAdmin) && user) {
      fetchConsultations();
      checkRequestStatus();
    }
  }, [isConsultant, isAdmin, user]);

  const checkRequestStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('consultant_requests')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    setRequestStatus(data?.status || null);
  };

  const fetchConsultations = async () => {
    try {
      const { data: specialist, error: specialistError } = await supabase
        .from('specialists')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (specialistError) throw specialistError;

      if (!specialist) {
        setConsultations([]);
        setLoading(false);
        return;
      }

      setSpecialistId(specialist.id);

      const { data: consultationsData, error } = await supabase
        .from('consultations')
        .select('id, user_id, specialist_id, time_slot_id, consultation_type, status, notes, price, created_at, updated_at, meeting_link, communication_platform, rejection_reason')
        .eq('specialist_id', specialist.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Auto-expire old pending consultations
      const now = new Date();
      const enrichedData = await Promise.all((consultationsData || []).map(async (consultation) => {
        // Check if pending consultation is older than 2 days
        const createdAt = new Date(consultation.created_at);
        const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        if (consultation.status === 'pending' && diffHours > 48) {
          await supabase
            .from('consultations')
            .update({ status: 'cancelled', rejection_reason: 'تم الرفض تلقائياً بسبب عدم الرد خلال يومين' } as any)
            .eq('id', consultation.id);
          consultation.status = 'cancelled';
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', consultation.user_id)
          .maybeSingle();

        const { data: slotData } = await supabase
          .from('time_slots')
          .select('slot_date, slot_time')
          .eq('id', consultation.time_slot_id)
          .maybeSingle();

        return {
          ...consultation,
          rejection_reason: (consultation as any).rejection_reason || null,
          patient_name: profileData?.full_name || null,
          profile_phone: profileData?.phone || null,
          slot_date: slotData?.slot_date || null,
          slot_time: slotData?.slot_time || null,
        };
      }));

      setConsultations(enrichedData);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast.error('حدث خطأ أثناء تحميل الاستشارات');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (consultationId: string) => {
    setUpdating(consultationId);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ status: 'confirmed' })
        .eq('id', consultationId);

      if (error) throw error;
      toast.success('تم قبول الاستشارة');
      fetchConsultations();
    } catch (error) {
      console.error('Error accepting consultation:', error);
      toast.error('حدث خطأ');
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) {
      toast.error('يرجى كتابة سبب الرفض');
      return;
    }

    setUpdating(rejectingId);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ 
          status: 'cancelled',
          rejection_reason: rejectionReason.trim()
        } as any)
        .eq('id', rejectingId);

      if (error) throw error;
      toast.success('تم رفض الاستشارة');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setRejectingId(null);
      fetchConsultations();
    } catch (error) {
      console.error('Error rejecting consultation:', error);
      toast.error('حدث خطأ');
    } finally {
      setUpdating(null);
    }
  };

  const handleComplete = async (consultationId: string) => {
    setUpdating(consultationId);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ status: 'completed' })
        .eq('id', consultationId);

      if (error) throw error;
      toast.success('تم إكمال الاستشارة');
      fetchConsultations();
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast.error('حدث خطأ');
    } finally {
      setUpdating(null);
    }
  };

  const saveMeetingLink = async () => {
    if (!selectedConsultation) return;
    setSavingMeetingLink(true);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ meeting_link: meetingLink.trim() || null })
        .eq('id', selectedConsultation.id);

      if (error) throw error;
      toast.success('تم حفظ رابط الاجتماع');
      setConsultations(prev =>
        prev.map(c => c.id === selectedConsultation.id
          ? { ...c, meeting_link: meetingLink.trim() || null }
          : c
        )
      );
    } catch (error) {
      toast.error('حدث خطأ');
    } finally {
      setSavingMeetingLink(false);
    }
  };

  const filteredConsultations = statusFilter === 'all'
    ? consultations
    : consultations.filter(c => c.status === statusFilter);

  const stats = {
    total: consultations.length,
    pending: consultations.filter(c => c.status === 'pending').length,
    confirmed: consultations.filter(c => c.status === 'confirmed').length,
    completed: consultations.filter(c => c.status === 'completed').length,
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
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">لوحة تحكم الاستشاري</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/profile">
              <Button variant="outline">الملف الشخصي</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">إجمالي الاستشارات</CardTitle>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">قيد الانتظار</CardTitle>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">مؤكدة</CardTitle>
              <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">مكتملة</CardTitle>
              <p className="text-3xl font-bold text-blue-600">{stats.completed}</p>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="consultations" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="consultations">الاستشارات</TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 ml-2" />
              المحادثات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consultations" className="space-y-6 mt-6">
            {/* Filter */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">الاستشارات ({filteredConsultations.length})</h2>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="فلتر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="confirmed">مؤكد</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Consultations Grid */}
            {filteredConsultations.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">لا توجد استشارات</h3>
                <p className="text-muted-foreground">لم يتم حجز أي استشارات بعد</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredConsultations.map((consultation, index) => {
                  const TypeIcon = typeConfig[consultation.consultation_type].icon;
                  const createdAt = new Date(consultation.created_at);
                  const diffHours = (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                  const isUrgent = consultation.status === 'pending' && diffHours > 24;

                  return (
                    <motion.div
                      key={consultation.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`bg-card rounded-2xl border p-6 hover:shadow-lg transition-shadow ${
                        isUrgent ? 'border-yellow-500' : 'border-border'
                      }`}
                    >
                      {isUrgent && (
                        <div className="flex items-center gap-2 text-yellow-600 text-sm mb-3">
                          <AlertTriangle className="w-4 h-4" />
                          <span>يرجى الرد قبل الرفض التلقائي</span>
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${typeConfig[consultation.consultation_type].color}`}>
                            <TypeIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{consultation.patient_name || 'مريض'}</h3>
                            <p className="text-sm text-muted-foreground">{typeConfig[consultation.consultation_type].label}</p>
                          </div>
                        </div>
                        <Badge className={statusConfig[consultation.status].color}>
                          {statusConfig[consultation.status].label}
                        </Badge>
                      </div>

                      {/* Date/Time */}
                      <div className="space-y-2 mb-4 text-sm">
                        {consultation.slot_date && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(consultation.slot_date), 'dd MMMM yyyy', { locale: ar })}</span>
                          </div>
                        )}
                        {consultation.slot_time && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{consultation.slot_time}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span>{consultation.price} ج.م</span>
                        </div>
                        {consultation.communication_platform && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <ExternalLink className="w-4 h-4" />
                            <span>{consultation.communication_platform}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {(consultation.status === 'confirmed' || consultation.status === 'pending') && (
                          <Link to={`/chat/${consultation.id}`} className="flex-1 min-w-[120px]">
                            <Button size="sm" variant="outline" className="w-full">
                              <MessageSquare className="w-4 h-4 ml-1" />
                              محادثة
                            </Button>
                          </Link>
                        )}
                        {consultation.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="flex-1 min-w-[100px]"
                              onClick={() => handleAccept(consultation.id)}
                              disabled={updating === consultation.id}
                            >
                              <Check className="w-4 h-4 ml-1" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 min-w-[100px]"
                              onClick={() => {
                                setRejectingId(consultation.id);
                                setRejectDialogOpen(true);
                              }}
                              disabled={updating === consultation.id}
                            >
                              <X className="w-4 h-4 ml-1" />
                              رفض
                            </Button>
                          </>
                        )}
                        {consultation.status === 'confirmed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 min-w-[120px]"
                              onClick={() => {
                                setSelectedConsultation(consultation);
                                setMeetingLink(consultation.meeting_link || '');
                                setDetailsOpen(true);
                              }}
                            >
                              <ExternalLink className="w-4 h-4 ml-1" />
                              رابط الاجتماع
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 min-w-[100px]"
                              onClick={() => handleComplete(consultation.id)}
                              disabled={updating === consultation.id}
                            >
                              <Check className="w-4 h-4 ml-1" />
                              إكمال
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <h2 className="text-2xl font-bold mb-4">المحادثات الواردة</h2>
            {user && specialistId ? (
              <MessagesInbox userId={user.id} specialistId={specialistId} />
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                لا يمكن تحميل المحادثات. يجب أن تكون مسجلاً كاستشاري معتمد.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>سبب رفض الاستشارة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>سبب الرفض</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب رفض الاستشارة..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReject} variant="destructive" className="flex-1" disabled={!!updating}>
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد الرفض'}
              </Button>
              <Button onClick={() => setRejectDialogOpen(false)} variant="outline" className="flex-1">
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Link Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رابط الاجتماع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>رابط الاجتماع ({selectedConsultation?.communication_platform || 'غير محدد'})</Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://..."
                dir="ltr"
              />
            </div>
            <Button onClick={saveMeetingLink} className="w-full" disabled={savingMeetingLink}>
              {savingMeetingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ الرابط
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsultantDashboard;
