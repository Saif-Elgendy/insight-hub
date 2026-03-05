import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, Video, Phone, MessageCircle, Star, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Specialist {
  id: string;
  full_name: string;
  title: string;
  specialty: string;
  bio: string | null;
  image_url: string | null;
  years_experience: number | null;
  rating: number | null;
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

const platformOptions = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'webex', label: 'Webex' },
  { value: 'phone', label: 'مكالمة هاتفية' },
];

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BookingDialog = ({ open, onOpenChange }: BookingDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [selectedType, setSelectedType] = useState<typeof consultationTypes[number] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [communicationPlatform, setCommunicationPlatform] = useState('');

  const isPastDate = (date: Date) => {
    const selectedDay = new Date(date);
    selectedDay.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selectedDay < today;
  };

  useEffect(() => {
    if (open) {
      fetchSpecialists();
    }
  }, [open]);

  useEffect(() => {
    if (selectedSpecialist && selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedSpecialist, selectedDate]);

  const fetchSpecialists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('specialists')
      .select('*')
      .eq('is_available', true);
    
    if (error) {
      console.error('Error fetching specialists:', error);
      toast.error('حدث خطأ في تحميل المدربين');
    } else {
      setSpecialists(data || []);
    }
    setLoading(false);
  };

  const fetchTimeSlots = async () => {
    if (!selectedSpecialist || !selectedDate) return;
    
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('specialist_id', selectedSpecialist.id)
      .eq('slot_date', formattedDate)
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
      onOpenChange(false);
      navigate('/auth');
      return;
    }

    // Check if user is banned
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profile?.is_banned) {
      toast.error('تم إيقاف حسابك بسبب المخالفات. لا يمكنك حجز استشارات.');
      return;
    }

    if (!selectedSpecialist || !selectedType || !selectedSlot) {
      toast.error('يرجى إكمال جميع الخطوات');
      return;
    }

    // Validate phone for audio with phone platform
    if (selectedType.value === 'audio' && communicationPlatform === 'phone' && !patientPhone.trim()) {
      toast.error('يرجى إدخال رقم الهاتف للمكالمة الصوتية');
      return;
    }

    setBooking(true);

    const { data, error } = await supabase.rpc('book_consultation', {
      p_time_slot_id: selectedSlot.id,
      p_specialist_id: selectedSpecialist.id,
      p_consultation_type: selectedType.value,
      p_price: selectedType.price,
      p_notes: notes || null,
      p_patient_phone: (selectedType.value === 'audio' && communicationPlatform === 'phone') ? patientPhone.trim() : null,
      p_communication_platform: (selectedType.value === 'audio' || selectedType.value === 'video') ? communicationPlatform || null : null,
    });

    if (error) {
      console.error('Error creating consultation:', error);
      if (error.message.includes('not available')) {
        toast.error('عذراً، هذا الموعد لم يعد متاحاً. يرجى اختيار موعد آخر.');
        fetchTimeSlots();
        setSelectedSlot(null);
      } else if (error.message.includes('Authentication required')) {
        toast.error('يرجى تسجيل الدخول أولاً');
        onOpenChange(false);
        navigate('/auth');
      } else {
        toast.error('حدث خطأ في حجز الاستشارة');
      }
      setBooking(false);
      return;
    }

    toast.success('تم حجز الاستشارة بنجاح!');
    setBooking(false);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setStep(1);
    setSelectedSpecialist(null);
    setSelectedType(null);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setNotes('');
    setPatientPhone('');
    setCommunicationPlatform('');
  };

  const canProceed = () => {
    switch (step) {
      case 1: return selectedSpecialist !== null;
      case 2: return selectedType !== null;
      case 3: return selectedSlot !== null;
      default: return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            حجز استشارة
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <nav className="flex justify-center gap-2 mb-6" aria-label="مراحل الحجز">
            {[
              { num: 1, label: 'اختيار المدرب' },
              { num: 2, label: 'نوع الاستشارة' },
              { num: 3, label: 'اختيار الموعد' },
              { num: 4, label: 'تأكيد الحجز' }
          ].map((s) => (
            <div
              key={s.num}
              role="listitem"
              aria-current={step === s.num ? 'step' : undefined}
              aria-label={`${s.label} - ${step > s.num ? 'مكتملة' : step === s.num ? 'الخطوة الحالية' : 'قادمة'}`}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                step >= s.num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {step > s.num ? <CheckCircle className="w-5 h-5" aria-hidden="true" /> : s.num}
            </div>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Specialist */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-center mb-4">اختر المدرب</h3>
              <div className="grid gap-3">
                {specialists.map((specialist) => (
                  <button
                    key={specialist.id}
                    type="button"
                    onClick={() => setSelectedSpecialist(specialist)}
                    aria-pressed={selectedSpecialist?.id === specialist.id}
                    aria-label={`اختيار ${specialist.full_name} - ${specialist.title}`}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all text-right w-full',
                      selectedSpecialist?.id === specialist.id
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-accent flex items-center justify-center text-xl font-bold text-primary">
                        {specialist.full_name.charAt(0)}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-foreground">{specialist.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{specialist.title}</p>
                        <p className="text-sm text-primary">{specialist.specialty}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {specialist.rating}
                          </span>
                          <span>{specialist.years_experience} سنوات خبرة</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Consultation Type */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-center mb-4">نوع الاستشارة</h3>
              <div className="grid gap-3">
                {consultationTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setSelectedType(type);
                      // Reset phone/platform when type changes
                      setPatientPhone('');
                      setCommunicationPlatform('');
                    }}
                    aria-pressed={selectedType?.value === type.value}
                    aria-label={`اختيار ${type.label} - ${type.duration} - ${type.price} ريال`}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all text-right w-full',
                      selectedType?.value === type.value
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                        <type.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-foreground">{type.label}</h4>
                        <p className="text-sm text-muted-foreground">{type.duration}</p>
                      </div>
                      <div className="text-lg font-bold text-primary">{type.price} ج.م</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Select Date & Time */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-center mb-4">اختر الموعد</h3>
              
              <div className="flex justify-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full max-w-sm justify-start text-right font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, 'PPP', { locale: ar })
                      ) : (
                        <span>اختر التاريخ</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999] bg-popover" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                       disabled={isPastDate}
                       initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {selectedDate && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-3 text-center">المواعيد</h4>
                  {timeSlots.length === 0 ? (
                    <p className="text-center text-muted-foreground">لا توجد مواعيد في هذا اليوم</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {timeSlots.map((slot) => {
                        const isBooked = slot.is_booked;
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <Button
                            key={slot.id}
                            variant={isSelected ? 'default' : isBooked ? 'ghost' : 'outline'}
                            size="sm"
                            onClick={() => !isBooked && setSelectedSlot(slot)}
                            disabled={isBooked}
                            className={cn(
                              "flex items-center gap-1 relative",
                              isBooked && "opacity-50 line-through cursor-not-allowed bg-destructive/10 text-destructive border-destructive/20",
                              !isBooked && !isSelected && "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
                            )}
                            aria-pressed={isSelected}
                            aria-label={isBooked ? `الوقت ${slot.slot_time.slice(0, 5)} - محجوز` : `اختيار الوقت ${slot.slot_time.slice(0, 5)} - متاح`}
                          >
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            {slot.slot_time.slice(0, 5)}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded border border-green-300 bg-green-50 dark:bg-green-950/30"></span>
                      متاح
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-destructive/10 border border-destructive/20"></span>
                      محجوز
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-center mb-4">تأكيد الحجز</h3>
              
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المدرب:</span>
                  <span className="font-medium">{selectedSpecialist?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">نوع الاستشارة:</span>
                  <span className="font-medium">{selectedType?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">التاريخ:</span>
                  <span className="font-medium">
                    {selectedDate && format(selectedDate, 'PPP', { locale: ar })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الوقت:</span>
                  <span className="font-medium">{selectedSlot?.slot_time.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-bold">المبلغ الإجمالي:</span>
                  <span className="font-bold text-primary">{selectedType?.price} ج.م</span>
                </div>
              </div>

              {/* Audio consultation: communication method */}
              {selectedType?.value === 'audio' && (
                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <Label className="font-semibold">طريقة التواصل للمكالمة الصوتية</Label>
                  <Select value={communicationPlatform} onValueChange={(val) => {
                    setCommunicationPlatform(val);
                    if (val !== 'phone') setPatientPhone('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر طريقة التواصل" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {communicationPlatform === 'phone' && (
                    <div>
                      <Label>رقم الهاتف</Label>
                      <Input
                        type="tel"
                        placeholder="05xxxxxxxx"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value.slice(0, 15))}
                        className="mt-1"
                        dir="ltr"
                        maxLength={15}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Video consultation: platform selection */}
              {selectedType?.value === 'video' && (
                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <Label className="font-semibold">منصة الاجتماع المفضلة (اختياري)</Label>
                  <Select value={communicationPlatform} onValueChange={setCommunicationPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المنصة المفضلة" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.filter(p => p.value !== 'phone').map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">سيقوم المدرب بإرسال رابط الاجتماع قبل الموعد</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">ملاحظات (اختياري)</label>
                <Textarea
                  placeholder="أي ملاحظات تود مشاركتها مع المدرب..."
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <nav className="flex gap-3 mt-6" aria-label="خطوات الحجز">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1"
              aria-label="العودة للخطوة السابقة"
            >
              السابق
            </Button>
          )}
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1"
              aria-label={`الانتقال للخطوة ${step + 1} من 4`}
            >
              التالي
            </Button>
          ) : (
            <Button
              onClick={handleBooking}
              disabled={booking}
              className="flex-1"
              aria-label="تأكيد حجز الاستشارة"
              aria-busy={booking}
            >
              {booking ? 'جاري الحجز...' : 'تأكيد الحجز'}
            </Button>
          )}
        </nav>
      </DialogContent>
    </Dialog>
  );
};
