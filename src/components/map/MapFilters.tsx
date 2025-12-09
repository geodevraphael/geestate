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
  const [showLocationFilters, setShowLocationFilters] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

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
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
        <Input
          placeholder="Search by title or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-9 h-11 bg-muted/50 border-muted focus:bg-background transition-all rounded-xl"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-destructive/10 hover:text-destructive rounded-full"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Active filters badge & reset */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between bg-accent/10 rounded-xl px-4 py-3 border border-accent/20">
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
            className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive gap-1.5 rounded-lg"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      )}

      {/* Quick Filters - Listing Type */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Listing Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'all', label: 'All', icon: '🏠' },
            { value: 'sale', label: 'Sale', icon: '💰' },
            { value: 'rent', label: 'Rent', icon: '🔑' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setListingTypeFilter(option.value)}
              className={cn(
                "py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200",
                "border-2 flex flex-col items-center gap-1",
                listingTypeFilter === option.value
                  ? "border-accent bg-accent/10 text-foreground shadow-sm"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/50"
              )}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="text-xs">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Property Type */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property Type</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'land', label: '🌍 Land' },
            { value: 'house', label: '🏡 House' },
            { value: 'apartment', label: '🏢 Apt' },
            { value: 'commercial', label: '🏪 Commercial' },
          ].map(option => (
            <Badge
              key={option.value}
              variant={propertyTypeFilter === option.value ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all duration-200 py-1.5 px-3 rounded-lg text-xs",
                propertyTypeFilter === option.value
                  ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                  : "hover:bg-muted hover:border-muted-foreground/30"
              )}
              onClick={() => setPropertyTypeFilter(option.value)}
            >
              {option.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3 p-4 rounded-xl bg-muted/30 border">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" />
            Price Range
          </label>
          <span className="text-xs text-muted-foreground bg-background px-2.5 py-1 rounded-lg font-medium">
            {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
          </span>
        </div>
        <Slider
          value={priceRange}
          min={0}
          max={maxPrice}
          step={maxPrice / 100}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          className="mt-3"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span>TZS 0</span>
          <span>TZS {formatPrice(maxPrice)}</span>
        </div>
      </div>

      {/* Area Range */}
      <div className="space-y-3 p-4 rounded-xl bg-muted/30 border">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Ruler className="h-4 w-4 text-accent" />
            Land Area
          </label>
          <span className="text-xs text-muted-foreground bg-background px-2.5 py-1 rounded-lg font-medium">
            {formatArea(areaRange[0])} - {formatArea(areaRange[1])}
          </span>
        </div>
        <Slider
          value={areaRange}
          min={0}
          max={maxArea}
          step={maxArea / 100}
          onValueChange={(v) => setAreaRange(v as [number, number])}
          className="mt-3"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span>0 m²</span>
          <span>{formatArea(maxArea)}</span>
        </div>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-11 px-4 bg-muted/30 rounded-xl hover:bg-muted/50">
            <span className="text-sm font-semibold">Advanced Filters</span>
            <ChevronsUpDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              showAdvancedFilters && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4 animate-fade-in">
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seller / Dealer</label>
            <Popover open={dealerSearchOpen} onOpenChange={setDealerSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={dealerSearchOpen}
                  className="w-full justify-between h-11 rounded-xl"
                >
                  {dealerFilter === 'all'
                    ? 'All Sellers'
                    : uniqueDealers.find((d) => d.id === dealerFilter)?.full_name || 'Select...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0">
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
          <Button variant="ghost" className="w-full justify-between h-11 px-4 bg-muted/30 rounded-xl hover:bg-muted/50">
            <span className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              Location Filters
            </span>
            <ChevronsUpDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              showLocationFilters && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4 animate-fade-in">
          {/* Filter Mode Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSpatialFilterMode('boundary')}
              className={cn(
                "py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-200 border-2",
                spatialFilterMode === 'boundary'
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30"
              )}
            >
              <MapPin className="h-3.5 w-3.5 inline mr-1.5" />
              Spatial
            </button>
            <button
              onClick={() => setSpatialFilterMode('id')}
              className={cn(
                "py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-200 border-2",
                spatialFilterMode === 'id'
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30"
              )}
            >
              <Check className="h-3.5 w-3.5 inline mr-1.5" />
              Assigned
            </button>
          </div>
          
          {spatialFilterMode === 'boundary' && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl border border-dashed">
              💡 Finds all properties within administrative boundaries.
            </p>
          )}
          
          {/* Region */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Region</label>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="h-10 rounded-xl">
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
              <label className="text-xs font-semibold text-muted-foreground">District</label>
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="h-10 rounded-xl">
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
              <label className="text-xs font-semibold text-muted-foreground">Ward</label>
              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger className="h-10 rounded-xl">
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
              <label className="text-xs font-semibold text-muted-foreground">Street/Village</label>
              <Select value={streetFilter} onValueChange={setStreetFilter}>
                <SelectTrigger className="h-10 rounded-xl">
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
