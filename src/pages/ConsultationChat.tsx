import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Send, Paperclip, Check, CheckCheck, 
  Loader2, Image, FileText, X, Download, Brain, FileHeart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { MedicalRecordsPanel } from '@/components/medical/MedicalRecordsPanel';

interface ChatMessage {
  id: string;
  consultation_id: string;
  sender_id: string;
  message: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  is_read: boolean;
  created_at: string;
}

interface ConsultationInfo {
  id: string;
  consultation_type: string;
  status: string;
  specialist_name: string;
  patient_name: string;
  patient_user_id: string;
  other_party_name: string;
  is_specialist: boolean;
}

const ConsultationChat = () => {
  const { id: consultationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [consultationInfo, setConsultationInfo] = useState<ConsultationInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasInteractedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Short notification "ping" using Web Audio API (no asset needed)
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {
      // Silently ignore – sound is a nice-to-have
    }
  }, []);

  // Mark that the user interacted (required by browsers to allow audio playback)
  useEffect(() => {
    const markInteracted = () => { hasInteractedRef.current = true; };
    window.addEventListener('click', markInteracted, { once: true });
    window.addEventListener('keydown', markInteracted, { once: true });
    return () => {
      window.removeEventListener('click', markInteracted);
      window.removeEventListener('keydown', markInteracted);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Fetch consultation info
  useEffect(() => {
    if (!user || !consultationId) return;
    
    const fetchInfo = async () => {
      const { data: consultation, error } = await supabase
        .from('consultations')
        .select('id, consultation_type, status, user_id, specialist_id')
        .eq('id', consultationId)
        .maybeSingle();

      if (error || !consultation) {
        toast.error('لم يتم العثور على الاستشارة');
        navigate(-1);
        return;
      }

      // Get specialist info
      const { data: specialist } = await supabase
        .from('specialists')
        .select('full_name, user_id')
        .eq('id', consultation.specialist_id)
        .maybeSingle();

      // Get patient profile
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', consultation.user_id)
        .maybeSingle();

      const isSpecialist = specialist?.user_id === user.id;

      setConsultationInfo({
        id: consultation.id,
        consultation_type: consultation.consultation_type,
        status: consultation.status,
        specialist_name: specialist?.full_name || 'المختص',
        patient_name: patientProfile?.full_name || 'المريض',
        patient_user_id: consultation.user_id,
        other_party_name: isSpecialist 
          ? (patientProfile?.full_name || 'المريض')
          : (specialist?.full_name || 'المختص'),
        is_specialist: isSpecialist,
      });
    };

    fetchInfo();
  }, [user, consultationId, navigate]);

  // Fetch messages
  useEffect(() => {
    if (!consultationId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('حدث خطأ في تحميل الرسائل');
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    fetchMessages();
  }, [consultationId]);

  // Subscribe to realtime
  useEffect(() => {
    if (!consultationId) return;

    const channel = supabase
      .channel(`chat-${consultationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `consultation_id=eq.${consultationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Play sound only for incoming messages from the other party
          if (user && newMsg.sender_id !== user.id && hasInteractedRef.current) {
            playNotificationSound();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `consultation_id=eq.${consultationId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId, user, playNotificationSound]);

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mark messages as read
  useEffect(() => {
    if (!user || !consultationId || messages.length === 0) return;

    const unreadMessages = messages.filter(m => !m.is_read && m.sender_id !== user.id);
    if (unreadMessages.length === 0) return;

    const markAsRead = async () => {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('consultation_id', consultationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    };

    markAsRead();
  }, [messages, user, consultationId]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !user || !consultationId) return;

    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentType: string | null = null;

      if (selectedFile) {
        setUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${consultationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // chat-attachments is a private bucket — use a long-lived signed URL
        const { data: signed, error: signErr } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365);

        if (signErr || !signed) throw signErr || new Error('Failed to create signed URL');
        attachmentUrl = signed.signedUrl;
        attachmentName = selectedFile.name;
        attachmentType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
        setUploading(false);
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          consultation_id: consultationId,
          sender_id: user.id,
          message: newMessage.trim() || null,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_type: attachmentType,
        });

      if (error) throw error;

      setNewMessage('');
      setSelectedFile(null);
      setFilePreview(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('حدث خطأ في إرسال الرسالة');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('الحد الأقصى لحجم الملف 10 ميجابايت');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isActiveChat = consultationInfo && 
    (consultationInfo.status === 'confirmed' || consultationInfo.status === 'pending');

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
          {consultationInfo?.other_party_name?.charAt(0) || '؟'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground truncate">
            {consultationInfo?.other_party_name || 'محادثة'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {consultationInfo?.status === 'confirmed' ? 'نشط' : 
             consultationInfo?.status === 'completed' ? 'مكتمل' :
             consultationInfo?.status === 'pending' ? 'قيد الانتظار' : 'ملغي'}
          </p>
        </div>
        {consultationInfo && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <FileHeart className="w-4 h-4" />
                <span className="hidden sm:inline">{consultationInfo.is_specialist ? 'السجل الطبي' : 'سجلي الطبي'}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
              <SheetHeader>
                <SheetTitle>{consultationInfo.is_specialist ? `السجل الطبي - ${consultationInfo.patient_name}` : 'سجلي الطبي'}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <MedicalRecordsPanel
                  patientId={consultationInfo.patient_user_id}
                  consultationId={consultationInfo.id}
                  patientView={!consultationInfo.is_specialist}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
        <Link to="/">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
        </Link>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-1">لا توجد رسائل بعد</p>
              <p className="text-sm">ابدأ المحادثة الآن</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    {/* Attachment */}
                    {msg.attachment_url && (
                      <div className="mb-2">
                        {msg.attachment_type === 'image' ? (
                          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={msg.attachment_url}
                              alt={msg.attachment_name || 'صورة'}
                              className="max-w-full rounded-lg max-h-60 object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg ${
                              isMine ? 'bg-primary-foreground/10' : 'bg-background/50'
                            }`}
                          >
                            <FileText className="w-5 h-5 shrink-0" />
                            <span className="text-sm truncate">{msg.attachment_name || 'ملف'}</span>
                            <Download className="w-4 h-4 shrink-0" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Text */}
                    {msg.message && (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    )}

                    {/* Time & Read Status */}
                    <div className={`flex items-center gap-1 mt-1 ${
                      isMine ? 'justify-start' : 'justify-end'
                    }`}>
                      <span className={`text-[10px] ${
                        isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                      }`}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </span>
                      {isMine && (
                        msg.is_read ? (
                          <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/60" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-primary-foreground/40" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-border bg-card">
          <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
            {filePreview ? (
              <img src={filePreview} alt="preview" className="w-12 h-12 rounded object-cover" />
            ) : (
              <FileText className="w-8 h-8 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={removeSelectedFile}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {isActiveChat ? (
        <div className="px-4 py-3 border-t border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك..."
              className="flex-1"
              disabled={sending}
            />
            <Button
              variant="hero"
              size="icon"
              className="shrink-0"
              onClick={handleSendMessage}
              disabled={sending || (!newMessage.trim() && !selectedFile)}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-border bg-muted/50 text-center shrink-0">
          <p className="text-sm text-muted-foreground">
            {consultationInfo?.status === 'completed' 
              ? 'تم إكمال الاستشارة - المحادثة للقراءة فقط'
              : 'المحادثة غير متاحة حالياً'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsultationChat;
