import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  userName: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start mt-4 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex items-end gap-2 max-w-[85%]">
        <div className="w-8 flex-shrink-0">
          <Avatar className="h-8 w-8 ring-2 ring-background shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-accent to-accent/60 text-accent-foreground text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <div 
              className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce" 
              style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
            />
            <div 
              className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce" 
              style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
            />
            <div 
              className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce" 
              style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">{userName} is typing...</p>
        </div>
      </div>
    </div>
  );
}