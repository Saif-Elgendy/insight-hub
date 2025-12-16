import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Brain, Calendar, Clock, User, Video, Phone, MessageSquare,
  Check, X, Loader2, ArrowLeft, Filter, FileText, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  patient_name?: string | null;
  patient_phone?: string | null;
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

const DoctorConsultations = () => {
  const { user, loading: authLoading } = useAuth();
  const { isDoctor, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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
    if (isDoctor && user) {
      fetchConsultations();
    }
  }, [isDoctor, user]);

  const fetchConsultations = async () => {
    try {
      // First get the specialist id for the current user
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

      // Get consultations with separate queries for related data
      const { data: consultationsData, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('specialist_id', specialist.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich with profile and time slot data
      const enrichedData = await Promise.all((consultationsData || []).map(async (consultation) => {
        // Get profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', consultation.user_id)
          .maybeSingle();
        
        // Get time slot
        const { data: slotData } = await supabase
          .from('time_slots')
          .select('slot_date, slot_time')
          .eq('id', consultation.time_slot_id)
          .maybeSingle();
        
        return {
          ...consultation,
          patient_name: profileData?.full_name || null,
          patient_phone: profileData?.phone || null,
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

  const updateStatus = async (consultationId: string, newStatus: ConsultationStatus) => {
    setUpdating(consultationId);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ status: newStatus })
        .eq('id', consultationId);

      if (error) throw error;
      
      toast.success('تم تحديث حالة الاستشارة');
      fetchConsultations();
    } catch (error) {
      console.error('Error updating consultation:', error);
      toast.error('حدث خطأ أثناء تحديث الحالة');
    } finally {
      setUpdating(null);
    }
  };

  const filteredConsultations = statusFilter === 'all' 
    ? consultations 
    : consultations.filter(c => c.status === statusFilter);

  const openDetails = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setDoctorNotes(consultation.notes || '');
    setDetailsOpen(true);
  };

  const saveNotes = async () => {
    if (!selectedConsultation) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ notes: doctorNotes.trim() || null })
        .eq('id', selectedConsultation.id);

      if (error) throw error;
      
      toast.success('تم حفظ الملاحظات');
      setConsultations(prev => 
        prev.map(c => c.id === selectedConsultation.id 
          ? { ...c, notes: doctorNotes.trim() || null } 
          : c
        )
      );
      setSelectedConsultation(prev => prev ? { ...prev, notes: doctorNotes.trim() || null } : null);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('حدث خطأ أثناء حفظ الملاحظات');
    } finally {
      setSavingNotes(false);
    }
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
          <div className="flex items-center gap-4">
            <Link to="/doctor-dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">إدارة الاستشارات</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/doctor-dashboard">
              <Button variant="outline">لوحة التحكم</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filter */}
        <div className="flex items-center justify-between mb-6">
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
            <p className="text-muted-foreground">
              {statusFilter === 'all' 
                ? 'لم يتم حجز أي استشارات بعد'
                : 'لا توجد استشارات بهذه الحالة'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConsultations.map((consultation, index) => {
              const TypeIcon = typeConfig[consultation.consultation_type].icon;
              return (
                <motion.div
                  key={consultation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${typeConfig[consultation.consultation_type].color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">
                          استشارة {typeConfig[consultation.consultation_type].label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {consultation.price} ر.س
                        </p>
                      </div>
                    </div>
                    <Badge className={statusConfig[consultation.status].color}>
                      {statusConfig[consultation.status].label}
                    </Badge>
                  </div>

                  {/* Patient Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{consultation.patient_name || 'مستخدم'}</span>
                    </div>
                    {consultation.slot_date && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {format(new Date(consultation.slot_date), 'EEEE, d MMMM yyyy', { locale: ar })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{consultation.slot_time}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {consultation.notes && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      <FileText className="w-3 h-3" />
                      يوجد ملاحظات
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-border">
                    {consultation.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="hero"
                          className="flex-1"
                          onClick={() => updateStatus(consultation.id, 'confirmed')}
                          disabled={updating === consultation.id}
                        >
                          {updating === consultation.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 ml-1" />
                              تأكيد
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatus(consultation.id, 'cancelled')}
                          disabled={updating === consultation.id}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {consultation.status === 'confirmed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => updateStatus(consultation.id, 'completed')}
                        disabled={updating === consultation.id}
                      >
                        {updating === consultation.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'إكمال الاستشارة'
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDetails(consultation)}
                    >
                      التفاصيل
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل الاستشارة</DialogTitle>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">نوع الاستشارة</span>
                <span className="font-medium">
                  {typeConfig[selectedConsultation.consultation_type].label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الحالة</span>
                <Badge className={statusConfig[selectedConsultation.status].color}>
                  {statusConfig[selectedConsultation.status].label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المريض</span>
                <span className="font-medium">
                  {selectedConsultation.patient_name || 'غير محدد'}
                </span>
              </div>
              {selectedConsultation.patient_phone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الهاتف</span>
                  <span className="font-medium" dir="ltr">
                    {selectedConsultation.patient_phone}
                  </span>
                </div>
              )}
              {selectedConsultation.slot_date && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">التاريخ</span>
                    <span className="font-medium">
                      {format(new Date(selectedConsultation.slot_date), 'd MMMM yyyy', { locale: ar })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">الوقت</span>
                    <span className="font-medium">
                      {selectedConsultation.slot_time}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">السعر</span>
                <span className="font-medium">{selectedConsultation.price} ر.س</span>
              </div>
              
              {/* Doctor Notes Section */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">ملاحظات الطبيب</span>
                </div>
                <Textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="أضف ملاحظاتك هنا..."
                  className="min-h-[100px] mb-3"
                  maxLength={1000}
                />
                <Button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="w-full"
                >
                  {savingNotes ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  حفظ الملاحظات
                </Button>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                تم الحجز في {format(new Date(selectedConsultation.created_at), 'd MMMM yyyy - HH:mm', { locale: ar })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorConsultations;
