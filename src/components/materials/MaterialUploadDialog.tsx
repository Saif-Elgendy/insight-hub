import { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X, FileText, Video, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MaterialUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
  lessonId?: string;
  target: 'course' | 'library';
  onSuccess: () => void;
}

const ALLOWED_FILE_TYPES = {
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  pdf: ['application/pdf'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
};

const ALL_ALLOWED = [...ALLOWED_FILE_TYPES.video, ...ALLOWED_FILE_TYPES.pdf, ...ALLOWED_FILE_TYPES.document, ...ALLOWED_FILE_TYPES.image];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const MaterialUploadDialog = ({ open, onOpenChange, courseId, lessonId, target, onSuccess }: MaterialUploadDialogProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [category, setCategory] = useState('');
  const [activeTab, setActiveTab] = useState('file');

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setYoutubeUrl('');
    setCategory('');
    setActiveTab('file');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALL_ALLOWED.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم. الأنواع المدعومة: فيديو، PDF، صور');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('حجم الملف يجب أن يكون أقل من 50 ميجابايت');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const getFileType = (file: File): string => {
    if (ALLOWED_FILE_TYPES.video.includes(file.type)) return 'video';
    if (ALLOWED_FILE_TYPES.pdf.includes(file.type)) return 'pdf';
    if (ALLOWED_FILE_TYPES.image.includes(file.type)) return 'image';
    return 'document';
  };

  const getYoutubeEmbedUrl = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
  };

  const handleUpload = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان');
      return;
    }

    if (activeTab === 'file' && !selectedFile) {
      toast.error('يرجى اختيار ملف');
      return;
    }

    if (activeTab === 'youtube' && !youtubeUrl.trim()) {
      toast.error('يرجى إدخال رابط يوتيوب');
      return;
    }

    if (activeTab === 'youtube') {
      const embedUrl = getYoutubeEmbedUrl(youtubeUrl);
      if (!embedUrl) {
        toast.error('رابط يوتيوب غير صالح');
        return;
      }
    }

    setUploading(true);
    try {
      let fileUrl = '';
      let fileType = 'youtube';
      let fileSize: number | null = null;

      if (activeTab === 'file' && selectedFile) {
        fileType = getFileType(selectedFile);
        fileSize = selectedFile.size;
        const ext = selectedFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const path = target === 'course' ? `courses/${courseId}/${fileName}` : `library/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-materials')
          .upload(path, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course-materials')
          .getPublicUrl(path);

        fileUrl = publicUrl;
      } else {
        fileUrl = getYoutubeEmbedUrl(youtubeUrl) || youtubeUrl;
      }

      if (target === 'course') {
        const { error } = await supabase
          .from('course_materials')
          .insert({
            course_id: courseId!,
            lesson_id: lessonId || null,
            title: title.trim(),
            description: description.trim() || null,
            file_url: fileUrl,
            file_type: fileType,
            file_size: fileSize,
            youtube_url: activeTab === 'youtube' ? youtubeUrl : null,
            uploaded_by: user.id,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resource_library')
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            file_url: fileUrl,
            file_type: fileType,
            file_size: fileSize,
            youtube_url: activeTab === 'youtube' ? youtubeUrl : null,
            category: category.trim() || null,
            uploaded_by: user.id,
          });
        if (error) throw error;
      }

      toast.success('تم رفع المحتوى بنجاح');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('حدث خطأ أثناء الرفع');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!uploading) { onOpenChange(v); resetForm(); } }}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة محتوى جديد</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="gap-2">
              <Upload className="w-4 h-4" />
              رفع ملف
            </TabsTrigger>
            <TabsTrigger value="youtube" className="gap-2">
              <Video className="w-4 h-4" />
              رابط يوتيوب
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4 mt-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="text-right">
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">اضغط لاختيار ملف</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    فيديو، PDF، صور (حتى 50MB)
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.webm,.ogg,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </TabsContent>

          <TabsContent value="youtube" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>رابط يوتيوب</Label>
              <div className="relative">
                <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="pr-10"
                  dir="ltr"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>العنوان *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل عنوان المحتوى"
            />
          </div>

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر (اختياري)"
              rows={2}
            />
          </div>

          {target === 'library' && (
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="مثال: علم نفس، تطوير ذات..."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} disabled={uploading}>
            إلغاء
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              'رفع'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
