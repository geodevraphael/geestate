import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Share2, Copy, Check, MessageCircle, Mail, 
  Facebook, Instagram, MapPin
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ShareDialogProps {
  url: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  location?: string;
  area?: number;
  geojson?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export function ShareDialog({ 
  url, 
  title, 
  description, 
  price, 
  currency = 'TZS', 
  location, 
  area,
  open, 
  onOpenChange 
}: ShareDialogProps) {
  const { i18n } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shareText = description || title;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(title);

  const formatPrice = (priceValue: number) => {
    return new Intl.NumberFormat('en-US').format(priceValue);
  };

  const formatArea = (areaM2: number) => {
    if (areaM2 < 10000) {
      return `${areaM2.toFixed(0)} m²`;
    }
    return `${(areaM2 / 10000).toFixed(2)} ha`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(i18n.language === 'sw' ? 'Kiungo kimenakiliwa!' : 'Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyForPlatform = async (platform: string) => {
    const fullText = `${title}\n${location ? `📍 ${location}` : ''}\n${price ? `💰 ${currency} ${formatPrice(price)}` : ''}\n${area ? `📐 ${formatArea(area)}` : ''}\n\n${url}`;
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success(
        i18n.language === 'sw' 
          ? `Maelezo yamenakiliwa! Bandika kwenye ${platform}` 
          : `Details copied! Paste on ${platform}`
      );
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    },
    {
      name: 'X',
      icon: XIcon,
      color: 'bg-black hover:bg-gray-800',
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 hover:opacity-90',
      action: () => handleCopyForPlatform('Instagram'),
    },
    {
      name: 'TikTok',
      icon: TikTokIcon,
      color: 'bg-black hover:bg-gray-800',
      action: () => handleCopyForPlatform('TikTok'),
    },
    {
      name: 'SMS',
      icon: MessageCircle,
      color: 'bg-gray-500 hover:bg-gray-600',
      url: `sms:?body=${encodedText}%20${encodedUrl}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-red-500 hover:bg-red-600',
      url: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
    },
  ];

  const handleShare = (option: typeof shareOptions[0]) => {
    if (option.action) {
      option.action();
    } else if (option.url) {
      window.open(option.url, '_blank', 'noopener,noreferrer,width=600,height=400');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="flex items-center gap-2 justify-center">
            <Share2 className="h-5 w-5" />
            {i18n.language === 'sw' ? 'Shiriki' : 'Share'}
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Property Preview Card */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 space-y-2">
            <h3 className="font-bold text-lg line-clamp-2">{title}</h3>
            {location && (
              <p className="text-sm opacity-90 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {location}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              {price && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <p className="text-xs opacity-75">Price</p>
                  <p className="font-bold">{currency} {formatPrice(price)}</p>
                </div>
              )}
              {area && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <p className="text-xs opacity-75">Area</p>
                  <p className="font-bold">{formatArea(area)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Copy Link Section */}
          <div className="flex items-center gap-2">
            <Input 
              value={url} 
              readOnly 
              className="flex-1 text-sm bg-muted"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Share Options Grid */}
          <div className="grid grid-cols-4 gap-3">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={() => handleShare(option)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-white transition-all active:scale-95 ${option.color}`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{option.name}</span>
                </button>
              );
            })}
          </div>

          {/* Native Share API (if supported) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={async () => {
                try {
                  await navigator.share({
                    title,
                    text: description,
                    url,
                  });
                } catch (error) {
                  // User cancelled or share failed
                }
              }}
            >
              <Share2 className="h-4 w-4" />
              {i18n.language === 'sw' ? 'Chaguzi Zaidi...' : 'More Options...'}
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
