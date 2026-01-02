import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar, Clock, Video, Phone, MessageCircle, ArrowRight, CheckCircle, XCircle, Clock3, FileText, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ConsultationStatus = Database['public']['Enums']['consultation_status'];
type ConsultationType = Database['public']['Enums']['consultation_type'];

interface Consultation {
  id: string;
  consultation_type: ConsultationType;
  status: ConsultationStatus;
  price: number;
  notes: string | null;
  created_at: string;
  time_slot_id: string;
  time_slot: {
    slot_date: string;
    slot_time: string;
  };
  specialist: {
    full_name: string;
    specialty: string;
    image_url: string | null;
  };
}

const getStatusBadge = (status: ConsultationStatus) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock3 className="w-3 h-3" /> قيد الانتظار</Badge>;
    case 'confirmed':
      return <Badge className="gap-1 bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3" /> مؤكدة</Badge>;
    case 'cancelled':
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> ملغية</Badge>;
    case 'completed':
      return <Badge className="gap-1 bg-primary hover:bg-primary/90"><CheckCircle className="w-3 h-3" /> مكتملة</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getConsultationTypeIcon = (type: ConsultationType) => {
  switch (type) {
    case 'video':
      return <Video className="w-5 h-5" />;
    case 'audio':
      return <Phone className="w-5 h-5" />;
    case 'chat':
      return <MessageCircle className="w-5 h-5" />;
    default:
      return <MessageCircle className="w-5 h-5" />;
  }
};

const getConsultationTypeName = (type: ConsultationType) => {
  switch (type) {
    case 'video':
      return 'جلسة فيديو';
    case 'audio':
      return 'مكالمة صوتية';
    case 'chat':
      return 'دردشة نصية';
    default:
      return type;
  }
};

type FilterStatus = 'all' | ConsultationStatus;

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'confirmed', label: 'مؤكدة' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'cancelled', label: 'ملغية' },
];

type SortOrder = 'newest' | 'oldest';

const sortOptions: { value: SortOrder; label: string; icon: typeof ArrowUp }[] = [
  { value: 'newest', label: 'الأحدث أولاً', icon: ArrowDown },
  { value: 'oldest', label: 'الأقدم أولاً', icon: ArrowUp },
];

const StudentConsultations = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const filteredConsultations = consultations
    .filter((c) => filterStatus === 'all' || c.status === filterStatus)
    .sort((a, b) => {
      const dateA = new Date(a.time_slot?.slot_date || a.created_at).getTime();
      const dateB = new Date(b.time_slot?.slot_date || b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConsultations();
    }
  }, [user]);

  const fetchConsultations = async () => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          id,
          consultation_type,
          status,
          price,
          notes,
          created_at,
          time_slot_id,
          time_slot:time_slots!consultations_time_slot_id_fkey(slot_date, slot_time),
          specialist:specialists!consultations_specialist_id_fkey(full_name, specialty, image_url)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        ...item,
        time_slot: Array.isArray(item.time_slot) ? item.time_slot[0] : item.time_slot,
        specialist: Array.isArray(item.specialist) ? item.specialist[0] : item.specialist,
      })) as Consultation[];

      setConsultations(formattedData);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل الاستشارات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConsultation = async (consultationId: string, timeSlotId: string) => {
    setCancellingId(consultationId);
    try {
      // Update consultation status to cancelled
      const { error: consultationError } = await supabase
        .from('consultations')
        .update({ status: 'cancelled' })
        .eq('id', consultationId);

      if (consultationError) throw consultationError;

      // Free up the time slot
      const { error: slotError } = await supabase
        .from('time_slots')
        .update({ is_booked: false })
        .eq('id', timeSlotId);

      if (slotError) {
        console.error('Error freeing time slot:', slotError);
      }

      toast({
        title: 'تم إلغاء الاستشارة',
        description: 'تم إلغاء الاستشارة بنجاح',
      });

      // Refresh consultations
      fetchConsultations();
    } catch (error) {
      console.error('Error cancelling consultation:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إلغاء الاستشارة',
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4"
            >
              <ArrowRight className="w-4 h-4" />
              العودة للرئيسية
            </Link>
            <h1 className="text-3xl font-bold text-foreground">استشاراتي</h1>
            <p className="text-muted-foreground mt-2">عرض جميع استشاراتك وحالاتها</p>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const count = option.value === 'all' 
                  ? consultations.length 
                  : consultations.filter(c => c.status === option.value).length;
                
                return (
                  <Button
                    key={option.value}
                    variant={filterStatus === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(option.value)}
                    className="gap-2"
                  >
                    {option.label}
                    <Badge 
                      variant={filterStatus === option.value ? 'secondary' : 'outline'} 
                      className="text-xs px-1.5 py-0"
                    >
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
            
            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              {sortOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    variant={sortOrder === option.value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSortOrder(option.value)}
                    className="gap-1"
                  >
                    <Icon className="w-3 h-3" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </motion.div>

          {/* Consultations List */}
          {filteredConsultations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {filterStatus === 'all' ? 'لا توجد استشارات' : 'لا توجد استشارات بهذه الحالة'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {filterStatus === 'all' ? 'لم تقم بحجز أي استشارة بعد' : 'جرب تغيير الفلتر لعرض استشارات أخرى'}
              </p>
              {filterStatus === 'all' ? (
                <Button variant="default" asChild>
                  <Link to="/#consultations">احجز استشارة الآن</Link>
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setFilterStatus('all')}>
                  عرض جميع الاستشارات
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {filteredConsultations.map((consultation, index) => (
                <motion.div
                  key={consultation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-elevated transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Specialist Info */}
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
                            {consultation.specialist?.image_url ? (
                              <img 
                                src={consultation.specialist.image_url} 
                                alt={consultation.specialist.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xl font-bold">
                                {consultation.specialist?.full_name?.charAt(0) || '؟'}
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {consultation.specialist?.full_name || 'غير محدد'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {consultation.specialist?.specialty || 'مختص'}
                            </p>
                          </div>
                        </div>

                        {/* Consultation Details */}
                        <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Type */}
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              {getConsultationTypeIcon(consultation.consultation_type)}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">نوع الاستشارة</p>
                              <p className="font-medium text-foreground">
                                {getConsultationTypeName(consultation.consultation_type)}
                              </p>
                            </div>
                          </div>

                          {/* Date & Time */}
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">الموعد</p>
                              <p className="font-medium text-foreground">
                                {consultation.time_slot ? (
                                  <>
                                    {format(new Date(consultation.time_slot.slot_date), 'dd MMMM yyyy', { locale: ar })}
                                    <span className="text-muted-foreground mx-1">-</span>
                                    {consultation.time_slot.slot_time.slice(0, 5)}
                                  </>
                                ) : (
                                  'غير محدد'
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              ر.س
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">السعر</p>
                              <p className="font-medium text-foreground">{consultation.price} ر.س</p>
                            </div>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex flex-col items-start md:items-end gap-2">
                          {getStatusBadge(consultation.status)}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(consultation.created_at), 'dd/MM/yyyy', { locale: ar })}
                          </p>
                          
                          {/* Cancel Button - Only for pending consultations */}
                          {consultation.status === 'pending' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  className="mt-2"
                                  disabled={cancellingId === consultation.id}
                                >
                                  {cancellingId === consultation.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin ml-1" />
                                  ) : (
                                    <XCircle className="w-4 h-4 ml-1" />
                                  )}
                                  إلغاء الاستشارة
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent dir="rtl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد إلغاء الاستشارة</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من إلغاء هذه الاستشارة؟ لا يمكن التراجع عن هذا الإجراء.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-row-reverse gap-2">
                                  <AlertDialogCancel>تراجع</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCancelConsultation(consultation.id, consultation.time_slot_id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    نعم، إلغاء الاستشارة
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>

                      {/* Notes Section */}
                      {consultation.notes && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-primary mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-foreground mb-1">ملاحظات الدكتور</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {consultation.notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StudentConsultations;
