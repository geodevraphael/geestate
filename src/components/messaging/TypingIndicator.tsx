import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  userName: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start mt-2">
      <div className="flex items-end gap-1.5 max-w-[85%]">
        <div className="w-7 flex-shrink-0">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-accent/10 text-primary text-xs font-semibold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3">
          <div className="flex gap-1">
            <div 
              className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" 
              style={{ animationDelay: '0ms' }}
            />
            <div 
              className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" 
              style={{ animationDelay: '150ms' }}
            />
            <div 
              className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" 
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
