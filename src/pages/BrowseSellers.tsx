import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, User, Briefcase, MapPin, Phone, Mail, 
  Search, ExternalLink, FileText, Award, TrendingUp, CheckCircle2, Star, Filter, MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReputationScore {
  communication_score: number;
  reliability_score: number;
  honesty_score: number;
  total_score: number;
  deals_closed_count: number;
}

interface Seller {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  organization_name: string | null;
  address: string | null;
  role: string;
  listingsCount: number;
  reputation?: ReputationScore;
}

interface Institution {
  id: string;
  institution_name: string;
  institution_type: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string | null;
  logo_url: string | null;
  about_company: string | null;
  slug: string;
  profile_id: string;
  service_areas: string[] | null;
  certifications: string[] | null;
  listingsCount: number;
  reputation?: ReputationScore;
}

export default function BrowseSellers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [brokers, setBrokers] = useState<Seller[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'listings'>('name');

  const handleMessage = (userId: string) => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/messages?user=${userId}` } });
      return;
    }
    navigate(`/messages?user=${userId}`);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch sellers by querying user_roles
      const { data: sellerRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'seller');

      // Fetch brokers by querying user_roles
      const { data: brokerRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'broker');

      // Get profiles for sellers
      if (sellerRoles && sellerRoles.length > 0) {
        const sellerIds = sellerRoles.map(r => r.user_id);
        const { data: sellerProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', sellerIds);

        if (sellerProfiles) {
          const sellersWithCounts = await Promise.all(
            sellerProfiles.map(async (seller) => {
              const { count } = await supabase
                .from('listings')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', seller.id)
                .eq('status', 'published');
              
              const { data: reputation } = await supabase
                .from('reputation_scores')
                .select('*')
                .eq('user_id', seller.id)
                .single();
              
              return { ...seller, listingsCount: count || 0, role: 'seller', reputation: reputation || undefined };
            })
          );
          setSellers(sellersWithCounts);
        }
      }

      // Get profiles for brokers
      if (brokerRoles && brokerRoles.length > 0) {
        const brokerIds = brokerRoles.map(r => r.user_id);
        const { data: brokerProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', brokerIds);

        if (brokerProfiles) {
          const brokersWithCounts = await Promise.all(
            brokerProfiles.map(async (broker) => {
              const { count } = await supabase
                .from('listings')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', broker.id)
                .eq('status', 'published');
              
              const { data: reputation } = await supabase
                .from('reputation_scores')
                .select('*')
                .eq('user_id', broker.id)
                .single();
              
              return { ...broker, listingsCount: count || 0, role: 'broker', reputation: reputation || undefined };
            })
          );
          setBrokers(brokersWithCounts);
        }
      }

      // Fetch institutions
      const { data: institutionsData } = await supabase
        .from('institutional_sellers')
        .select('*')
        .eq('is_approved', true);

      // Get listing counts for institutions
      if (institutionsData) {
        const institutionsWithCounts = await Promise.all(
          institutionsData.map(async (inst) => {
            const { count } = await supabase
              .from('listings')
              .select('*', { count: 'exact', head: true })
              .eq('owner_id', inst.profile_id)
              .eq('status', 'published');
            
            const { data: reputation } = await supabase
              .from('reputation_scores')
              .select('*')
              .eq('user_id', inst.profile_id)
              .single();
            
            return { ...inst, listingsCount: count || 0, reputation: reputation || undefined };
          })
        );
        setInstitutions(institutionsWithCounts);
      }
    } catch (error) {
      console.error('Error fetching sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBySearch = <T extends { full_name?: string; institution_name?: string }>(items: T[]) => {
    if (!searchQuery) return items;
    return items.filter(item => {
      const name = 'full_name' in item ? item.full_name : item.institution_name;
      return name?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const sortItems = <T extends { full_name?: string; institution_name?: string; listingsCount: number }>(items: T[]) => {
    const sorted = [...items];
    if (sortBy === 'name') {
      sorted.sort((a, b) => {
        const nameA = ('full_name' in a ? a.full_name : a.institution_name) || '';
        const nameB = ('full_name' in b ? b.full_name : b.institution_name) || '';
        return nameA.localeCompare(nameB);
      });
    } else {
      sorted.sort((a, b) => b.listingsCount - a.listingsCount);
    }
    return sorted;
  };

  const calculateRating = (reputation?: ReputationScore): number => {
    if (!reputation) return 0;
    const avg = (reputation.communication_score + reputation.reliability_score + reputation.honesty_score) / 3;
    return Math.round((avg / 100) * 5 * 2) / 2; // Convert to 0-5 scale with 0.5 increments
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= Math.floor(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : star - 0.5 === rating
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  const SellerCard = ({ seller }: { seller: Seller }) => {
    const rating = calculateRating(seller.reputation);
    const reviewCount = seller.reputation?.deals_closed_count || 0;
    
    return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 ring-2 ring-background shadow-lg">
              <AvatarImage src={seller.profile_photo_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {seller.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {seller.listingsCount > 5 && (
              <div className="absolute -top-1 -right-1 bg-success text-white rounded-full p-1">
                <Star className="h-3 w-3 fill-current" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-1 flex items-center gap-2 flex-wrap">
              <span className="line-clamp-1">{seller.full_name}</span>
              <Badge variant={seller.role === 'broker' ? 'default' : 'secondary'} className="text-xs">
                {seller.role === 'seller' ? 'Seller' : 'Broker'}
              </Badge>
            </CardTitle>
            {seller.organization_name && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{seller.organization_name}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {seller.listingsCount} {seller.listingsCount === 1 ? 'Listing' : 'Listings'}
              </Badge>
              {seller.listingsCount > 10 && (
                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Top Seller
                </Badge>
              )}
            </div>
            {rating > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {renderStars(rating)}
                <span className="text-xs text-muted-foreground">
                  {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 relative">
        {seller.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{seller.bio}</p>
        )}
        <div className="space-y-2 text-sm">
          {seller.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0 text-primary/60" />
              <span className="line-clamp-1">{seller.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0 text-primary/60" />
            <a href={`mailto:${seller.email}`} className="line-clamp-1 hover:text-primary transition-colors">
              {seller.email}
            </a>
          </div>
          {seller.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0 text-primary/60" />
              <a href={`tel:${seller.phone}`} className="hover:text-primary transition-colors">
                {seller.phone}
              </a>
            </div>
          )}
        </div>
        <div className="pt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <Link to={`/profile/${seller.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full group-hover:border-primary/50 transition-colors">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </Link>
            <Link to={`/listings?owner=${seller.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Listings
              </Button>
            </Link>
          </div>
          <Button 
            size="sm" 
            className="w-full gap-2"
            onClick={() => handleMessage(seller.id)}
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

  const InstitutionCard = ({ institution }: { institution: Institution }) => {
    const rating = calculateRating(institution.reputation);
    const reviewCount = institution.reputation?.deals_closed_count || 0;
    
    return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-start gap-4">
          {institution.logo_url ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-background shadow-lg flex-shrink-0 ring-2 ring-border/50">
              <img 
                src={institution.logo_url} 
                alt={institution.institution_name}
                className="w-full h-full object-cover"
              />
              {institution.listingsCount > 5 && (
                <div className="absolute -top-1 -right-1 bg-success text-white rounded-full p-1">
                  <CheckCircle2 className="h-3 w-3 fill-current" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted flex items-center justify-center flex-shrink-0">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
              {institution.institution_name}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Badge variant="default" className="text-xs">
                {institution.institution_type.charAt(0).toUpperCase() + institution.institution_type.slice(1)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {institution.listingsCount} {institution.listingsCount === 1 ? 'Listing' : 'Listings'}
              </Badge>
            </div>
            {rating > 0 && (
              <div className="flex items-center gap-2">
                {renderStars(rating)}
                <span className="text-xs text-muted-foreground">
                  {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 relative">
        {institution.about_company && (
          <p className="text-sm text-muted-foreground line-clamp-3">{institution.about_company}</p>
        )}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 flex-shrink-0 text-primary/60" />
            <span className="line-clamp-1">{institution.contact_person}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0 text-primary/60" />
            <a href={`mailto:${institution.contact_email}`} className="line-clamp-1 hover:text-primary transition-colors">
              {institution.contact_email}
            </a>
          </div>
          {institution.contact_phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0 text-primary/60" />
              <a href={`tel:${institution.contact_phone}`} className="hover:text-primary transition-colors">
                {institution.contact_phone}
              </a>
            </div>
          )}
        </div>
        {institution.service_areas && institution.service_areas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {institution.service_areas.slice(0, 3).map((area, idx) => (
              <Badge key={idx} variant="outline" className="text-xs bg-primary/5">
                <MapPin className="h-3 w-3 mr-1" />
                {area}
              </Badge>
            ))}
            {institution.service_areas.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{institution.service_areas.length - 3}
              </Badge>
            )}
          </div>
        )}
        {institution.certifications && institution.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {institution.certifications.slice(0, 2).map((cert, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                <Award className="h-3 w-3 mr-1" />
                {cert}
              </Badge>
            ))}
          </div>
        )}
        <div className="pt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <Link to={`/institution/${institution.slug}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full group-hover:border-primary/50 transition-colors">
                <Building2 className="h-4 w-4 mr-2" />
                Page
              </Button>
            </Link>
            <Link to={`/listings?owner=${institution.profile_id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Listings
              </Button>
            </Link>
          </div>
          <Button 
            size="sm" 
            className="w-full gap-2"
            onClick={() => handleMessage(institution.profile_id)}
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted animate-pulse rounded" />
              <div className="h-4 w-96 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-3/4 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const allSellers = [...sellers, ...brokers];
  const filteredSellers = sortItems(filterBySearch(sellers));
  const filteredBrokers = sortItems(filterBySearch(brokers));
  const filteredInstitutions = sortItems(filterBySearch(institutions));
  const filteredAll = sortItems([...filterBySearch(allSellers), ...filteredInstitutions]);
  
  const totalListings = [...sellers, ...brokers, ...institutions].reduce((sum, item) => sum + item.listingsCount, 0);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Browse Sellers & Institutions
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
            Connect with trusted property sellers, experienced brokers, and verified institutional sellers across Tanzania
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl md:text-3xl font-bold">{sellers.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Sellers</p>
                </div>
                <User className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl md:text-3xl font-bold">{brokers.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Brokers</p>
                </div>
                <Briefcase className="h-8 w-8 text-blue-500/60" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl md:text-3xl font-bold">{institutions.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Institutions</p>
                </div>
                <Building2 className="h-8 w-8 text-purple-500/60" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl md:text-3xl font-bold">{totalListings}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Listings</p>
                </div>
                <FileText className="h-8 w-8 text-success/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: 'name' | 'listings') => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="listings">Sort by Listings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({allSellers.length + institutions.length})
            </TabsTrigger>
            <TabsTrigger value="sellers">
              <User className="h-4 w-4 mr-2 hidden sm:inline" />
              Sellers ({sellers.length})
            </TabsTrigger>
            <TabsTrigger value="brokers">
              <Briefcase className="h-4 w-4 mr-2 hidden sm:inline" />
              Brokers ({brokers.length})
            </TabsTrigger>
            <TabsTrigger value="institutions">
              <Building2 className="h-4 w-4 mr-2 hidden sm:inline" />
              Institutions ({institutions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {filteredAll.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-10 w-10 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-1">No sellers found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
                  </div>
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredSellers.map((seller) => (
                  <SellerCard key={seller.id} seller={seller} />
                ))}
                {filteredBrokers.map((broker) => (
                  <SellerCard key={broker.id} seller={broker} />
                ))}
                {filteredInstitutions.map((institution) => (
                  <InstitutionCard key={institution.id} institution={institution} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sellers" className="mt-6">
            {filteredSellers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-1">No individual sellers found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or check other tabs</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredSellers.map((seller) => (
                  <SellerCard key={seller.id} seller={seller} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="brokers" className="mt-6">
            {filteredBrokers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                      <Briefcase className="h-10 w-10 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-1">No brokers found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or check other tabs</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredBrokers.map((broker) => (
                  <SellerCard key={broker.id} seller={broker} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="institutions" className="mt-6">
            {filteredInstitutions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-1">No institutions found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or check other tabs</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredInstitutions.map((institution) => (
                  <InstitutionCard key={institution.id} institution={institution} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
