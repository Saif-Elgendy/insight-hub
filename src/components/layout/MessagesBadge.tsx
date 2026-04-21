import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shows a Messages icon in the navbar with a badge counter for unread chat messages
 * across all consultations the user participates in (as patient or specialist).
 * Clicking it routes to the appropriate dashboard's messages tab.
 */
export const MessagesBadge = () => {
  const { user } = useAuth();
  const { isConsultant, canManageCourses } = useUserRole();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadUnread = async () => {
      // Find consultations the user is part of
      const { data: asPatient } = await supabase
        .from('consultations')
        .select('id')
        .eq('user_id', user.id);

      const { data: specialist } = await supabase
        .from('specialists')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let asSpecialist: { id: string }[] = [];
      if (specialist) {
        const { data } = await supabase
          .from('consultations')
          .select('id')
          .eq('specialist_id', specialist.id);
        asSpecialist = data || [];
      }

      const ids = [
        ...(asPatient || []).map(c => c.id),
        ...asSpecialist.map(c => c.id),
      ];

      if (ids.length === 0) {
        setUnread(0);
        return;
      }

      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('consultation_id', ids)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      setUnread(count || 0);
    };

    loadUnread();

    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => loadUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const handleClick = () => {
    if (canManageCourses) navigate('/doctor-dashboard');
    else if (isConsultant) navigate('/consultant-dashboard');
    else navigate('/my-consultations');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={handleClick}
      aria-label="المحادثات"
    >
      <MessageSquare className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Button>
  );
};
