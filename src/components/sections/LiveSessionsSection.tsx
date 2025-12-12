import { motion } from 'framer-motion';
import { Video, Calendar, Clock, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import therapist1 from '@/assets/therapist-1.jpg';
import therapist2 from '@/assets/therapist-2.jpg';

const sessions = [
  {
    id: 1,
    title: 'ورشة عمل: التعامل مع ضغوط العمل',
    instructor: 'د. سارة أحمد',
    instructorImage: therapist1,
    date: '15 ديسمبر 2024',
    time: '7:00 مساءً',
    duration: '90 دقيقة',
    spots: 25,
    spotsLeft: 8,
    isLive: true,
  },
  {
    id: 2,
    title: 'محاضرة: فن التواصل الفعال',
    instructor: 'د. محمد علي',
    instructorImage: therapist2,
    date: '18 ديسمبر 2024',
    time: '8:00 مساءً',
    duration: '60 دقيقة',
    spots: 50,
    spotsLeft: 23,
    isLive: false,
  },
];

export const LiveSessionsSection = () => {
  return (
    <section id="live-sessions" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            جلسات مباشرة
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            تعلم مباشرة مع الخبراء
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            انضم لورش العمل والمحاضرات التفاعلية المباشرة واستفد من خبرة المتخصصين
          </p>
        </motion.div>

        {/* Sessions Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border/50 overflow-hidden group hover:shadow-elevated transition-all duration-500"
            >
              {/* Live Badge */}
              {session.isLive && (
                <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
                  مباشر قريباً
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Instructor Image */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden ring-4 ring-wellness-teal-light">
                    <img
                      src={session.instructorImage}
                      alt={session.instructor}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Session Info */}
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {session.title}
                  </h3>
                  <p className="text-primary font-medium mb-4">{session.instructor}</p>

                  {/* Session Details */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{session.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{session.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Video className="w-4 h-4" />
                      <span>{session.duration}</span>
                    </div>
                  </div>

                  {/* Spots & CTA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        <span className="text-primary font-bold">{session.spotsLeft}</span>
                        <span className="text-muted-foreground"> مقعد متبقي من {session.spots}</span>
                      </span>
                    </div>
                    <Button variant="default" size="sm" className="group/btn">
                      <span>احجز مقعدك</span>
                      <ArrowLeft className="w-4 h-4 group-hover/btn:-translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${((session.spots - session.spotsLeft) / session.spots) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-hero rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View Calendar Button */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button variant="outline" size="lg">
            <Calendar className="w-5 h-5 ml-2" />
            عرض التقويم الكامل
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
