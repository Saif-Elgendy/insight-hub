import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Video, Image, Download, Plus, Search, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { MaterialUploadDialog } from '@/components/materials/MaterialUploadDialog';
import { toast } from 'sonner';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  youtube_url: string | null;
  category: string | null;
  created_at: string;
}

const fileTypeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  document: FileText,
  video: Video,
  youtube: Video,
  image: Image,
};

const fileTypeLabels: Record<string, string> = {
  pdf: 'PDF',
  document: 'مستند',
  video: 'فيديو',
  youtube: 'يوتيوب',
  image: 'صورة',
};

const ResourceLibrary = () => {
  const { user } = useAuth();
  const { canManageCourses } = useUserRole();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('resource_library')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resources:', error);
    } else {
      setResources(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchResources();
  }, [user]);

  const handleDelete = async (resource: Resource) => {
    if (!confirm('هل تريد حذف هذا المورد؟')) return;
    setDeletingId(resource.id);
    try {
      // Delete file from storage if not YouTube
      if (resource.file_type !== 'youtube' && resource.file_url.includes('course-materials')) {
        const path = resource.file_url.split('/course-materials/')[1];
        if (path) {
          await supabase.storage.from('course-materials').remove([path]);
        }
      }

      const { error } = await supabase.from('resource_library').delete().eq('id', resource.id);
      if (error) throw error;
      toast.success('تم حذف المورد بنجاح');
      fetchResources();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredResources = resources.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(resources.map(r => r.category).filter(Boolean))];

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">يرجى تسجيل الدخول للوصول للمكتبة</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">مكتبة الموارد</h1>
                <p className="text-muted-foreground mt-1">فيديوهات، ملفات PDF، ومستندات تعليمية</p>
              </div>
              {canManageCourses && (
                <Button onClick={() => setUploadOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة مورد
                </Button>
              )}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث في المكتبة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={!searchQuery ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSearchQuery('')}
                  >
                    الكل
                  </Badge>
                  {categories.map(cat => (
                    <Badge
                      key={cat}
                      variant={searchQuery === cat ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSearchQuery(cat!)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Resources Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">لا توجد موارد</h3>
                <p className="text-muted-foreground">
                  {canManageCourses ? 'ابدأ بإضافة محتوى جديد للمكتبة' : 'لم يتم إضافة موارد بعد'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map((resource, index) => {
                  const IconComponent = fileTypeIcons[resource.file_type] || FileText;
                  return (
                    <motion.div
                      key={resource.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="group hover:shadow-elevated transition-all duration-300 overflow-hidden">
                        {/* Preview for YouTube */}
                        {resource.file_type === 'youtube' && resource.file_url && (
                          <div className="aspect-video">
                            <iframe
                              src={resource.file_url}
                              title={resource.title}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}

                        {/* Preview for images */}
                        {resource.file_type === 'image' && (
                          <div className="aspect-video overflow-hidden">
                            <img src={resource.file_url} alt={resource.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Icon header for non-visual types */}
                        {!['youtube', 'image'].includes(resource.file_type) && (
                          <div className="bg-gradient-hero p-6 flex items-center justify-center">
                            <IconComponent className="w-12 h-12 text-primary-foreground" />
                          </div>
                        )}

                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-foreground truncate">{resource.title}</h3>
                              {resource.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {resource.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              {fileTypeLabels[resource.file_type] || resource.file_type}
                            </Badge>
                          </div>

                          {resource.category && (
                            <Badge variant="outline" className="text-xs">{resource.category}</Badge>
                          )}

                          <div className="flex items-center gap-2 pt-2">
                            {resource.file_type !== 'youtube' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-2"
                                asChild
                              >
                                <a href={resource.file_url} target="_blank" rel="noopener noreferrer" download>
                                  <Download className="w-4 h-4" />
                                  تحميل
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-2"
                                asChild
                              >
                                <a href={resource.youtube_url || resource.file_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                  فتح في يوتيوب
                                </a>
                              </Button>
                            )}

                            {canManageCourses && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(resource)}
                                disabled={deletingId === resource.id}
                                className="text-destructive hover:text-destructive"
                              >
                                {deletingId === resource.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <MaterialUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        target="library"
        onSuccess={fetchResources}
      />

      <Footer />
    </div>
  );
};

export default ResourceLibrary;
