import { useState } from 'react';
import { MapPin, Check, ChevronsUpDown, Search, X, Filter, RotateCcw, DollarSign, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [showLocationFilters, setShowLocationFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const formatPrice = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const formatArea = (value: number) => {
    if (value >= 10000) return `${(value / 10000).toFixed(1)} ha`;
    return `${value.toLocaleString()} m²`;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
        <Input
          placeholder="Search by title or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-8 h-10 bg-muted/50 border-muted focus:bg-background transition-all"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Active filters badge & reset */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between bg-accent/10 rounded-lg px-3 py-2.5 border border-accent/20">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">
              {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onReset} 
            className="h-7 text-xs hover:bg-destructive/10 hover:text-destructive gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      )}

      {/* Quick Filters - Listing Type Pills */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Listing Type</label>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All', icon: '🏠' },
            { value: 'sale', label: 'For Sale', icon: '💰' },
            { value: 'rent', label: 'For Rent', icon: '🔑' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setListingTypeFilter(option.value)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                "border-2",
                listingTypeFilter === option.value
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border/80 hover:bg-muted/50"
              )}
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Property Type */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Property Type</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'land', label: '🌍 Land' },
            { value: 'house', label: '🏡 House' },
            { value: 'apartment', label: '🏢 Apartment' },
            { value: 'commercial', label: '🏪 Commercial' },
          ].map(option => (
            <Badge
              key={option.value}
              variant={propertyTypeFilter === option.value ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all duration-200 py-1.5 px-3",
                propertyTypeFilter === option.value
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "hover:bg-muted"
              )}
              onClick={() => setPropertyTypeFilter(option.value)}
            >
              {option.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" />
            Price Range
          </label>
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
            TZS {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
          </span>
        </div>
        <Slider
          value={priceRange}
          min={0}
          max={maxPrice}
          step={maxPrice / 100}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>{formatPrice(maxPrice)}</span>
        </div>
      </div>

      {/* Area Range */}
      <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Ruler className="h-4 w-4 text-accent" />
            Land Area
          </label>
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
            {formatArea(areaRange[0])} - {formatArea(areaRange[1])}
          </span>
        </div>
        <Slider
          value={areaRange}
          min={0}
          max={maxArea}
          step={maxArea / 100}
          onValueChange={(v) => setAreaRange(v as [number, number])}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>{formatArea(maxArea)}</span>
        </div>
      </div>

      {/* Dealer Filter */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3 bg-muted/30">
            <span className="text-sm font-medium">Advanced Filters</span>
            <ChevronsUpDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              showAdvancedFilters && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seller / Dealer</label>
            <Popover open={dealerSearchOpen} onOpenChange={setDealerSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={dealerSearchOpen}
                  className="w-full justify-between h-10"
                >
                  {dealerFilter === 'all'
                    ? 'All Sellers'
                    : uniqueDealers.find((d) => d.id === dealerFilter)?.full_name || 'Select...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <Command>
                  <CommandInput placeholder="Search seller..." />
                  <CommandList>
                    <CommandEmpty>No seller found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="all" onSelect={() => { setDealerFilter('all'); setDealerSearchOpen(false); }}>
                        <Check className={cn('mr-2 h-4 w-4', dealerFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                        All Sellers
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
        </CollapsibleContent>
      </Collapsible>

      {/* Location Filters Section */}
      <Collapsible open={showLocationFilters} onOpenChange={setShowLocationFilters}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3 bg-muted/30">
            <span className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              Location Filters
            </span>
            <ChevronsUpDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              showLocationFilters && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Filter Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setSpatialFilterMode('boundary')}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border",
                spatialFilterMode === 'boundary'
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
              )}
            >
              <MapPin className="h-3 w-3 inline mr-1" />
              Spatial
            </button>
            <button
              onClick={() => setSpatialFilterMode('id')}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border",
                spatialFilterMode === 'id'
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
              )}
            >
              <Check className="h-3 w-3 inline mr-1" />
              Assigned
            </button>
          </div>
          
          {spatialFilterMode === 'boundary' && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg border border-dashed">
              💡 Spatial mode finds all properties within administrative boundaries.
            </p>
          )}
          
          {/* Region */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Region</label>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="h-9">
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
            <div className="space-y-2 animate-fade-in">
              <label className="text-xs font-medium text-muted-foreground">District</label>
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="h-9">
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
            <div className="space-y-2 animate-fade-in">
              <label className="text-xs font-medium text-muted-foreground">Ward</label>
              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger className="h-9">
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
            <div className="space-y-2 animate-fade-in">
              <label className="text-xs font-medium text-muted-foreground">Street/Village</label>
              <Select value={streetFilter} onValueChange={setStreetFilter}>
                <SelectTrigger className="h-9">
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
