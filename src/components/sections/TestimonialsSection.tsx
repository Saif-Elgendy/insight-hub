import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'أحمد محمد',
    role: 'موظف قطاع خاص',
    content: 'كورس إدارة القلق غيّر حياتي بشكل كامل. تعلمت تقنيات عملية أستخدمها يومياً في التعامل مع ضغوط العمل.',
    rating: 5,
    avatar: 'أ',
  },
  {
    id: 2,
    name: 'نورة العلي',
    role: 'طالبة جامعية',
    content: 'الجلسات المباشرة مع الدكتورة سارة كانت مفيدة جداً. أشعر بتحسن كبير في ثقتي بنفسي وقدرتي على التعبير عن مشاعري.',
    rating: 5,
    avatar: 'ن',
  },
  {
    id: 3,
    name: 'خالد السالم',
    role: 'رائد أعمال',
    content: 'المنصة سهلة الاستخدام والمحتوى عالي الجودة. الاستشارات الفردية ساعدتني في تحقيق التوازن بين العمل والحياة.',
    rating: 5,
    avatar: 'خ',
  },
];

export const TestimonialsSection = () => {
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
            آراء المتدربين
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            ماذا يقول عملاؤنا؟
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            نفتخر بثقة أكثر من 1000 متدرب اختاروا منصتنا لرحلتهم نحو الصحة النفسية
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
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-6 border-t border-border">
                <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-bold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
