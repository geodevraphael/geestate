import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, CheckCircle2, X, Map, Eye, TrendingUp, Filter, Share2 } from 'lucide-react';
import { ListingWithDetails } from '@/types/database';
import { PropertyMapThumbnail } from '@/components/PropertyMapThumbnail';
import { toast } from 'sonner';

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ownerParam = searchParams.get('owner');
  
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [ownerInfo, setOwnerInfo] = useState<{ name: string; type: 'seller' | 'institution' } | null>(null);

  useEffect(() => {
    fetchListings();
  }, [ownerParam]);

  const fetchListings = async () => {
    try {
      let query = (supabase as any)
        .from('listings')
        .select(`
          *,
          owner:profiles(full_name, organization_name, role),
          media:listing_media(*),
          polygon:listing_polygons(geojson)
        `)
        .eq('status', 'published');

      // Filter by owner if parameter is present
      if (ownerParam) {
        query = query.eq('owner_id', ownerParam);
        
        // Fetch owner information
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
          // Check if it's an institution
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
      } else {
        setOwnerInfo(null);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.location_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.region?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesListingType = listingTypeFilter === 'all' || listing.listing_type === listingTypeFilter;
    const matchesPropertyType = propertyTypeFilter === 'all' || listing.property_type === propertyTypeFilter;
    const matchesVerification = verificationFilter === 'all' || listing.verification_status === verificationFilter;

    return matchesSearch && matchesListingType && matchesPropertyType && matchesVerification;
  });

  const clearOwnerFilter = () => {
    searchParams.delete('owner');
    setSearchParams(searchParams);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setListingTypeFilter('all');
    setPropertyTypeFilter('all');
    setVerificationFilter('all');
    clearOwnerFilter();
  };

  const handleShareListing = (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const listingUrl = `${window.location.origin}/listings/${listingId}`;
    navigator.clipboard.writeText(listingUrl);
    toast.success('Listing link copied to clipboard!');
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
                  {ownerInfo ? `${ownerInfo.name}'s Listings` : 'Property Marketplace'}
                </h1>
                <p className="text-sm md:text-lg text-muted-foreground">
                  {ownerInfo 
                    ? `Viewing all listings from ${ownerInfo.name}`
                    : 'Discover verified land and properties across Tanzania'
                  }
                </p>
              </div>
              {!ownerInfo && (
              <Link to="/map">
                <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all">
                  <Map className="h-5 w-5" />
                  Browse on Map
                </Button>
              </Link>
              )}
            </div>

            {/* Owner Filter Badge */}
            {ownerInfo && (
              <div className="mb-4">
                <Badge variant="secondary" className="text-sm py-2 px-4 gap-2 shadow-sm">
                  <Filter className="h-3.5 w-3.5" />
                  Filtered by: {ownerInfo.name}
                  <button 
                    onClick={clearOwnerFilter}
                    className="ml-1 hover:bg-background/50 rounded-full p-0.5 transition-colors"
                    aria-label="Clear owner filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}

            {/* Filters */}
            <Card className="shadow-lg border-border/50 rounded-2xl overflow-hidden backdrop-blur-sm bg-background/95">
              <CardContent className="pt-6 px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by location or title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>

                  <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Listing Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="sale">For Sale</SelectItem>
                      <SelectItem value="rent">For Rent</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Property Type" />
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

                  <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Verification Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="unverified">Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        <div className="w-full px-4 md:px-8 lg:px-12 py-6 md:py-8">
          {/* Results Count */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="text-lg font-medium">
                {loading ? 'Loading...' : `${filteredListings.length} Properties Available`}
              </p>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredListings.map((listing) => (
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
                        {listing.listing_type}
                      </Badge>
                    </div>
                    {listing.verification_status === 'verified' && (
                      <Badge className="bg-success/90 text-success-foreground shadow-lg backdrop-blur-sm">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
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
                      {listing.property_type}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
                      {listing.price ? `${listing.price.toLocaleString()} ${listing.currency}` : 'Market Valuation Estimate'}
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/listings/${listing.id}`} className="flex-1">
                        <Button size="sm" className="w-full gap-2 shadow-md hover:shadow-lg transition-all">
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
                        onClick={(e) => handleShareListing(listing.id, e)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Link to={`/map?listing=${listing.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all">
                          <Map className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredListings.length === 0 && !loading && (
            <Card className="text-center py-16 rounded-2xl border-dashed">
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                    <Search className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No Properties Found</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {ownerInfo 
                        ? `${ownerInfo.name} has no listings matching your criteria`
                        : 'No listings found matching your criteria. Try adjusting your filters.'
                      }
                    </p>
                    <Button onClick={clearAllFilters} className="gap-2">
                      <X className="h-4 w-4" />
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
