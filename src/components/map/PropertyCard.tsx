import { Link } from 'react-router-dom';
import { MapPin, Maximize2, CheckCircle2, Clock, TrendingUp, Star, Zap, Droplet } from 'lucide-react';
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
    has_electricity?: boolean | null;
    has_water?: boolean | null;
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
        "group relative rounded-lg border bg-card overflow-hidden cursor-pointer",
        "transition-all duration-200 ease-out",
        isHovered 
          ? "ring-2 ring-accent shadow-lg scale-[1.01] border-accent/50" 
          : "hover:shadow-md hover:border-border/80",
        isGrid ? "flex flex-col" : "flex gap-0"
      )}
      style={{ 
        animationDelay: `${index * 30}ms`,
      }}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onSelect?.(listing)}
    >
      {/* Thumbnail - compact for mobile */}
      <div className={cn(
        "relative bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden",
        isGrid ? "h-24 sm:h-32 w-full" : "h-20 w-20 sm:h-24 sm:w-24 shrink-0"
      )}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,hsl(var(--muted-foreground)/0.05)_25%,hsl(var(--muted-foreground)/0.05)_50%,transparent_50%,transparent_75%,hsl(var(--muted-foreground)/0.05)_75%)] bg-[length:20px_20px]" />
        </div>
        
        <MapPin className={cn(
          "text-muted-foreground/40 transition-transform duration-200",
          isHovered ? "scale-110" : "",
          isGrid ? "h-8 w-8 sm:h-10 sm:w-10" : "h-6 w-6 sm:h-8 sm:w-8"
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

      {/* Content - compact for mobile */}
      <div className={cn("flex-1 flex flex-col min-w-0", isGrid ? "p-2 sm:p-3" : "p-2 py-1.5 sm:p-3 sm:py-2")}>
        {/* Title */}
        <h4 className={cn(
          "font-semibold line-clamp-1 transition-colors duration-200",
          isGrid ? "text-xs sm:text-sm mb-0.5" : "text-xs sm:text-sm",
          isHovered ? "text-accent" : ""
        )}>
          {listing.title}
        </h4>
        
        {/* Location */}
        <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5 line-clamp-1 mb-auto">
          <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-accent/60" />
          <span className="truncate">{listing.location_label}</span>
        </p>

        {/* Stats row - more compact */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mt-1.5 sm:mt-2">
          {listing.polygon?.area_m2 && (
            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5">
              <Maximize2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {formatArea(listing.polygon.area_m2)}
            </span>
          )}
          {distance && (
            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {formatDistance(distance)}
            </span>
          )}
          {/* Utilities - inline compact */}
          {listing.has_electricity !== null && listing.has_electricity !== undefined && (
            <div 
              className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] sm:text-[10px] ${
                listing.has_electricity 
                  ? 'bg-yellow-500/20 text-yellow-600' 
                  : 'bg-muted text-muted-foreground'
              }`}
              title={listing.has_electricity ? 'Electricity Available' : 'No Electricity'}
            >
              <Zap className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
              {listing.has_electricity ? '1' : '0'}
            </div>
          )}
          {listing.has_water !== null && listing.has_water !== undefined && (
            <div 
              className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] sm:text-[10px] ${
                listing.has_water 
                  ? 'bg-blue-500/20 text-blue-600' 
                  : 'bg-muted text-muted-foreground'
              }`}
              title={listing.has_water ? 'Water Available' : 'No Water'}
            >
              <Droplet className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
              {listing.has_water ? '1' : '0'}
            </div>
          )}
        </div>

        {/* Price and actions - compact */}
        <div className={cn(
          "flex items-center justify-between mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/50",
          isGrid && "flex-col items-stretch gap-1.5"
        )}>
          <div className="flex items-center gap-0.5">
            {listing.price && <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />}
            <span className="font-bold text-xs sm:text-sm text-foreground truncate">
              {listing.price 
                ? formatPrice(listing.price, listing.currency || 'TZS')
                : 'Contact for price'}
            </span>
          </div>
          
          <div className={cn("flex gap-1", isGrid && "justify-end")}>
            <Link to={`/listings/${listing.id}`} onClick={(e) => e.stopPropagation()}>
              <Button 
                size="sm" 
                className={cn(
                  "h-6 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3 rounded-full transition-all duration-200",
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
