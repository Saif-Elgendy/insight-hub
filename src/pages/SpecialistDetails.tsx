import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Brain, Star, Clock, Award, Calendar, MapPin, ArrowRight,
  Video, Phone, MessageCircle, CheckCircle, User, Briefcase, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SpecialistReviewsList } from '@/components/reviews/SpecialistReviewsList';

interface Specialist {
  id: string;
  full_name: string;
  title: string;
  specialty: string;
  bio: string | null;
  image_url: string | null;
  years_experience: number | null;
  rating: number | null;
  is_available: boolean | null;
}

interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_booked: boolean;
}

const consultationTypes = [
  { value: 'video', icon: Video, label: 'جلسة فيديو', duration: '60 دقيقة', price: 200 },
  { value: 'audio', icon: Phone, label: 'مكالمة صوتية', duration: '45 دقيقة', price: 150 },
  { value: 'chat', icon: MessageCircle, label: 'دردشة نصية', duration: '30 دقيقة', price: 100 },
] as const;

const SpecialistDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedType, setSelectedType] = useState<typeof consultationTypes[number] | null>(null);
  const [notes, setNotes] = useState('');
  const [showBookingSection, setShowBookingSection] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSpecialist();
    }
  }, [id]);

  useEffect(() => {
    if (specialist && selectedDate) {
      fetchTimeSlots();
    }
  }, [specialist, selectedDate]);

  const fetchSpecialist = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('specialists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching specialist:', error);
      toast.error('لم يتم العثور على المختص');
      navigate('/');
    } else {
      setSpecialist(data);
    }
    setLoading(false);
  };

  const fetchTimeSlots = async () => {
    if (!specialist || !selectedDate) return;

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('specialist_id', specialist.id)
      .eq('slot_date', formattedDate)
      .eq('is_booked', false)
      .order('slot_time');

    if (error) {
      console.error('Error fetching time slots:', error);
    } else {
      setTimeSlots(data || []);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً');
      navigate('/auth');
      return;
    }

    if (!specialist || !selectedType || !selectedSlot) {
      toast.error('يرجى إكمال جميع البيانات المطلوبة');
      return;
    }

    setBooking(true);

    const { error } = await supabase.rpc('book_consultation', {
      p_time_slot_id: selectedSlot.id,
      p_specialist_id: specialist.id,
      p_consultation_type: selectedType.value,
      p_price: selectedType.price,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Error creating consultation:', error);
      if (error.message.includes('not available')) {
        toast.error('عذراً، هذا الموعد لم يعد متاحاً. يرجى اختيار موعد آخر.');
        fetchTimeSlots();
        setSelectedSlot(null);
      } else if (error.message.includes('Authentication required')) {
        toast.error('يرجى تسجيل الدخول أولاً');
        navigate('/auth');
      } else {
        toast.error('حدث خطأ في حجز الاستشارة');
      }
      setBooking(false);
      return;
    }

    toast.success('تم حجز الاستشارة بنجاح! 🎉');
    setBooking(false);
    navigate('/my-consultations');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-gradient-hero text-primary-foreground py-6">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-48 bg-primary-foreground/20" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Skeleton className="h-96 rounded-2xl" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!specialist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">لم يتم العثور على المختص</h1>
          <Button asChild>
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-hero text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">نفسي</span>
            </Link>
            <Button variant="hero-outline" size="sm" asChild>
              <Link to="/" className="gap-2">
                <ArrowRight className="w-4 h-4" />
                العودة
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Specialist Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <Card className="sticky top-8 overflow-hidden">
              <div className="bg-gradient-hero p-6 text-primary-foreground text-center">
                <div className="w-28 h-28 rounded-full bg-primary-foreground/20 flex items-center justify-center text-4xl font-bold mx-auto mb-4">
                  {specialist.image_url ? (
                    <img
                      src={specialist.image_url}
                      alt={specialist.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    specialist.full_name.charAt(0)
                  )}
                </div>
                <h1 className="text-2xl font-bold">{specialist.full_name}</h1>
                <p className="text-primary-foreground/80 mt-1">{specialist.title}</p>
                <Badge className="mt-3 bg-primary-foreground/20 text-primary-foreground border-0">
                  {specialist.specialty}
                </Badge>
              </div>

              <CardContent className="p-6 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-xl">
                    <div className="flex items-center justify-center gap-1 text-lg font-bold text-primary">
                      <Star className="w-5 h-5 text-primary fill-primary" />
                      {specialist.rating || 5}
                    </div>
                    <span className="text-xs text-muted-foreground">التقييم</span>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-xl">
                    <div className="text-lg font-bold text-primary">
                      {specialist.years_experience || 0}+
                    </div>
                    <span className="text-xs text-muted-foreground">سنوات خبرة</span>
                  </div>
                </div>

                {/* Availability Status */}

                <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-xl">
                  <span
                    className={cn(
                      'w-3 h-3 rounded-full',
                      specialist.is_available ? 'bg-primary' : 'bg-destructive'
                    )}
                  />
                  <span className="text-sm font-medium">
                    {specialist.is_available ? 'متاح للاستشارات' : 'غير متاح حالياً'}
                  </span>
                </div>

                {/* Book Button */}
                {specialist.is_available && (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setShowBookingSection(!showBookingSection)}
                  >
                    <Calendar className="w-5 h-5 ml-2" />
                    {showBookingSection ? 'إخفاء الحجز' : 'احجز موعدك الآن'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Details Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    نبذة عن المختص
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {specialist.bio || 'لا توجد نبذة متاحة حالياً.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Services */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    الخدمات المقدمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {consultationTypes.map((type) => (
                      <div
                        key={type.value}
                        className="p-4 rounded-xl border border-border bg-muted/30 text-center"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mx-auto mb-3">
                          <type.icon className="w-6 h-6 text-primary" />
                        </div>
                        <h4 className="font-bold text-foreground">{type.label}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{type.duration}</p>
                        <p className="text-lg font-bold text-primary mt-2">{type.price} ر.س</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Booking Section */}
            {showBookingSection && specialist.is_available && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      حجز موعد استشارة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Step 1: Select Type */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                          1
                        </span>
                        اختر نوع الاستشارة
                      </h4>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {consultationTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setSelectedType(type)}
                            className={cn(
                              'p-4 rounded-xl border text-center transition-all',
                              selectedType?.value === type.value
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <type.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                            <h5 className="font-medium text-foreground text-sm">{type.label}</h5>
                            <p className="text-xs text-muted-foreground">{type.duration}</p>
                            <p className="text-sm font-bold text-primary mt-1">{type.price} ر.س</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Select Date */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                          2
                        </span>
                        اختر التاريخ
                      </h4>
                      <div className="flex justify-center">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) =>
                            date < new Date() ||
                            date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                          }
                          className="rounded-xl border"
                        />
                      </div>
                    </div>

                    {/* Step 3: Select Time */}
                    {selectedDate && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                            3
                          </span>
                          اختر الوقت - {format(selectedDate, 'EEEE d MMMM', { locale: ar })}
                        </h4>
                        {timeSlots.length === 0 ? (
                          <div className="text-center py-6 bg-muted rounded-xl">
                            <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">لا توجد أوقات متاحة في هذا اليوم</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {timeSlots.map((slot) => (
                              <Button
                                key={slot.id}
                                variant={selectedSlot?.id === slot.id ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedSlot(slot)}
                                className="flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3" />
                                {slot.slot_time.slice(0, 5)}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 4: Notes */}
                    {selectedSlot && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                            4
                          </span>
                          ملاحظات (اختياري)
                        </h4>
                        <Textarea
                          placeholder="أي ملاحظات تود مشاركتها مع المختص..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                          className="resize-none"
                          rows={3}
                          maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-left">
                          {notes.length}/1000
                        </p>
                      </div>
                    )}

                    {/* Summary & Book */}
                    {selectedType && selectedSlot && (
                      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-primary" />
                          ملخص الحجز
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">نوع الاستشارة:</span>
                            <span className="font-medium">{selectedType.label}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">التاريخ:</span>
                            <span className="font-medium">
                              {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: ar })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الوقت:</span>
                            <span className="font-medium">{selectedSlot.slot_time.slice(0, 5)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-bold">المبلغ الإجمالي:</span>
                            <span className="font-bold text-primary">{selectedType.price} ر.س</span>
                          </div>
                        </div>

                        <Button
                          className="w-full mt-4"
                          size="lg"
                          onClick={handleBooking}
                          disabled={booking}
                        >
                          {booking ? (
                            <>
                              <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin ml-2" />
                              جاري الحجز...
                            </>
                          ) : (
                            'تأكيد الحجز'
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Reviews Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <SpecialistReviewsList specialistId={specialist.id} />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SpecialistDetails;
