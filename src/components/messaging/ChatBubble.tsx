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
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-background/15 hover:bg-background/25 transition-all duration-200 text-[13px] font-medium border border-white/10"
          >
            <span>Browse Listings</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      );
    } else if (parsed.type === 'listing-share') {
      return (
        <div className="space-y-2">
          <p className="text-[13px] md:text-sm">Check out this property:</p>
          <p className="text-[13px] font-semibold">{parsed.title}</p>
          <Link 
            to={parsed.url.replace(window.location.origin, '')}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-background/15 hover:bg-background/25 transition-all duration-200 text-[13px] font-medium border border-white/10"
          >
            <span>View Property</span>
            <ExternalLink className="h-3.5 w-3.5" />
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
                  className="underline decoration-2 underline-offset-2 hover:opacity-80 transition-opacity"
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
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-1'} group`}>
      <div className="flex items-end gap-2 max-w-[85%] md:max-w-[70%]">
        {!isSender && (
          <div className="w-8 flex-shrink-0">
            {showAvatar && senderName ? (
              <Avatar className="h-8 w-8 ring-2 ring-background shadow-md">
                <AvatarFallback className="bg-gradient-to-br from-accent to-accent/60 text-accent-foreground text-xs font-bold">
                  {senderName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : null}
          </div>
        )}
        
        {/* Actions for received messages */}
        {!isSender && (
          <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <MessageActions message={message} isSender={false} onReply={onReply} />
          </div>
        )}
        
        <div
          className={`relative rounded-2xl px-4 py-2.5 transition-all duration-200 ${
            isSender
              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
              : 'bg-card text-card-foreground border border-border/60 rounded-bl-md shadow-sm hover:shadow-md hover:border-border'
          }`}
        >
          {/* Tail for sent messages */}
          {isSender && isFirstInGroup && (
            <div className="absolute -right-1.5 bottom-0 w-3 h-3 overflow-hidden">
              <div className="absolute w-4 h-4 bg-gradient-to-br from-primary to-primary/90 rotate-45 transform origin-top-left translate-y-1"></div>
            </div>
          )}
          
          {/* Tail for received messages */}
          {!isSender && isFirstInGroup && (
            <div className="absolute -left-1.5 bottom-0 w-3 h-3 overflow-hidden">
              <div className="absolute w-4 h-4 bg-card border-l border-b border-border/60 rotate-45 transform origin-top-right translate-y-1 -translate-x-2"></div>
            </div>
          )}
          
          {renderContent()}
          
          <div
            className={`flex items-center gap-1.5 justify-end text-[10px] mt-1.5 ${
              isSender ? 'text-primary-foreground/60' : 'text-muted-foreground'
            }`}
          >
            <span className="font-medium">{format(new Date(message.timestamp), 'HH:mm')}</span>
            {isSender && (
              <span className="flex items-center">
                {message.is_read ? (
                  <CheckCheck className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </span>
            )}
          </div>
        </div>
        
        {/* Actions for sent messages */}
        {isSender && (
          <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <MessageActions message={message} isSender={true} onReply={onReply} />
          </div>
        )}
      </div>
    </div>
  );
}