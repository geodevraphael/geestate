import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const changeLanguage = async (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('preferred_locale', lng);

    // Update user profile if logged in
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_locale: lng })
        .eq('id', user.id);

      if (error) {
        console.error('Failed to update language preference:', error);
      }
    }

    toast({
      title: lng === 'en' ? 'Language changed' : 'Lugha imebadilishwa',
      description: lng === 'en' ? 'Language set to English' : 'Lugha imewekwa kuwa Kiswahili',
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          <span className={i18n.language === 'en' ? 'font-bold' : ''}>English</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('sw')}>
          <span className={i18n.language === 'sw' ? 'font-bold' : ''}>Kiswahili</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
