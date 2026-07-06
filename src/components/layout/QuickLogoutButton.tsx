import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const QuickLogoutButton = () => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const handleClick = async () => {
    toast.success('جاري تسجيل الخروج...');
    await signOut();
  };

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <Button
        variant="destructive"
        size="lg"
        onClick={handleClick}
        className="shadow-lg gap-2 rounded-full"
        aria-label="تسجيل الخروج"
      >
        <LogOut className="w-5 h-5" />
        تسجيل الخروج
      </Button>
    </div>
  );
};
