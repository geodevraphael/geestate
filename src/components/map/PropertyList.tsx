import { Grid3X3, List, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PropertyCard } from './PropertyCard';
import { cn } from '@/lib/utils';

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

  return (
    <div className="flex flex-col h-full">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{listings.length} Properties</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Distance</SelectItem>
              <SelectItem value="price-asc">Price: Low</SelectItem>
              <SelectItem value="price-desc">Price: High</SelectItem>
              <SelectItem value="area-asc">Area: Small</SelectItem>
              <SelectItem value="area-desc">Area: Large</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
          
          {/* View toggle */}
          <div className="flex border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-r-none", viewMode === 'list' && "bg-muted")}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-l-none", viewMode === 'grid' && "bg-muted")}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className={cn(
          "gap-3",
          viewMode === 'grid' 
            ? "grid grid-cols-2" 
            : "flex flex-col"
        )}>
          {listingsWithDistance.map((listing) => (
            <PropertyCard
              key={listing.id}
              listing={listing}
              distance={listing.distance}
              viewMode={viewMode}
              isHovered={hoveredListingId === listing.id}
              onHover={onHoverListing}
              onSelect={onSelectListing}
            />
          ))}
        </div>

        {listings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No properties match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
