import { useState } from 'react';
import { Grid3X3, List, ArrowUpDown, MapPin, Loader2, TrendingUp, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PropertyCard } from './PropertyCard';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PropertyListProps {
  listings: any[];
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  hoveredListingId: string | null;
  onHoverListing: (id: string | null) => void;
  onSelectListing: (listing: any) => void;
  userLocation?: { lat: number; lng: number } | null;
  loading?: boolean;
}

export function PropertyList({
  listings,
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  hoveredListingId,
  onHoverListing,
  onSelectListing,
  userLocation,
  loading = false,
}: PropertyListProps) {
  // Calculate distance if user location is available
  const listingsWithDistance = listings.map(listing => {
    if (!userLocation || !listing.polygon?.centroid_lat || !listing.polygon?.centroid_lng) {
      return { ...listing, distance: null };
    }
    const R = 6371;
    const dLat = (listing.polygon.centroid_lat - userLocation.lat) * Math.PI / 180;
    const dLon = (listing.polygon.centroid_lng - userLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(listing.polygon.centroid_lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return { ...listing, distance: R * c };
  });

  // Calculate summary stats
  const totalValue = listings.reduce((sum, l) => sum + (l.price || 0), 0);
  const avgPrice = listings.length > 0 ? totalValue / listings.length : 0;

  const formatPrice = (price: number) => {
    if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)}B`;
    if (price >= 1000000) return `${(price / 1000000).toFixed(0)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toLocaleString();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with stats and controls */}
      <div className="p-3 border-b bg-muted/30 space-y-2">
        {/* Stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent/10">
              <Map className="h-4 w-4 text-accent" />
            </div>
            <div>
              <span className="font-bold text-lg">{listings.length}</span>
              <span className="text-xs text-muted-foreground ml-1">properties</span>
            </div>
          </div>
          
          {avgPrice > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Avg price
              </div>
              <span className="font-semibold text-sm">TZS {formatPrice(avgPrice)}</span>
            </div>
          )}
        </div>
        
        {/* Controls row */}
        <div className="flex items-center justify-between gap-2">
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 flex-1 text-xs bg-background">
              <ArrowUpDown className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">
                <span className="flex items-center gap-2">📍 Distance</span>
              </SelectItem>
              <SelectItem value="price-asc">
                <span className="flex items-center gap-2">💰 Price: Low to High</span>
              </SelectItem>
              <SelectItem value="price-desc">
                <span className="flex items-center gap-2">💎 Price: High to Low</span>
              </SelectItem>
              <SelectItem value="area-asc">
                <span className="flex items-center gap-2">📐 Area: Smallest</span>
              </SelectItem>
              <SelectItem value="area-desc">
                <span className="flex items-center gap-2">🏞️ Area: Largest</span>
              </SelectItem>
              <SelectItem value="newest">
                <span className="flex items-center gap-2">✨ Newest First</span>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* View toggle */}
          <div className="flex border rounded-lg bg-background overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-none transition-all duration-200", 
                viewMode === 'list' && "bg-accent text-accent-foreground"
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-none transition-all duration-200", 
                viewMode === 'grid' && "bg-accent text-accent-foreground"
              )}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Listings */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-10 w-10 rounded-full border-3 border-accent border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading properties...</p>
            </div>
          ) : listings.length > 0 ? (
            <div className={cn(
              "gap-3",
              viewMode === 'grid' 
                ? "grid grid-cols-2" 
                : "flex flex-col"
            )}>
              {listingsWithDistance.map((listing, index) => (
                <PropertyCard
                  key={listing.id}
                  listing={listing}
                  distance={listing.distance}
                  viewMode={viewMode}
                  isHovered={hoveredListingId === listing.id}
                  onHover={onHoverListing}
                  onSelect={onSelectListing}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No properties found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
