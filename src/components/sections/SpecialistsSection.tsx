import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Specialist {
  id: string;
  full_name: string;
  title: string;
  specialty: string;
  bio: string | null;
  image_url: string | null;
  rating: number | null;
  years_experience: number | null;
  is_available: boolean | null;
}

export const SpecialistsSection = () => {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSpecialists();
  }, []);

  const fetchSpecialists = async () => {
    try {
      const { data, error } = await supabase
        .from('specialists')
        .select('*')
        .eq('is_available', true)
        .limit(4);

      if (error) throw error;
      setSpecialists(data || []);
    } catch (error) {
      console.error('Error fetching specialists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialistClick = (id: string) => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate(`/specialist/${id}`);
    }
  };

  if (loading) {
    return (
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (specialists.length === 0) {
    return null;
  }

  return (
    <section id="specialists" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            فريق المختصين
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            تعرّف على
            <span className="text-gradient"> مختصينا </span>
            المعتمدين
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            نخبة من الأطباء والمعالجين النفسيين المرخصين والمعتمدين، جاهزون لمساعدتك
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {specialists.map((specialist, index) => (
            <motion.div
              key={specialist.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => handleSpecialistClick(specialist.id)}
              className="group cursor-pointer"
            >
              <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50 hover:shadow-elevated transition-all duration-500">
                {/* Image */}
                <div className="aspect-square overflow-hidden relative">
                  {specialist.image_url ? (
                    <img
                      src={specialist.image_url}
                      alt={specialist.full_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-accent flex items-center justify-center">
                      <span className="text-6xl font-bold text-primary/50">
                        {specialist.full_name.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Rating Badge */}
                  {specialist.rating && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold text-foreground">
                        {specialist.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {specialist.full_name}
                  </h3>
                  <p className="text-primary text-sm font-medium mb-2">
                    {specialist.title}
                  </p>
                  <p className="text-muted-foreground text-sm mb-3">
                    {specialist.specialty}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    {specialist.years_experience && (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{specialist.years_experience} سنوات خبرة</span>
                      </div>
                    )}
                    <ArrowLeft className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/specialists')}
            className="gap-2"
          >
            عرض جميع المختصين
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
