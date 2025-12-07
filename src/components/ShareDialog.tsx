import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Share2, Copy, Check, MessageCircle, Mail, 
  Facebook, Instagram, Download, Image as ImageIcon, Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import { PropertyMapThumbnail } from './PropertyMapThumbnail';

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
  geojson,
  open, 
  onOpenChange 
}: ShareDialogProps) {
  const { i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [shareableImage, setShareableImage] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const shareText = description || title;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(title);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US').format(price);
  };

  const formatArea = (areaM2: number) => {
    if (areaM2 < 10000) {
      return `${areaM2.toFixed(0)} m²`;
    }
    return `${(areaM2 / 10000).toFixed(2)} ha`;
  };

  // Generate shareable image when dialog opens
  useEffect(() => {
    if (open && geojson && !shareableImage) {
      generateShareableImage();
    }
  }, [open, geojson]);

  const generateShareableImage = async () => {
    if (!shareCardRef.current) return;
    
    setGeneratingImage(true);
    try {
      // Wait for map to render
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      const imageUrl = canvas.toDataURL('image/png');
      setShareableImage(imageUrl);
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate shareable image');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleDownloadImage = () => {
    if (!shareableImage) return;
    
    const link = document.createElement('a');
    link.href = shareableImage;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_property.png`;
    link.click();
    toast.success(i18n.language === 'sw' ? 'Picha imepakuliwa!' : 'Image downloaded!');
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

  const handleShareWithImage = async (platform: string) => {
    // For platforms that support image sharing, we download first then guide user
    if (shareableImage) {
      handleDownloadImage();
      toast.info(
        i18n.language === 'sw' 
          ? `Picha imepakuliwa! Ipakue kwenye ${platform}` 
          : `Image downloaded! Upload it to ${platform}`
      );
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
      action: () => handleShareWithImage('Instagram'),
    },
    {
      name: 'TikTok',
      icon: TikTokIcon,
      color: 'bg-black hover:bg-gray-800',
      action: () => handleShareWithImage('TikTok'),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {i18n.language === 'sw' ? 'Shiriki' : 'Share'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Shareable Image Preview */}
          {geojson && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {i18n.language === 'sw' ? 'Picha ya Kushiriki' : 'Shareable Image'}
              </p>
              
              {/* Hidden card for capture */}
              <div 
                ref={shareCardRef}
                className="relative overflow-hidden rounded-xl"
                style={{ 
                  width: '400px', 
                  height: '500px',
                  position: shareableImage ? 'absolute' : 'relative',
                  left: shareableImage ? '-9999px' : '0',
                }}
              >
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary/80" />
                
                {/* Map section */}
                <div className="relative h-[280px] overflow-hidden">
                  <PropertyMapThumbnail 
                    geojson={geojson} 
                    className="w-full h-full"
                    showDimensions={true}
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-primary/90 to-transparent" />
                </div>
                
                {/* Details section */}
                <div className="relative p-5 text-white space-y-3">
                  {/* Title */}
                  <h3 className="text-xl font-bold leading-tight line-clamp-2">
                    {title}
                  </h3>
                  
                  {/* Location */}
                  {location && (
                    <p className="text-sm opacity-90 flex items-center gap-1">
                      📍 {location}
                    </p>
                  )}
                  
                  {/* Price & Area */}
                  <div className="flex items-center justify-between pt-2">
                    {price && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <p className="text-xs opacity-75">Price</p>
                        <p className="text-lg font-bold">
                          {currency} {formatPrice(price)}
                        </p>
                      </div>
                    )}
                    {area && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <p className="text-xs opacity-75">Area</p>
                        <p className="text-lg font-bold">{formatArea(area)}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Branding & URL */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">G</span>
                      </div>
                      <span className="font-semibold">GeoEstate</span>
                    </div>
                    <p className="text-xs opacity-75 truncate max-w-[150px]">
                      {url.replace('https://', '')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview of generated image */}
              {generatingImage ? (
                <div className="w-full h-48 bg-muted rounded-xl flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {i18n.language === 'sw' ? 'Inaunda picha...' : 'Generating image...'}
                    </p>
                  </div>
                </div>
              ) : shareableImage ? (
                <div className="space-y-2">
                  <img 
                    src={shareableImage} 
                    alt="Shareable preview" 
                    className="w-full rounded-xl shadow-lg"
                  />
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleDownloadImage}
                  >
                    <Download className="h-4 w-4" />
                    {i18n.language === 'sw' ? 'Pakua Picha' : 'Download Image'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={generateShareableImage}
                >
                  <ImageIcon className="h-4 w-4" />
                  {i18n.language === 'sw' ? 'Unda Picha' : 'Generate Image'}
                </Button>
              )}
            </div>
          )}

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
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-white transition-all ${option.color}`}
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
                  const shareData: ShareData = {
                    title,
                    text: description,
                    url,
                  };
                  
                  // If we have a shareable image and can share files
                  if (shareableImage && navigator.canShare) {
                    const response = await fetch(shareableImage);
                    const blob = await response.blob();
                    const file = new File([blob], 'property.png', { type: 'image/png' });
                    
                    if (navigator.canShare({ files: [file] })) {
                      shareData.files = [file];
                    }
                  }
                  
                  await navigator.share(shareData);
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
      </DialogContent>
    </Dialog>
  );
}