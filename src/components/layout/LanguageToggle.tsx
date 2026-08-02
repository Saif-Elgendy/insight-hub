import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export const LanguageToggle = ({ className }: { className?: string }) => {
  const { t, toggleLang } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      aria-label={t('lang.switch')}
      title={t('lang.switch')}
      className={`gap-2 ${className ?? ''}`}
    >
      <Languages className="w-4 h-4" aria-hidden="true" />
      <span className="text-sm font-medium">{t('lang.other')}</span>
    </Button>
  );
};
