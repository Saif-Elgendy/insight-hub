import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Brain, Star, Clock, Search, Filter, X, ArrowLeft, 
  SlidersHorizontal, ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
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

const Specialists = () => {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);
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
        .order('rating', { ascending: false });

      if (error) throw error;
      setSpecialists(data || []);
    } catch (error) {
      console.error('Error fetching specialists:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique specialties for filter
  const specialties = useMemo(() => {
    const uniqueSpecialties = [...new Set(specialists.map(s => s.specialty))];
    return uniqueSpecialties.filter(Boolean);
  }, [specialists]);

  // Filter specialists
  const filteredSpecialists = useMemo(() => {
    return specialists.filter(specialist => {
      // Search filter
      const matchesSearch = 
        specialist.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        specialist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        specialist.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (specialist.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      // Specialty filter
      const matchesSpecialty = 
        selectedSpecialty === 'all' || specialist.specialty === selectedSpecialty;

      // Rating filter
      const matchesRating = (specialist.rating || 0) >= minRating;

      return matchesSearch && matchesSpecialty && matchesRating;
    });
  }, [specialists, searchQuery, selectedSpecialty, minRating]);

  const handleSpecialistClick = (id: string) => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate(`/specialist/${id}`);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('all');
    setMinRating(0);
  };

  const activeFiltersCount = 
    (selectedSpecialty !== 'all' ? 1 : 0) + 
    (minRating > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-hero text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">نفسي</span>
            </Link>
            <Button
              variant="hero-outline"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              الرئيسية
            </Button>
          </div>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              المختصون المعتمدون
            </h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              اختر المختص المناسب لك من بين نخبة من الأطباء والمعالجين النفسيين
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ابحث عن مختص بالاسم أو التخصص..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-12"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 relative"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">الفلاتر</span>
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card rounded-xl p-6 border border-border/50 shadow-soft"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  الفلاتر
                </h3>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    مسح الكل
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Specialty Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    التخصص
                  </label>
                  <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="جميع التخصصات" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      <SelectItem value="all">جميع التخصصات</SelectItem>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rating Filter */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground flex items-center justify-between">
                    <span>الحد الأدنى للتقييم</span>
                    <span className="flex items-center gap-1 text-primary">
                      <Star className="w-4 h-4 fill-primary" />
                      {minRating.toFixed(1)}+
                    </span>
                  </label>
                  <Slider
                    value={[minRating]}
                    onValueChange={(value) => setMinRating(value[0])}
                    max={5}
                    step={0.5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredSpecialists.length} مختص
              {filteredSpecialists.length !== specialists.length && 
                ` من ${specialists.length}`}
            </span>
            {activeFiltersCount > 0 && (
              <div className="flex gap-2">
                {selectedSpecialty !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedSpecialty}
                    <button onClick={() => setSelectedSpecialty('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {minRating > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3" />
                    {minRating}+
                    <button onClick={() => setMinRating(0)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredSpecialists.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              لم يتم العثور على مختصين
            </h3>
            <p className="text-muted-foreground mb-6">
              جرّب تغيير معايير البحث أو الفلاتر
            </p>
            <Button variant="outline" onClick={clearFilters}>
              مسح الفلاتر
            </Button>
          </div>
        ) : (
          /* Specialists Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSpecialists.map((specialist, index) => (
              <motion.div
                key={specialist.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => handleSpecialistClick(specialist.id)}
                className="group cursor-pointer"
              >
                <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50 hover:shadow-elevated transition-all duration-500 h-full flex flex-col">
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
                    
                    {/* Availability Badge */}
                    {specialist.is_available && (
                      <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium">
                        متاح
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
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {specialist.full_name}
                    </h3>
                    <p className="text-primary text-sm font-medium mb-2">
                      {specialist.title}
                    </p>
                    <Badge variant="secondary" className="w-fit mb-3">
                      {specialist.specialty}
                    </Badge>
                    
                    {specialist.bio && (
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                        {specialist.bio}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                      {specialist.years_experience && (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{specialist.years_experience} سنوات</span>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" className="gap-1 text-primary">
                        عرض التفاصيل
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Specialists;
