import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Video, Phone, Shield, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingDialog } from '@/components/booking/BookingDialog';
import therapist1 from '@/assets/therapist-1.jpg';
import therapist2 from '@/assets/therapist-2.jpg';
const consultationTypes = [
  {
    icon: Video,
    title: 'جلسة فيديو',
    description: 'جلسة تفاعلية وجهاً لوجه عبر الفيديو',
    duration: '60 دقيقة',
    price: '200 ر.س',
  },
  {
    icon: Phone,
    title: 'مكالمة صوتية',
    description: 'استشارة صوتية خاصة ومريحة',
    duration: '45 دقيقة',
    price: '150 ر.س',
  },
  {
    icon: MessageCircle,
    title: 'دردشة نصية',
    description: 'تواصل مكتوب مع المختص',
    duration: '30 دقيقة',
    price: '100 ر.س',
  },
];

const features = [
  'خصوصية تامة وسرية المعلومات',
  'مختصين معتمدين ومرخصين',
  'جدولة مرنة تناسب وقتك',
  'متابعة مستمرة بعد الجلسة',
];

const specialists = [
  { image: therapist1, name: 'د. سارة أحمد' },
  { image: therapist2, name: 'د. محمد علي' },
];

export const ConsultationsSection = () => {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <section id="consultations" className="py-24 bg-wellness-cream">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              استشارات فردية
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              جلسة خاصة مع
              <span className="text-gradient"> مختص </span>
              تناسب احتياجاتك
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              احصل على دعم شخصي من خبراء الصحة النفسية المعتمدين.
              جلسات خاصة ومخصصة لمساعدتك في التغلب على التحديات.
            </p>

            {/* Features List */}
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* Specialists */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3 space-x-reverse">
                {specialists.map((specialist, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-full border-2 border-background overflow-hidden"
                  >
                    <img
                      src={specialist.image}
                      alt={specialist.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                <div className="w-12 h-12 rounded-full border-2 border-background bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                  +28
                </div>
              </div>
              <span className="text-muted-foreground text-sm">
                +30 مختص جاهز لمساعدتك
              </span>
            </div>
          </motion.div>

          {/* Right Column - Consultation Types */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {consultationTypes.map((type, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-card rounded-2xl p-6 shadow-card border border-border/50 hover:shadow-elevated transition-all duration-500 group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center group-hover:bg-gradient-hero transition-all duration-300">
                    <type.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {type.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      {type.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{type.duration}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-primary font-bold">{type.price}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="wellness" size="sm" className="self-center" onClick={() => setBookingOpen(true)}>
                    احجز الآن
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} />
    </section>
  );
};
