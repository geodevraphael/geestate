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
    const listingsUrlRegex = /View all my (\d+) listings?:\n(https?:\/\/[^\s]+\/listings\?owner=[^\s]+)/;
    const match = content.match(listingsUrlRegex);
    
    if (match) {
      const [, count, url] = match;
      return { type: 'listings-share' as const, count: parseInt(count), url };
    }

    const singleListingRegex = /Check out this property: ([^\n]+)\n(https?:\/\/[^\s]+\/listing\/[^\s]+)/;
    const singleMatch = content.match(singleListingRegex);
    
    if (singleMatch) {
      const [, title, url] = singleMatch;
      return { type: 'listing-share' as const, title, url };
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);
    if (urls && urls.length > 0) {
      return { type: 'text-with-link' as const, content, urls };
    }

    return { type: 'text' as const, content };
  };

  const parsed = parseMessageContent(message.content);

  const renderContent = () => {
    if (parsed.type === 'listings-share') {
      return (
        <div className="space-y-2.5">
          <p className="text-[15px]">
            View all my {parsed.count} {parsed.count === 1 ? 'listing' : 'listings'}
          </p>
          <Link 
            to={parsed.url.replace(window.location.origin, '')}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
              isSender 
                ? 'bg-primary-foreground/15 hover:bg-primary-foreground/25' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <span>Browse Listings</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      );
    } else if (parsed.type === 'listing-share') {
      return (
        <div className="space-y-2.5">
          <p className="text-[15px]">Check out this property:</p>
          <p className="text-[15px] font-semibold">{parsed.title}</p>
          <Link 
            to={parsed.url.replace(window.location.origin, '')}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
              isSender 
                ? 'bg-primary-foreground/15 hover:bg-primary-foreground/25' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <span>View Property</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      );
    } else if (parsed.type === 'text-with-link') {
      const parts = parsed.content.split(/(https?:\/\/[^\s]+)/g);
      return (
        <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
          {parts.map((part, i) => {
            if (parsed.urls?.includes(part)) {
              return (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80 transition-opacity"
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
      <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
        {parsed.content}
      </p>
    );
  };

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'} group`}>
      <div className="flex items-end gap-2 max-w-[80%] md:max-w-[65%]">
        {!isSender && (
          <div className="w-8 flex-shrink-0">
            {showAvatar && senderName ? (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                  {senderName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : null}
          </div>
        )}
        
        {!isSender && (
          <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <MessageActions message={message} isSender={false} onReply={onReply} />
          </div>
        )}
        
        <div
          className={`rounded-3xl px-4 py-2.5 transition-all duration-200 ${
            isSender
              ? `bg-primary text-primary-foreground ${isFirstInGroup ? 'rounded-br-lg' : ''}`
              : `bg-background text-foreground ${isFirstInGroup ? 'rounded-bl-lg' : ''}`
          }`}
        >
          {renderContent()}
          
          <div
            className={`flex items-center gap-1.5 justify-end text-[11px] mt-1 ${
              isSender ? 'text-primary-foreground/60' : 'text-muted-foreground'
            }`}
          >
            <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
            {isSender && (
              <span className="flex items-center">
                {message.is_read ? (
                  <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/80" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </span>
            )}
          </div>
        </div>
        
        {isSender && (
          <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <MessageActions message={message} isSender={true} onReply={onReply} />
          </div>
        )}
      </div>
    </div>
  );
}