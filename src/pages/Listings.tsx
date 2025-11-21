import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, CheckCircle2, X } from 'lucide-react';
import { ListingWithDetails } from '@/types/database';

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
          media:listing_media(*)
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

  return (
    <MainLayout>
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {ownerInfo ? `${ownerInfo.name}'s Listings` : 'Browse Listings'}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {ownerInfo 
              ? `Viewing all listings from ${ownerInfo.name}`
              : 'Discover verified land and properties across Tanzania'
            }
          </p>
        </div>

        {/* Owner Filter Badge */}
        {ownerInfo && (
          <div className="mb-4">
            <Badge variant="secondary" className="text-sm py-2 px-3 gap-2">
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
        <Card className="mb-6 md:mb-8 rounded-xl md:rounded-2xl">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Listing Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="rent">For Rent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger>
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
                <SelectTrigger>
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

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : `${filteredListings.length} listing(s) found`}
          </p>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {filteredListings.map((listing) => (
            <Link key={listing.id} to={`/listings/${listing.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-full rounded-xl md:rounded-2xl active:scale-[0.98] md:active:scale-100">
                {/* Image */}
                <div className="aspect-video bg-muted relative">
                  {listing.media && listing.media.length > 0 ? (
                    <img
                      src={listing.media[0].file_url}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {listing.verification_status === 'verified' && (
                    <Badge className="absolute top-3 right-3 bg-success text-success-foreground">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <CardContent className="p-3 md:p-4">
                  <h3 className="font-semibold text-base md:text-lg mb-2 line-clamp-2 md:line-clamp-1">{listing.title}</h3>
                  
                  <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">
                    <MapPin className="h-3 md:h-4 w-3 md:w-4 flex-shrink-0" />
                    <span className="line-clamp-1">{listing.location_label}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3">
                    <Badge variant="outline" className="capitalize text-xs">
                      {listing.property_type}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-xs">
                      For {listing.listing_type}
                    </Badge>
                  </div>

                  <div className="text-lg md:text-2xl font-bold text-primary">
                    {listing.price ? `${listing.price.toLocaleString()} ${listing.currency}` : 'Price on request'}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredListings.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {ownerInfo 
                ? `${ownerInfo.name} has no listings matching your criteria`
                : 'No listings found matching your criteria'
              }
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
