import { useState } from 'react';
import { MapPin, Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MapFiltersProps {
  // Basic filters
  listingTypeFilter: string;
  setListingTypeFilter: (v: string) => void;
  propertyTypeFilter: string;
  setPropertyTypeFilter: (v: string) => void;
  
  // Dealer filter
  dealerFilter: string;
  setDealerFilter: (v: string) => void;
  uniqueDealers: { id: string; full_name: string }[];
  
  // Location filters
  spatialFilterMode: 'boundary' | 'id';
  setSpatialFilterMode: (v: 'boundary' | 'id') => void;
  regionFilter: string;
  setRegionFilter: (v: string) => void;
  districtFilter: string;
  setDistrictFilter: (v: string) => void;
  wardFilter: string;
  setWardFilter: (v: string) => void;
  streetFilter: string;
  setStreetFilter: (v: string) => void;
  regions: any[];
  districts: any[];
  wards: any[];
  streets: any[];
  
  // Price filter
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  maxPrice: number;
  
  // Area filter
  areaRange: [number, number];
  setAreaRange: (v: [number, number]) => void;
  maxArea: number;
  
  // Search
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  
  // Reset
  onReset: () => void;
  activeFiltersCount: number;
}

export function MapFilters({
  listingTypeFilter,
  setListingTypeFilter,
  propertyTypeFilter,
  setPropertyTypeFilter,
  dealerFilter,
  setDealerFilter,
  uniqueDealers,
  spatialFilterMode,
  setSpatialFilterMode,
  regionFilter,
  setRegionFilter,
  districtFilter,
  setDistrictFilter,
  wardFilter,
  setWardFilter,
  streetFilter,
  setStreetFilter,
  regions,
  districts,
  wards,
  streets,
  priceRange,
  setPriceRange,
  maxPrice,
  areaRange,
  setAreaRange,
  maxArea,
  searchQuery,
  setSearchQuery,
  onReset,
  activeFiltersCount,
}: MapFiltersProps) {
  const [dealerSearchOpen, setDealerSearchOpen] = useState(false);

  const formatPrice = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const formatArea = (value: number) => {
    if (value >= 10000) return `${(value / 10000).toFixed(1)} ha`;
    return `${value} m²`;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-8"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Active filters badge & reset */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
          <span className="text-sm font-medium">{activeFiltersCount} filter(s) active</span>
          <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs">
            Reset All
          </Button>
        </div>
      )}

      {/* Listing Type */}
      <div>
        <label className="text-sm font-medium mb-2 block">Listing Type</label>
        <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sale">For Sale</SelectItem>
            <SelectItem value="rent">For Rent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Property Type */}
      <div>
        <label className="text-sm font-medium mb-2 block">Property Type</label>
        <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            <SelectItem value="land">Land</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Price Range: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
        </label>
        <Slider
          value={priceRange}
          min={0}
          max={maxPrice}
          step={maxPrice / 100}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          className="mt-3"
        />
      </div>

      {/* Area Range */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Area: {formatArea(areaRange[0])} - {formatArea(areaRange[1])}
        </label>
        <Slider
          value={areaRange}
          min={0}
          max={maxArea}
          step={maxArea / 100}
          onValueChange={(v) => setAreaRange(v as [number, number])}
          className="mt-3"
        />
      </div>

      {/* Dealer Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Dealer/Seller</label>
        <Popover open={dealerSearchOpen} onOpenChange={setDealerSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={dealerSearchOpen}
              className="w-full justify-between"
            >
              {dealerFilter === 'all'
                ? 'All Dealers'
                : uniqueDealers.find((d) => d.id === dealerFilter)?.full_name || 'Select...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0">
            <Command>
              <CommandInput placeholder="Search dealer..." />
              <CommandList>
                <CommandEmpty>No dealer found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="all" onSelect={() => { setDealerFilter('all'); setDealerSearchOpen(false); }}>
                    <Check className={cn('mr-2 h-4 w-4', dealerFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                    All Dealers
                  </CommandItem>
                  {uniqueDealers.map((dealer) => (
                    <CommandItem
                      key={dealer.id}
                      value={dealer.full_name}
                      onSelect={() => { setDealerFilter(dealer.id); setDealerSearchOpen(false); }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', dealerFilter === dealer.id ? 'opacity-100' : 'opacity-0')} />
                      {dealer.full_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Location Filters Section */}
      <div className="pt-4 border-t border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Location Filters</h3>
          <Select 
            value={spatialFilterMode} 
            onValueChange={(v: 'boundary' | 'id') => setSpatialFilterMode(v)}
          >
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boundary">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Spatial
                </span>
              </SelectItem>
              <SelectItem value="id">
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Assigned
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {spatialFilterMode === 'boundary' && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Spatial mode finds all properties within ward boundaries.
          </p>
        )}
        
        {/* Region */}
        <div>
          <label className="text-sm font-medium mb-2 block">Region</label>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* District */}
        {regionFilter !== 'all' && districts.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">District</label>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Ward */}
        {districtFilter !== 'all' && wards.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Ward</label>
            <Select value={wardFilter} onValueChange={setWardFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Wards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {wards.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Street */}
        {wardFilter !== 'all' && streets.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Street/Village</label>
            <Select value={streetFilter} onValueChange={setStreetFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Streets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streets</SelectItem>
                {streets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
