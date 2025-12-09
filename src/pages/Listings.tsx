import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { MapPin, Search, CheckCircle2, X, Map, Eye, TrendingUp, Filter, Share2, FolderOpen, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ListingWithDetails } from '@/types/database';
import { PropertyMapThumbnail } from '@/components/PropertyMapThumbnail';
import { MarketplaceViewToggle } from '@/components/MarketplaceViewToggle';
import { ShareDialog } from '@/components/ShareDialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const ITEMS_PER_PAGE = 24;

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ownerParam = searchParams.get('owner');
  const { t } = useTranslation();
  
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [plotNumberFilter, setPlotNumberFilter] = useState('');
  const [blockNumberFilter, setBlockNumberFilter] = useState('');
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [ownerInfo, setOwnerInfo] = useState<{ name: string; type: 'seller' | 'institution' } | null>(null);
  const [view, setView] = useState<'individual' | 'projects'>('individual');
  const [projects, setProjects] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareListingData, setShareListingData] = useState<{ 
    id: string; 
    title: string; 
    location: string;
    price?: number;
    currency?: string;
    area?: number;
    geojson?: any;
  } | null>(null);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [searchQuery, plotNumberFilter, blockNumberFilter, listingTypeFilter, propertyTypeFilter, verificationFilter, sortBy, ownerParam]);

  useEffect(() => {
    fetchListings();
    if (view === 'projects') {
      fetchProjects();
    }
  }, [ownerParam, view, currentPage, searchQuery, plotNumberFilter, blockNumberFilter, listingTypeFilter, propertyTypeFilter, verificationFilter, sortBy]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Build base query with count
      let countQuery = supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      // Apply filters to count query
      if (ownerParam) {
        countQuery = countQuery.eq('owner_id', ownerParam);
      }
      if (listingTypeFilter !== 'all') {
        countQuery = countQuery.eq('listing_type', listingTypeFilter as any);
      }
      if (propertyTypeFilter !== 'all') {
        countQuery = countQuery.eq('property_type', propertyTypeFilter as any);
      }
      if (verificationFilter !== 'all') {
        countQuery = countQuery.eq('verification_status', verificationFilter as any);
      }
      if (searchQuery) {
        countQuery = countQuery.or(`title.ilike.%${searchQuery}%,location_label.ilike.%${searchQuery}%,region.ilike.%${searchQuery}%`);
      }
      if (plotNumberFilter) {
        countQuery = countQuery.ilike('plot_number', `%${plotNumberFilter}%`);
      }
      if (blockNumberFilter) {
        countQuery = countQuery.ilike('block_number', `%${blockNumberFilter}%`);
      }

      // Get total count
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Build data query with pagination
      let query = (supabase as any)
        .from('listings')
        .select(`
          *,
          owner:profiles(full_name, organization_name, role),
          media:listing_media(file_url, media_type),
          polygon:listing_polygons(geojson),
          valuation:valuation_estimates(estimated_value, estimation_currency),
          project:projects(id, name, project_type, status)
        `)
        .eq('status', 'published');

      // Apply filters
      if (ownerParam) {
        query = query.eq('owner_id', ownerParam);
        
        // Fetch owner information (only once)
        if (!ownerInfo) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, organization_name')
            .eq('id', ownerParam)
            .single();

          if (profileData) {
            setOwnerInfo({
              name: profileData.organization_name || profileData.full_name,
              type: 'seller'
            });
          } else {
            const { data: institutionData } = await supabase
              .from('institutional_sellers')
              .select('institution_name')
              .eq('profile_id', ownerParam)
              .single();

            if (institutionData) {
              setOwnerInfo({
                name: institutionData.institution_name,
                type: 'institution'
              });
            }
          }
        }
      } else {
        setOwnerInfo(null);
      }

      if (listingTypeFilter !== 'all') {
        query = query.eq('listing_type', listingTypeFilter as any);
      }
      if (propertyTypeFilter !== 'all') {
        query = query.eq('property_type', propertyTypeFilter as any);
      }
      if (verificationFilter !== 'all') {
        query = query.eq('verification_status', verificationFilter as any);
      }
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,location_label.ilike.%${searchQuery}%,region.ilike.%${searchQuery}%`);
      }
      if (plotNumberFilter) {
        query = query.ilike('plot_number', `%${plotNumberFilter}%`);
      }
      if (blockNumberFilter) {
        query = query.ilike('block_number', `%${blockNumberFilter}%`);
      }

      // Add pagination and sorting
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      // Apply sorting
      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true, nullsFirst: false });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false, nullsFirst: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }
      
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          listings!inner(id, status)
        `)
        .eq('listings.status', 'published')
        .order('name');

      if (error) throw error;
      
      // Remove duplicates caused by multiple listings per project
      const seen = new Set<string>();
      const uniqueProjects = data?.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      }) || [];
      
      setProjects(uniqueProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const clearOwnerFilter = () => {
    searchParams.delete('owner');
    setSearchParams(searchParams);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setPlotNumberFilter('');
    setBlockNumberFilter('');
    setListingTypeFilter('all');
    setPropertyTypeFilter('all');
    setVerificationFilter('all');
    setSortBy('newest');
    clearOwnerFilter();
  };

  const handleShareListing = (listing: ListingWithDetails, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const polygonData = (listing as any).polygon;
    setShareListingData({
      id: listing.id,
      title: listing.title,
      location: listing.location_label,
      price: listing.price ?? undefined,
      currency: listing.currency ?? 'TZS',
      area: polygonData?.area_m2 ?? undefined,
      geojson: polygonData?.geojson ?? undefined,
    });
    setShareDialogOpen(true);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => setCurrentPage(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 3) {
        items.push(<PaginationEllipsis key="ellipsis-1" />);
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (currentPage < totalPages - 2) {
        items.push(<PaginationEllipsis key="ellipsis-2" />);
      }

      // Always show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <MainLayout>
      <div className="w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
          <div className="w-full px-4 md:px-8 lg:px-12 py-6 md:py-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {ownerInfo ? `${ownerInfo.name}'s ${t('listing.listings')}` : t('listing.propertyMarketplace')}
                </h1>
                <p className="text-sm md:text-lg text-muted-foreground">
                  {ownerInfo 
                    ? `${t('listing.viewingFrom')} ${ownerInfo.name}`
                    : t('listing.discoverProperties')
                  }
                </p>
              </div>
              {!ownerInfo && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <MarketplaceViewToggle view={view} onViewChange={setView} />
                  <Link to="/map">
                    <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                      <Map className="h-5 w-5" />
                      {t('listing.browseOnMap')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Owner Filter Badge */}
            {ownerInfo && (
              <div className="mb-4">
                <Badge variant="secondary" className="text-sm py-2 px-4 gap-2 shadow-sm">
                  <Filter className="h-3.5 w-3.5" />
                  {t('listing.filteredBy')}: {ownerInfo.name}
                  <button 
                    onClick={clearOwnerFilter}
                    className="ml-1 hover:bg-background/50 rounded-full p-0.5 transition-colors"
                    aria-label={t('listing.clearFilter')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}

            {/* Filters */}
            <Card className="shadow-lg border-border/50 rounded-2xl overflow-hidden backdrop-blur-sm bg-background/95">
              <CardContent className="pt-6 px-6 pb-6">
                {/* Main Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('listing.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>

                  <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t('listing.listingType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('listing.allTypes')}</SelectItem>
                      <SelectItem value="sale">{t('listingTypes.sale')}</SelectItem>
                      <SelectItem value="rent">{t('listingTypes.rent')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t('listing.propertyType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('listing.allProperties')}</SelectItem>
                      <SelectItem value="land">{t('propertyTypes.land')}</SelectItem>
                      <SelectItem value="house">{t('propertyTypes.residential')}</SelectItem>
                      <SelectItem value="apartment">{t('propertyTypes.residential')}</SelectItem>
                      <SelectItem value="commercial">{t('propertyTypes.commercial')}</SelectItem>
                      <SelectItem value="other">{t('common.other')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t('listing.verificationStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('listing.allStatuses')}</SelectItem>
                      <SelectItem value="verified">{t('verificationStatus.verified')}</SelectItem>
                      <SelectItem value="pending">{t('verificationStatus.pending')}</SelectItem>
                      <SelectItem value="unverified">{t('verificationStatus.unverified')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Additional Filters Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Plot Number"
                    value={plotNumberFilter}
                    onChange={(e) => setPlotNumberFilter(e.target.value)}
                    className="bg-background"
                  />
                  
                  <Input
                    placeholder="Block Number"
                    value={blockNumberFilter}
                    onChange={(e) => setBlockNumberFilter(e.target.value)}
                    className="bg-background"
                  />
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-background">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">
                        <div className="flex items-center gap-2">
                          <ArrowDown className="h-3 w-3" />
                          Newest First
                        </div>
                      </SelectItem>
                      <SelectItem value="oldest">
                        <div className="flex items-center gap-2">
                          <ArrowUp className="h-3 w-3" />
                          Oldest First
                        </div>
                      </SelectItem>
                      <SelectItem value="price_asc">
                        <div className="flex items-center gap-2">
                          <ArrowUp className="h-3 w-3" />
                          Price: Low to High
                        </div>
                      </SelectItem>
                      <SelectItem value="price_desc">
                        <div className="flex items-center gap-2">
                          <ArrowDown className="h-3 w-3" />
                          Price: High to Low
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    onClick={clearAllFilters}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        <div className="w-full px-4 md:px-8 lg:px-12 py-6 md:py-8">
          {/* Results Count */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="text-lg font-medium">
                {loading ? t('common.loading') : 
                  view === 'projects' 
                    ? `${projects.length} ${projects.length === 1 ? 'Project' : 'Projects'}`
                    : `${totalCount.toLocaleString()} ${t('listing.propertiesAvailable')}`
                }
              </p>
            </div>
            {view === 'individual' && totalCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()}
              </p>
            )}
          </div>

          {/* Projects View */}
          {view === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {projects.map((project) => {
                const projectListings = listings.filter((l: any) => l.project_id === project.id);
                if (projectListings.length === 0) return null;
                
                return (
                  <Card key={project.id} className="hover:shadow-xl transition-all overflow-hidden">
                    {project.image_url && (
                      <div className="w-full h-48 overflow-hidden">
                        <img 
                          src={project.image_url} 
                          alt={project.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <FolderOpen className="h-8 w-8 text-primary" />
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-1">{project.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">{project.project_type}</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Listings:</span>
                          <span className="font-semibold">{projectListings.length}</span>
                        </div>
                        {project.total_area_m2 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Area:</span>
                            <span className="font-semibold">{project.total_area_m2.toLocaleString()} m²</span>
                          </div>
                        )}
                      </div>
                      <Link to={`/projects/${project.id}`}>
                        <Button className="w-full">View Project</Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Individual Listings Grid */}
          {view === 'individual' && (
            <>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                    <Card key={i} className="overflow-hidden rounded-2xl animate-pulse">
                      <div className="aspect-video bg-muted" />
                      <CardContent className="p-4 space-y-3">
                        <div className="h-6 bg-muted rounded" />
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
                  <div className="text-center max-w-md">
                    <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2">{t('listing.noProperties')}</h3>
                    <p className="text-muted-foreground mb-6">{t('listing.tryAdjustingFilters')}</p>
                    <Button onClick={clearAllFilters} variant="outline" className="gap-2">
                      <X className="h-4 w-4" />
                      {t('listing.clearAllFilters')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {listings.map((listing) => (
                    <Card key={listing.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 h-full rounded-2xl border-border/50 hover:border-primary/20">
                      <div className="relative">
                        {/* Satellite Map */}
                        <Link to={`/listings/${listing.id}`}>
                          <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                            {(listing as any).polygon?.geojson ? (
                              <PropertyMapThumbnail 
                                geojson={(listing as any).polygon.geojson}
                                className="w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="h-16 w-16 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                        
                        {/* Badges Overlay */}
                        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-1.5">
                            <Badge variant="secondary" className="capitalize text-xs shadow-lg backdrop-blur-sm bg-background/90">
                              {t(`listingTypes.${listing.listing_type}`)}
                            </Badge>
                          </div>
                          {listing.verification_status === 'verified' && (
                            <Badge className="bg-success/90 text-success-foreground shadow-lg backdrop-blur-sm">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t('verificationStatus.verified')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardContent className="p-4 space-y-3">
                        <Link to={`/listings/${listing.id}`}>
                          <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {listing.title}
                          </h3>
                        </Link>
                        
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0 text-primary/60" />
                          <span className="line-clamp-1">{listing.location_label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize text-xs">
                            {t(`propertyTypes.${listing.property_type}`)}
                          </Badge>
                        </div>

                        <div className="pt-2 border-t border-border/50">
                          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
                            {listing.price 
                              ? `${listing.price.toLocaleString()} ${listing.currency}` 
                              : (listing as any).valuation?.[0]?.estimated_value
                                ? `~${(listing as any).valuation[0].estimated_value.toLocaleString()} ${(listing as any).valuation[0].estimation_currency}`
                                : t('listing.priceOnRequest')
                            }
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link to={`/listings/${listing.id}`} className="flex-1">
                            <Button size="sm" className="w-full gap-2 shadow-md hover:shadow-lg transition-all">
                              <Eye className="h-4 w-4" />
                              {t('listing.viewDetails')}
                            </Button>
                          </Link>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
                            onClick={(e) => handleShareListing(listing, e)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Link to={`/map?listing=${listing.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all">
                              <Map className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && !loading && (
                <div className="mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {renderPaginationItems()}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      {shareListingData && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          url={`${window.location.origin}/listings/${shareListingData.id}`}
          title={shareListingData.title}
          description={`${shareListingData.title} - ${shareListingData.location}`}
          price={shareListingData.price}
          currency={shareListingData.currency}
          location={shareListingData.location}
          area={shareListingData.area}
          geojson={shareListingData.geojson}
        />
      )}
    </MainLayout>
  );
}
