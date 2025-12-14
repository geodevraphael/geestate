import { format, isToday, isYesterday } from 'date-fns';

interface MessageDateSeparatorProps {
  date: Date;
}

export function MessageDateSeparator({ date }: MessageDateSeparatorProps) {
  const formatDate = () => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted/50 backdrop-blur-sm text-muted-foreground text-[10px] md:text-xs font-medium px-3 py-1 rounded-full border border-border/30">
        {formatDate()}
      </div>
    </div>
  );
}
