import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Loader2, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Conversation {
  consultation_id: string;
  other_user_id: string;
  other_name: string;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  status: string;
}

interface Props {
  /** Authenticated user id (specialist's auth user id for consultant dashboard) */
  userId: string;
  /** Specialist row id — when provided, we filter consultations where specialist_id = this */
  specialistId?: string | null;
}

const MessagesInbox = ({ userId, specialistId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Get consultations relevant to this user
        let query = supabase
          .from('consultations')
          .select('id, user_id, specialist_id, status');

        if (specialistId) {
          query = query.eq('specialist_id', specialistId);
        } else {
          query = query.eq('user_id', userId);
        }

        const { data: consultations } = await query;
        if (!consultations || consultations.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const consultationIds = consultations.map(c => c.id);

        // Get all messages for these consultations
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('*')
          .in('consultation_id', consultationIds)
          .order('created_at', { ascending: false });

        if (!messages || messages.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Group by consultation, take most recent + unread count
        const map = new Map<string, { last: typeof messages[0]; unread: number }>();
        for (const msg of messages) {
          const existing = map.get(msg.consultation_id);
          if (!existing) {
            map.set(msg.consultation_id, {
              last: msg,
              unread: !msg.is_read && msg.sender_id !== userId ? 1 : 0,
            });
          } else {
            if (!msg.is_read && msg.sender_id !== userId) existing.unread += 1;
          }
        }

        // Resolve other party names
        const otherUserIds = new Set<string>();
        const consultationMap = new Map(consultations.map(c => [c.id, c]));
        for (const cid of map.keys()) {
          const c = consultationMap.get(cid);
          if (!c) continue;
          // For consultant view, "other" is the patient (c.user_id)
          // For student view, "other" is the specialist's auth user_id (look up via specialists)
          if (specialistId) {
            otherUserIds.add(c.user_id);
          }
        }

        const profilesById = new Map<string, string>();
        if (otherUserIds.size > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', Array.from(otherUserIds));
          (profs || []).forEach(p => profilesById.set(p.user_id, p.full_name || 'مستخدم'));
        }

        const list: Conversation[] = [];
        for (const [cid, info] of map.entries()) {
          const c = consultationMap.get(cid);
          if (!c) continue;
          const otherId = specialistId ? c.user_id : c.specialist_id;
          list.push({
            consultation_id: cid,
            other_user_id: otherId,
            other_name: specialistId ? (profilesById.get(c.user_id) || 'مريض') : 'المختص',
            last_message: info.last.message ||
              (info.last.attachment_type === 'image' ? '📷 صورة' : info.last.attachment_url ? '📎 ملف' : ''),
            last_message_at: info.last.created_at,
            unread_count: info.unread,
            status: c.status,
          });
        }

        list.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        setConversations(list);
      } catch (e) {
        console.error('Error loading conversations', e);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Realtime: refresh on any new chat message
    const channel = supabase
      .channel('messages-inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, specialistId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-16">
        <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">لا توجد رسائل</h3>
        <p className="text-muted-foreground">
          ستظهر هنا المحادثات الواردة من المرضى عند بدء الاستشارة.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map(conv => (
        <Link
          key={conv.consultation_id}
          to={`/chat/${conv.consultation_id}`}
          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
            {conv.other_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-semibold truncate">{conv.other_name}</h4>
              <span className="text-xs text-muted-foreground shrink-0">
                {format(new Date(conv.last_message_at), 'dd MMM HH:mm', { locale: ar })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground truncate">
                {conv.last_message || 'بدء المحادثة...'}
              </p>
              {conv.unread_count > 0 && (
                <Badge className="bg-primary text-primary-foreground shrink-0">
                  {conv.unread_count}
                </Badge>
              )}
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-muted-foreground shrink-0" />
        </Link>
      ))}
    </div>
  );
};

export default MessagesInbox;
