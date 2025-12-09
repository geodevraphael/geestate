import { Link } from 'react-router-dom';
import { MapPin, Maximize2, CheckCircle2, Eye } from 'lucide-react';
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
}

export function PropertyCard({ 
  listing, 
  distance, 
  viewMode = 'list',
  isHovered,
  onHover,
  onSelect 
}: PropertyCardProps) {
  const isGrid = viewMode === 'grid';
  
  const formatArea = (area: number) => {
    if (area < 10000) {
      return `${area.toLocaleString()} m²`;
    }
    return `${(area / 10000).toFixed(2)} ha`;
  };

  const formatPrice = (price: number, currency: string) => {
    if (price >= 1000000) {
      return `${currency} ${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `${currency} ${(price / 1000).toFixed(0)}K`;
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card transition-all duration-200 overflow-hidden",
        isHovered 
          ? "ring-2 ring-primary shadow-lg scale-[1.02]" 
          : "hover:shadow-md hover:border-primary/50",
        isGrid ? "flex flex-col" : "flex gap-3"
      )}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Thumbnail placeholder with gradient */}
      <div className={cn(
        "relative bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center",
        isGrid ? "h-32 w-full" : "h-24 w-24 shrink-0 rounded-l-xl"
      )}>
        <MapPin className="h-8 w-8 text-primary/40" />
        
        {/* Listing type badge */}
        <Badge 
          variant={listing.listing_type === 'sale' ? 'default' : 'secondary'}
          className={cn(
            "absolute top-2 left-2 text-[10px] px-1.5 py-0",
            listing.listing_type === 'sale' 
              ? "bg-emerald-500 hover:bg-emerald-600" 
              : "bg-amber-500 hover:bg-amber-600"
          )}
        >
          {listing.listing_type === 'sale' ? 'Sale' : 'Rent'}
        </Badge>

        {/* Verification badge */}
        {listing.verification_status === 'verified' && (
          <div className="absolute top-2 right-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 drop-shadow" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 p-3", isGrid && "space-y-2")}>
        {/* Title */}
        <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {listing.title}
        </h4>
        
        {/* Location */}
        <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
          <MapPin className="h-3 w-3 shrink-0" />
          {listing.location_label}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {listing.polygon?.area_m2 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Maximize2 className="h-3 w-3" />
              {formatArea(listing.polygon.area_m2)}
            </span>
          )}
          {distance && (
            <span className="text-xs text-muted-foreground">
              {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
            </span>
          )}
        </div>

        {/* Price and actions */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <span className="font-bold text-primary text-sm">
            {listing.price 
              ? formatPrice(listing.price, listing.currency || 'TZS')
              : 'Contact'}
          </span>
          
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onSelect?.(listing)}
              title="View on map"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Link to={`/listings/${listing.id}`}>
              <Button size="sm" className="h-7 text-xs px-2">
                Details
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
