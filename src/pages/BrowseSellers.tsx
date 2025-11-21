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
  Search, ExternalLink, FileText, Award 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
}

export default function BrowseSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [brokers, setBrokers] = useState<Seller[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

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
              return { ...seller, listingsCount: count || 0, role: 'seller' };
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
              return { ...broker, listingsCount: count || 0, role: 'broker' };
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
            return { ...inst, listingsCount: count || 0 };
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

  const SellerCard = ({ seller }: { seller: Seller }) => (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={seller.profile_photo_url || ''} />
            <AvatarFallback>
              {seller.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg mb-1 flex items-center gap-2">
              {seller.full_name}
              <Badge variant="secondary" className="text-xs">
                {seller.role === 'seller' ? 'Individual Seller' : 'Broker'}
              </Badge>
            </CardTitle>
            {seller.organization_name && (
              <p className="text-sm text-muted-foreground mb-2">{seller.organization_name}</p>
            )}
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {seller.listingsCount} Listing{seller.listingsCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {seller.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{seller.bio}</p>
        )}
        <div className="space-y-2 text-sm">
          {seller.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{seller.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{seller.email}</span>
          </div>
          {seller.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{seller.phone}</span>
            </div>
          )}
        </div>
        <div className="pt-2 flex gap-2">
          <Link to={`/profile/${seller.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <User className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </Link>
          <Link to={`/listings?owner=${seller.id}`} className="flex-1">
            <Button size="sm" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View Listings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  const InstitutionCard = ({ institution }: { institution: Institution }) => (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start gap-4">
          {institution.logo_url && (
            <div className="w-16 h-16 rounded-lg overflow-hidden border bg-background flex-shrink-0">
              <img 
                src={institution.logo_url} 
                alt={institution.institution_name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-1 line-clamp-2">{institution.institution_name}</CardTitle>
            <Badge variant="secondary" className="text-xs mb-2">
              {institution.institution_type.charAt(0).toUpperCase() + institution.institution_type.slice(1)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {institution.listingsCount} Listing{institution.listingsCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {institution.about_company && (
          <p className="text-sm text-muted-foreground line-clamp-3">{institution.about_company}</p>
        )}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 flex-shrink-0" />
            <span>{institution.contact_person}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{institution.contact_email}</span>
          </div>
          {institution.contact_phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{institution.contact_phone}</span>
            </div>
          )}
        </div>
        {institution.service_areas && institution.service_areas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {institution.service_areas.slice(0, 3).map((area, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {area}
              </Badge>
            ))}
            {institution.service_areas.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{institution.service_areas.length - 3} more
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
        <div className="pt-2 flex gap-2">
          <Link to={`/institution/${institution.slug}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Building2 className="h-4 w-4 mr-2" />
              View Page
            </Button>
          </Link>
          <Link to={`/listings?owner=${institution.profile_id}`} className="flex-1">
            <Button size="sm" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View Listings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  const allSellers = [...sellers, ...brokers];
  const filteredSellers = filterBySearch(sellers);
  const filteredBrokers = filterBySearch(brokers);
  const filteredInstitutions = filterBySearch(institutions);
  const filteredAll = [...filterBySearch(allSellers), ...filteredInstitutions];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">Browse Sellers & Institutions</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Discover trusted property sellers, brokers, and institutional sellers
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No sellers or institutions found</p>
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
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No individual sellers found</p>
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
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No brokers found</p>
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
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No institutions found</p>
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
