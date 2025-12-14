import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, CheckCheck, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Message } from '@/types/database';
import { MessageActions } from './MessageActions';

interface ChatBubbleProps {
  message: Message;
  isSender: boolean;
  showAvatar: boolean;
  senderName?: string;
  isFirstInGroup: boolean;
  onReply?: (message: Message) => void;
}

export function ChatBubble({ message, isSender, showAvatar, senderName, isFirstInGroup, onReply }: ChatBubbleProps) {
  const parseMessageContent = (content: string) => {
    // Check if message contains a listings URL
    const listingsUrlRegex = /View all my (\d+) listings?:\n(https?:\/\/[^\s]+\/listings\?owner=[^\s]+)/;
    const match = content.match(listingsUrlRegex);
    
    if (match) {
      const [, count, url] = match;
      return {
        type: 'listings-share' as const,
        count: parseInt(count),
        url: url,
      };
    }

    // Check if message contains a single listing URL
    const singleListingRegex = /Check out this property: ([^\n]+)\n(https?:\/\/[^\s]+\/listing\/[^\s]+)/;
    const singleMatch = content.match(singleListingRegex);
    
    if (singleMatch) {
      const [, title, url] = singleMatch;
      return {
        type: 'listing-share' as const,
        title: title,
        url: url,
      };
    }

    // Check for URLs in the message
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);
    if (urls && urls.length > 0) {
      return {
        type: 'text-with-link' as const,
        content: content,
        urls: urls,
      };
    }

    return {
      type: 'text' as const,
      content: content,
    };
  };

  const parsed = parseMessageContent(message.content);

  const renderContent = () => {
    if (parsed.type === 'listings-share') {
      return (
        <div className="space-y-2">
          <p className="text-[13px] md:text-sm">
            View all my {parsed.count} {parsed.count === 1 ? 'listing' : 'listings'}
          </p>
          <Link 
            to={parsed.url.replace(window.location.origin, '')}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background/10 hover:bg-background/20 transition-colors text-[13px] font-medium"
          >
            <span>Browse Listings</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      );
    } else if (parsed.type === 'listing-share') {
      return (
        <div className="space-y-2">
          <p className="text-[13px] md:text-sm">Check out this property:</p>
          <p className="text-[13px] font-medium">{parsed.title}</p>
          <Link 
            to={parsed.url.replace(window.location.origin, '')}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background/10 hover:bg-background/20 transition-colors text-[13px] font-medium"
          >
            <span>View Property</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      );
    } else if (parsed.type === 'text-with-link') {
      const parts = parsed.content.split(/(https?:\/\/[^\s]+)/g);
      return (
        <p className="text-[13px] md:text-sm leading-relaxed break-words whitespace-pre-wrap">
          {parts.map((part, i) => {
            if (parsed.urls?.includes(part)) {
              return (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80"
                >
                  {part}
                </a>
              );
            }
            return part;
          })}
        </p>
      );
    }
    
    return (
      <p className="text-[13px] md:text-sm leading-relaxed break-words whitespace-pre-wrap">
        {parsed.content}
      </p>
    );
  };

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'} group`}>
      <div className="flex items-end gap-1.5 max-w-[85%] md:max-w-[70%] animate-in fade-in slide-in-from-bottom-1 duration-200">
        {!isSender && (
          <div className="w-7 flex-shrink-0">
            {showAvatar && senderName ? (
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-to-br from-primary/10 to-accent/10 text-primary text-xs font-semibold">
                  {senderName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : null}
          </div>
        )}
        
        {/* Actions for received messages */}
        {!isSender && (
          <div className="self-center">
            <MessageActions message={message} isSender={false} onReply={onReply} />
          </div>
        )}
        
        <div
          className={`rounded-2xl px-3 md:px-4 py-2 md:py-2.5 shadow-sm transition-all hover:shadow-md ${
            isSender
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-card border border-border/50 rounded-bl-sm'
          }`}
        >
          {renderContent()}
          <div
            className={`flex items-center gap-1 justify-end text-[9px] md:text-[10px] mt-1 ${
              isSender ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}
          >
            <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
            {isSender && (
              <span className="ml-0.5">
                {message.is_read ? (
                  <CheckCheck className="h-3 w-3 text-success" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </div>
        
        {/* Actions for sent messages */}
        {isSender && (
          <div className="self-center">
            <MessageActions message={message} isSender={true} onReply={onReply} />
          </div>
        )}
      </div>
    </div>
  );
}
