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
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Button
        onClick={onClick}
        size="sm"
        className="h-9 rounded-full shadow-lg hover:shadow-xl bg-background hover:bg-background text-foreground border border-border/50 gap-1.5 px-4"
      >
        <ChevronDown className="h-4 w-4" />
        <span className="text-xs font-medium">New messages</span>
        {unreadCount > 0 && (
          <span className="h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ml-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}