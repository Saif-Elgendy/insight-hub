import { motion } from 'framer-motion';
import { Clock, Users, Star, Play, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const courses = [
  {
    id: 1,
    title: 'إدارة القلق والتوتر',
    description: 'تعلم تقنيات فعالة للتعامل مع القلق اليومي وتحويله لطاقة إيجابية',
    duration: '8 ساعات',
    students: 450,
    rating: 4.9,
    lessons: 24,
    category: 'القلق والتوتر',
    color: 'from-wellness-teal to-wellness-sage',
  },
  {
    id: 2,
    title: 'بناء الثقة بالنفس',
    description: 'رحلة شاملة لاكتشاف قدراتك وتعزيز ثقتك بنفسك في جميع جوانب الحياة',
    duration: '12 ساعة',
    students: 680,
    rating: 4.8,
    lessons: 32,
    category: 'تطوير الذات',
    color: 'from-primary to-wellness-teal',
  },
  {
    id: 3,
    title: 'العلاقات الصحية',
    description: 'كيف تبني علاقات متوازنة وصحية مع الآخرين وتحافظ عليها',
    duration: '10 ساعات',
    students: 320,
    rating: 4.9,
    lessons: 28,
    category: 'العلاقات',
    color: 'from-wellness-lavender to-primary',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export const CoursesSection = () => {
  return (
    <section id="courses" className="py-24 bg-gradient-accent">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            الكورسات المسجلة
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            تعلم في أي وقت ومن أي مكان
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            محتوى تعليمي غني ومتنوع يغطي جميع جوانب الصحة النفسية
          </p>
        </motion.div>

        {/* Courses Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {courses.map((course) => (
            <motion.div
              key={course.id}
              variants={itemVariants}
              className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-500 border border-border/50"
            >
              {/* Course Image Placeholder */}
              <div className={`relative h-48 bg-gradient-to-br ${course.color} overflow-hidden`}>
                <div className="absolute inset-0 bg-foreground/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-16 h-16 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center cursor-pointer"
                  >
                    <Play className="w-6 h-6 text-primary-foreground fill-current" />
                  </motion.div>
                </div>
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-background/90 text-xs font-medium text-foreground">
                  {course.category}
                </span>
              </div>

              {/* Course Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {course.description}
                </p>

                {/* Course Meta */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>{course.lessons} درس</span>
                  </div>
                </div>

                {/* Course Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-foreground">{course.rating}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{course.students}</span>
                    </div>
                  </div>
                  <Button variant="wellness" size="sm">
                    ابدأ التعلم
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button variant="outline" size="lg">
            عرض جميع الكورسات
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
