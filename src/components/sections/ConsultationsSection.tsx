import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Video, Phone, Shield, Clock, CheckCircle2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingDialog } from '@/components/booking/BookingDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';

const consultationTypes: {
  icon: typeof Video;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  minutes: number;
  price: number;
}[] = [
  { icon: Video, titleKey: 'cons.videoTitle', descKey: 'cons.videoDesc', minutes: 60, price: 200 },
  { icon: Phone, titleKey: 'cons.voiceTitle', descKey: 'cons.voiceDesc', minutes: 45, price: 150 },
  { icon: MessageCircle, titleKey: 'cons.chatTitle', descKey: 'cons.chatDesc', minutes: 30, price: 100 },
];

const featureKeys: TranslationKey[] = [
  'cons.feature1',
  'cons.feature2',
  'cons.feature3',
  'cons.feature4',
];

export const ConsultationsSection = () => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [specialists, setSpecialists] = useState<{ full_name: string; image_url: string | null }[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchSpecialists = async () => {
      const { data, count } = await supabase
        .from('specialists')
        .select('full_name, image_url', { count: 'exact' })
        .eq('is_available', true)
        .limit(5);
      
      if (data) {
        setSpecialists(data);
        setTotalCount(count || data.length);
      }
    };

    if (user) {
      fetchSpecialists();
    }
  }, [user]);

  const handleBookingClick = () => {
    if (!user) {
      navigate('/auth');
    } else {
      setBookingOpen(true);
    }
  };

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
              {t('cons.badge')}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              {t('cons.title1')}
              <span className="text-gradient">{t('cons.title2')}</span>
              {t('cons.title3')}
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              {t('cons.subtitle')}
            </p>

            {/* Features List */}
            <div className="space-y-4 mb-8">
              {featureKeys.map((featureKey, index) => (
                <motion.div
                  key={featureKey}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground">{t(featureKey)}</span>
                </motion.div>
              ))}
            </div>

            {/* Specialists from DB */}
            {specialists.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3 space-x-reverse">
                  {specialists.map((specialist, index) => (
                    <div
                      key={index}
                      className="w-12 h-12 rounded-full border-2 border-background overflow-hidden bg-muted flex items-center justify-center"
                    >
                      {specialist.image_url ? (
                        <img
                          src={specialist.image_url}
                          alt={specialist.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {specialist.full_name.charAt(0)}
                        </span>
                      )}
                    </div>
                  ))}
                  {totalCount > 5 && (
                    <div className="w-12 h-12 rounded-full border-2 border-background bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      +{totalCount - 5}
                    </div>
                  )}
                </div>
                <span className="text-muted-foreground text-sm">
                  {totalCount} {t('cons.readyCount')}
                </span>
              </div>
            )}

            {/* Guest User Message */}
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <LogIn className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {t('cons.guestTitle')}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t('cons.guestText')}
                    </p>
                    <Button 
                      variant="wellness" 
                      size="sm" 
                      onClick={() => navigate('/auth')}
                    >
                      <LogIn className="w-4 h-4 ml-2" />
                      {t('cons.guestCta')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
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
                      {t(type.titleKey)}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      {t(type.descKey)}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{type.minutes} {t('cons.minutes')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-primary font-bold">{type.price} {t('cons.currency')}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="wellness" 
                    size="sm" 
                    className="self-center" 
                    onClick={handleBookingClick}
                    aria-label={`${t('cons.bookNow')} - ${t(type.titleKey)} - ${type.price} ${t('cons.currency')}`}
                  >
                    {user ? t('cons.bookNow') : t('cons.signupToBook')}
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
