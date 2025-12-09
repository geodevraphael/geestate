import { Link } from 'react-router-dom';
import { MapPin, Maximize2, CheckCircle2, Eye, Clock, TrendingUp, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  listing: {
    id: string;
    title: string;
    location_label: string;
    price?: number | null;
    currency?: string | null;
    listing_type?: string;
    property_type?: string;
    verification_status?: string | null;
    created_at?: string;
    polygon?: {
      area_m2?: number | null;
    } | null;
    owner?: {
      full_name: string;
    } | null;
  };
  distance?: number | null;
  viewMode?: 'grid' | 'list';
  isHovered?: boolean;
  onHover?: (id: string | null) => void;
  onSelect?: (listing: any) => void;
  index?: number;
}

export function PropertyCard({ 
  listing, 
  distance, 
  viewMode = 'list',
  isHovered,
  onHover,
  onSelect,
  index = 0
}: PropertyCardProps) {
  const isGrid = viewMode === 'grid';
  
  const formatArea = (area: number) => {
    if (area < 10000) {
      return `${area.toLocaleString()} m²`;
    }
    return `${(area / 10000).toFixed(2)} ha`;
  };

  const formatPrice = (price: number, currency: string) => {
    if (price >= 1000000000) {
      return `${currency} ${(price / 1000000000).toFixed(1)}B`;
    }
    if (price >= 1000000) {
      return `${currency} ${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `${currency} ${(price / 1000).toFixed(0)}K`;
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  const formatDistance = (d: number) => {
    if (d < 1) return `${(d * 1000).toFixed(0)}m away`;
    return `${d.toFixed(1)}km away`;
  };

  const isNew = listing.created_at && 
    (Date.now() - new Date(listing.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card overflow-hidden cursor-pointer",
        "transition-all duration-300 ease-out",
        isHovered 
          ? "ring-2 ring-accent shadow-xl scale-[1.02] border-accent/50" 
          : "hover:shadow-lg hover:border-border/80 hover:-translate-y-0.5",
        isGrid ? "flex flex-col" : "flex gap-0"
      )}
      style={{ 
        animationDelay: `${index * 50}ms`,
      }}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onSelect?.(listing)}
    >
      {/* Thumbnail with gradient overlay */}
      <div className={cn(
        "relative bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden",
        isGrid ? "h-36 w-full" : "h-28 w-28 shrink-0"
      )}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,hsl(var(--muted-foreground)/0.05)_25%,hsl(var(--muted-foreground)/0.05)_50%,transparent_50%,transparent_75%,hsl(var(--muted-foreground)/0.05)_75%)] bg-[length:20px_20px]" />
        </div>
        
        <MapPin className={cn(
          "text-muted-foreground/40 transition-transform duration-300",
          isHovered ? "scale-110" : "",
          isGrid ? "h-10 w-10" : "h-8 w-8"
        )} />
        
        {/* Top badges row */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          {/* Listing type badge */}
          <Badge 
            className={cn(
              "text-[10px] px-2 py-0.5 font-semibold shadow-sm border-0",
              listing.listing_type === 'sale' 
                ? "bg-emerald-500/90 text-white hover:bg-emerald-500" 
                : "bg-amber-500/90 text-white hover:bg-amber-500"
            )}
          >
            {listing.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
          </Badge>

          {/* Status badges */}
          <div className="flex items-center gap-1">
            {isNew && (
              <Badge className="bg-accent/90 text-accent-foreground text-[10px] px-1.5 py-0 shadow-sm border-0">
                <Star className="h-2.5 w-2.5 mr-0.5" />
                New
              </Badge>
            )}
            {listing.verification_status === 'verified' && (
              <div className="bg-emerald-500 rounded-full p-0.5 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Property type badge */}
        {listing.property_type && (
          <Badge 
            variant="secondary" 
            className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0 bg-background/80 backdrop-blur-sm"
          >
            {listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)}
          </Badge>
        )}

        {/* Hover overlay */}
        <div className={cn(
          "absolute inset-0 bg-foreground/5 transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )} />
      </div>

      {/* Content */}
      <div className={cn("flex-1 flex flex-col", isGrid ? "p-3" : "p-3 py-2")}>
        {/* Title */}
        <h4 className={cn(
          "font-semibold line-clamp-1 transition-colors duration-200",
          isGrid ? "text-sm mb-1" : "text-sm",
          isHovered ? "text-accent" : ""
        )}>
          {listing.title}
        </h4>
        
        {/* Location */}
        <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1 mb-auto">
          <MapPin className="h-3 w-3 shrink-0 text-accent/60" />
          {listing.location_label}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap mt-2">
          {listing.polygon?.area_m2 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {formatArea(listing.polygon.area_m2)}
            </span>
          )}
          {distance && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistance(distance)}
            </span>
          )}
        </div>

        {/* Price and actions */}
        <div className={cn(
          "flex items-center justify-between mt-2 pt-2 border-t border-border/50",
          isGrid && "flex-col items-stretch gap-2"
        )}>
          <div className="flex items-center gap-1">
            {listing.price && <TrendingUp className="h-3.5 w-3.5 text-accent" />}
            <span className="font-bold text-foreground">
              {listing.price 
                ? formatPrice(listing.price, listing.currency || 'TZS')
                : 'Contact for price'}
            </span>
          </div>
          
          <div className={cn("flex gap-1.5", isGrid && "justify-end")}>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 w-7 p-0 rounded-full transition-all duration-200",
                isHovered ? "bg-accent/10 text-accent" : ""
              )}
              onClick={(e) => { e.stopPropagation(); onSelect?.(listing); }}
              title="View on map"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Link to={`/listings/${listing.id}`} onClick={(e) => e.stopPropagation()}>
              <Button 
                size="sm" 
                className={cn(
                  "h-7 text-xs px-3 rounded-full transition-all duration-200",
                  isHovered ? "bg-accent hover:bg-accent/90" : ""
                )}
              >
                Details
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hover shine effect */}
      <div className={cn(
        "absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-500",
        "bg-gradient-to-r from-transparent via-white/5 to-transparent",
        isHovered && "opacity-100 animate-[shine_1s_ease-in-out]"
      )} />
    </div>
  );
}
