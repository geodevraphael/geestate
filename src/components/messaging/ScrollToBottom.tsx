import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrollToBottomProps {
  show: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export function ScrollToBottom({ show, onClick, unreadCount = 0 }: ScrollToBottomProps) {
  if (!show) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Button
        onClick={onClick}
        size="icon"
        className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl bg-card hover:bg-card border border-border text-foreground transition-all duration-200 hover:scale-105"
      >
        <ChevronDown className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}