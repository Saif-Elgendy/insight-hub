import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Brain, Search, BookOpen, Clock, Users, Filter, X, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  duration: string | null;
  lessons_count: number | null;
  category: string | null;
  is_featured: boolean | null;
}

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = courses
      .map(c => c.category)
      .filter((cat): cat is string => cat !== null && cat !== '');
    return [...new Set(cats)];
  }, [courses]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = !searchQuery || 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategory || course.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, selectedCategory]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const hasActiveFilters = searchQuery || selectedCategory;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="pt-24 pb-16">
        {/* Header */}
        <section className="py-12 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 mb-6">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">جميع الكورسات</h1>
                <p className="text-muted-foreground">اكتشف مجموعة متنوعة من الكورسات المتخصصة في الصحة النفسية</p>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن كورس..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 h-12"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="w-4 h-4 text-muted-foreground hidden md:block" />
                  <Badge
                    variant={selectedCategory === null ? "default" : "outline"}
                    className="cursor-pointer h-8 px-4"
                    onClick={() => setSelectedCategory(null)}
                  >
                    الكل
                  </Badge>
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer h-8 px-4"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      البحث: {searchQuery}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => setSearchQuery('')}
                      />
                    </Badge>
                  )}
                  {selectedCategory && (
                    <Badge variant="secondary" className="gap-1">
                      التصنيف: {selectedCategory}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => setSelectedCategory(null)}
                      />
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-destructive hover:text-destructive"
                  >
                    مسح الكل
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                عرض {filteredCourses.length} من {courses.length} كورس
              </p>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                    <div className="h-48 bg-muted" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">لم يتم العثور على كورسات</h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters 
                    ? 'جرب تغيير معايير البحث أو الفلاتر'
                    : 'لا توجد كورسات متاحة حالياً'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    مسح جميع الفلاتر
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`/course/${course.id}`}>
                      <div className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-primary/30 h-full">
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden">
                          {course.image_url ? (
                            <img
                              src={course.image_url}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <BookOpen className="w-12 h-12 text-primary/50" />
                            </div>
                          )}
                          {course.is_featured && (
                            <Badge className="absolute top-3 right-3 bg-primary">مميز</Badge>
                          )}
                          {course.category && (
                            <Badge variant="secondary" className="absolute top-3 left-3">
                              {course.category}
                            </Badge>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {course.title}
                          </h3>
                          {course.description && (
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                              {course.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {course.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{course.duration}</span>
                              </div>
                            )}
                            {course.lessons_count && course.lessons_count > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{course.lessons_count} درس</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Courses;
