import { motion } from 'framer-motion';
import { Award, BadgeCheck, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CertificatesSection = () => {
  return (
    <section id="certificates" className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Certificate Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Certificate Card */}
            <div className="relative bg-gradient-to-br from-wellness-cream to-card rounded-3xl p-8 md:p-12 shadow-elevated border border-border">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-hero opacity-10 blur-3xl rounded-full" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-wellness-lavender opacity-30 blur-3xl rounded-full" />

              {/* Certificate Content */}
              <div className="relative text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-hero flex items-center justify-center mb-6">
                  <Award className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="text-sm text-muted-foreground mb-2">شهادة إتمام</div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  إدارة القلق والتوتر
                </h3>
                <div className="w-24 h-1 bg-gradient-hero mx-auto mb-6 rounded-full" />
                <p className="text-lg text-foreground mb-2">تم منحها إلى</p>
                <p className="text-2xl font-bold text-primary mb-6">[اسم المتدرب]</p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <BadgeCheck className="w-5 h-5 text-primary" />
                  <span>شهادة معتمدة ومُصدّقة</span>
                </div>
              </div>

              {/* Certificate Actions */}
              <div className="absolute bottom-6 left-6 right-6 flex justify-center gap-3">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Download className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Floating Badges */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl bg-card shadow-card flex items-center justify-center"
            >
              <BadgeCheck className="w-10 h-10 text-primary" />
            </motion.div>
          </motion.div>

          {/* Info Column */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              شهادات معتمدة
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              احصل على شهادة
              <span className="text-gradient"> معتمدة </span>
              تثبت إنجازك
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              عند إتمامك لأي كورس، ستحصل على شهادة إتمام معتمدة يمكنك
              مشاركتها مع أصحاب العمل أو إضافتها لسيرتك الذاتية.
            </p>

            <div className="space-y-6 mb-8">
              {[
                { title: 'شهادات رقمية', desc: 'قابلة للتحقق إلكترونياً' },
                { title: 'مشاركة سهلة', desc: 'شارك على LinkedIn ومنصات التواصل' },
                { title: 'إضافة للسيرة الذاتية', desc: 'عزز ملفك المهني' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center flex-shrink-0">
                    <BadgeCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{item.title}</h4>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button variant="hero" size="lg">
              ابدأ رحلة التعلم الآن
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
