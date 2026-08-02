import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';

const testimonials: {
  id: number;
  nameKey: TranslationKey;
  roleKey: TranslationKey;
  contentKey: TranslationKey;
  rating: number;
}[] = [
  { id: 1, nameKey: 'test.1.name', roleKey: 'test.1.role', contentKey: 'test.1.content', rating: 5 },
  { id: 2, nameKey: 'test.2.name', roleKey: 'test.2.role', contentKey: 'test.2.content', rating: 5 },
  { id: 3, nameKey: 'test.3.name', roleKey: 'test.3.role', contentKey: 'test.3.content', rating: 5 },
];

export const TestimonialsSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-gradient-accent">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            {t('test.badge')}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t('test.title')}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('test.subtitle')}
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-2xl p-8 shadow-card border border-border/50 hover:shadow-elevated transition-all duration-500 relative"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 left-6 w-8 h-8 text-primary/20" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground leading-relaxed mb-6">
                "{t(testimonial.contentKey)}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-6 border-t border-border">
                <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold">
                  {t(testimonial.nameKey).charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-foreground">{t(testimonial.nameKey)}</div>
                  <div className="text-sm text-muted-foreground">{t(testimonial.roleKey)}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
