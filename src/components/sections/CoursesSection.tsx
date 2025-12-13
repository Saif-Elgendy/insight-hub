import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, Star, Play, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  category: string | null;
  image_url: string | null;
  lessons_count: number | null;
  is_featured: boolean | null;
}

const colorGradients = [
  'from-wellness-teal to-wellness-sage',
  'from-primary to-wellness-teal',
  'from-wellness-lavender to-primary',
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
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_featured', true)
      .limit(3);

    if (error) {
      console.error('Error fetching courses:', error);
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

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
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-card rounded-2xl h-96" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {courses.map((course, index) => (
              <motion.article
                key={course.id}
                variants={itemVariants}
                className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-500 border border-border/50"
              >
                {/* Course Image Placeholder */}
                <div className={`relative h-48 bg-gradient-to-br ${colorGradients[index % colorGradients.length]} overflow-hidden`}>
                  <div className="absolute inset-0 bg-foreground/10" />
                  <button
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label={`مشاهدة ${course.title}`}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-16 h-16 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center cursor-pointer"
                    >
                      <Play className="w-6 h-6 text-primary-foreground fill-current" aria-hidden="true" />
                    </motion.div>
                  </button>
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-background/90 text-xs font-medium text-foreground">
                    {course.category || 'كورس'}
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
                      <Clock className="w-4 h-4" aria-hidden="true" />
                      <span>{course.duration || 'غير محدد'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" aria-hidden="true" />
                      <span>{course.lessons_count || 0} درس</span>
                    </div>
                  </div>

                  {/* Course Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" aria-hidden="true" />
                        <span className="text-sm font-medium text-foreground">4.9</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" aria-hidden="true" />
                        <span className="text-sm">+500</span>
                      </div>
                    </div>
                    <Button 
                      variant="wellness" 
                      size="sm"
                      onClick={() => navigate(`/course/${course.id}`)}
                      aria-label={`ابدأ تعلم ${course.title}`}
                    >
                      ابدأ التعلم
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button variant="outline" size="lg" aria-label="عرض جميع الكورسات المتاحة">
            عرض جميع الكورسات
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
