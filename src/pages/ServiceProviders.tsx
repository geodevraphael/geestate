import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Scale, Building2, Hammer, Package, MapPin, Ruler, 
  Pencil, Star, CheckCircle2, Search, Phone, 
  ArrowRight, UserPlus, Briefcase, MessageCircle, CalendarDays
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ServiceProvider {
  id: string;
  user_id: string;
  provider_type: string;
  company_name: string;
  description: string | null;
  services_offered: string[];
  service_areas: string[];
  contact_phone: string | null;
  contact_email: string;
  website_url: string | null;
  logo_url: string | null;
  rating: number;
  total_reviews: number;
  completed_projects: number;
  is_verified: boolean;
  years_in_business: number | null;
  office_latitude: number | null;
  office_longitude: number | null;
  office_address: string | null;
  distance?: number; // calculated distance in km
}

const PROVIDER_TYPES = [
  { value: 'lawyer', label: 'Lawyer', labelSw: 'Mwanasheria', icon: Scale, color: 'from-violet-500 to-purple-600' },
  { value: 'land_valuer', label: 'Land Valuer', labelSw: 'Mthamini Ardhi', icon: Ruler, color: 'from-emerald-500 to-teal-600' },
  { value: 'construction_company', label: 'Construction', labelSw: 'Ujenzi', icon: Building2, color: 'from-orange-500 to-amber-600' },
  { value: 'building_materials', label: 'Materials', labelSw: 'Vifaa', icon: Package, color: 'from-sky-500 to-blue-600' },
  { value: 'surveyor', label: 'Surveyor', labelSw: 'Mpima Ardhi', icon: MapPin, color: 'from-rose-500 to-pink-600' },
  { value: 'architect', label: 'Architect', labelSw: 'Mhandisi', icon: Pencil, color: 'from-indigo-500 to-blue-600' },
  { value: 'contractor', label: 'Contractor', labelSw: 'Mkandarasi', icon: Hammer, color: 'from-amber-500 to-yellow-600' },
];

export default function ServiceProviders() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortByProximity, setSortByProximity] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('service_provider_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableLocationSearch = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setSortByProximity(true);
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationLoading(false);
        }
      );
    } else {
      setLocationLoading(false);
    }
  };

  const getProviderTypeInfo = (type: string) => {
    return PROVIDER_TYPES.find(t => t.value === type) || { 
      label: type, 
      labelSw: type,
      icon: Building2,
      color: 'from-gray-500 to-gray-600'
    };
  };

  const filteredProviders = providers
    .map(provider => {
      // Calculate distance if user location is available
      if (userLocation && provider.office_latitude && provider.office_longitude) {
        return {
          ...provider,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            provider.office_latitude,
            provider.office_longitude
          )
        };
      }
      return provider;
    })
    .filter(provider => {
      const matchesSearch = provider.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           provider.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           provider.services_offered.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === 'all' || provider.provider_type === selectedType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortByProximity && a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return b.rating - a.rating;
    });

  const handleRequestService = (providerId: string) => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/service-providers/${providerId}` } });
      return;
    }
    navigate(`/service-providers/${providerId}`);
  };

  const handleMessage = (userId: string) => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/messages?user=${userId}` } });
      return;
    }
    navigate(`/messages?user=${userId}`);
  };

  const totalProviders = providers.length;

  return (
    <MainLayout>
      <div className="w-full min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Mobile App-like Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b safe-area-top">
          <div className="px-4 py-3 md:py-4">
            <div className="flex items-center justify-between mb-3 md:mb-0">
              <div>
                <h1 className="text-xl md:text-3xl font-bold">
                  {i18n.language === 'sw' ? 'Watoa Huduma' : 'Service Providers'}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {totalProviders} {i18n.language === 'sw' ? 'walioidhinishwa' : 'verified'}
                </p>
              </div>
              <Link to="/become-service-provider">
                <Button size="sm" variant="outline" className="gap-1.5 rounded-full">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden md:inline">{i18n.language === 'sw' ? 'Jiunge' : 'Join'}</span>
                </Button>
              </Link>
            </div>
            
            {/* Search Bar - Fixed on mobile */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={i18n.language === 'sw' ? 'Tafuta...' : 'Search providers...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 md:h-11 rounded-full border-border/50 bg-muted/50 focus:bg-background"
              />
            </div>
          </div>
          
          {/* Location Button - Mobile style */}
          <div className="px-4 pb-3 flex gap-2">
            <Button
              variant={sortByProximity ? "default" : "secondary"}
              size="sm"
              onClick={() => {
                if (!userLocation) {
                  enableLocationSearch();
                } else {
                  setSortByProximity(!sortByProximity);
                }
              }}
              disabled={locationLoading}
              className="gap-1.5 rounded-full flex-shrink-0"
            >
              <MapPin className="h-3.5 w-3.5" />
              {locationLoading 
                ? '...' 
                : sortByProximity 
                  ? (i18n.language === 'sw' ? 'Karibu' : 'Near Me')
                  : (i18n.language === 'sw' ? 'Mahali' : 'Location')
              }
            </Button>
          </div>
        </div>

        <div className="px-4 md:px-6 lg:px-8 py-4 md:py-8">
          {/* Category Pills - Horizontal scroll on mobile */}
          <div className="mb-6">
            <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedType === 'all' 
                      ? 'bg-foreground text-background shadow-lg' 
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  {i18n.language === 'sw' ? 'Wote' : 'All'}
                  <Badge variant="secondary" className={`text-xs ${selectedType === 'all' ? 'bg-background/20 text-background' : ''}`}>
                    {totalProviders}
                  </Badge>
                </button>
                {PROVIDER_TYPES.map(type => {
                  const Icon = type.icon;
                  const count = providers.filter(p => p.provider_type === type.value).length;
                  const isSelected = selectedType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(isSelected ? 'all' : type.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        isSelected 
                          ? `bg-gradient-to-r ${type.color} text-white shadow-lg` 
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {i18n.language === 'sw' ? type.labelSw : type.label}
                      <Badge variant="secondary" className={`text-xs ${isSelected ? 'bg-white/20 text-white' : ''}`}>
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Provider List */}
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : filteredProviders.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border-dashed">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {i18n.language === 'sw' ? 'Hakuna Watoa Huduma' : 'No Providers Found'}
              </h3>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                {i18n.language === 'sw' 
                  ? 'Hakuna watoa huduma wanaofanana na utafutaji wako. Jaribu kutafuta tena au jiunge nasi.' 
                  : 'No providers match your search. Try adjusting your filters or become a provider yourself.'}
              </p>
              <Link to="/become-service-provider">
                <Button size="lg" className="rounded-full px-8">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {i18n.language === 'sw' ? 'Kuwa Mtoa Huduma' : 'Become a Provider'}
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProviders.map(provider => {
                const typeInfo = getProviderTypeInfo(provider.provider_type);
                const Icon = typeInfo.icon;
                
                return (
                  <Card 
                    key={provider.id} 
                    className="group overflow-hidden rounded-2xl border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Gradient Header */}
                    <div className={`h-2 bg-gradient-to-r ${typeInfo.color}`} />
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${typeInfo.color} text-white shadow-lg`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold truncate">
                              {provider.company_name}
                            </CardTitle>
                            {provider.is_verified && (
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                          <CardDescription className="mt-0.5 font-medium">
                            {i18n.language === 'sw' ? typeInfo.labelSw : typeInfo.label}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Rating & Stats */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            {provider.rating.toFixed(1)}
                          </span>
                          <span className="text-amber-600/70 dark:text-amber-500/70 text-sm">
                            ({provider.total_reviews})
                          </span>
                        </div>
                        {provider.completed_projects > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {provider.completed_projects} {i18n.language === 'sw' ? 'miradi' : 'projects'}
                          </span>
                        )}
                      </div>

                      {/* Services */}
                      {provider.services_offered.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {provider.services_offered.slice(0, 3).map((service, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="text-xs font-normal bg-muted/50"
                            >
                              {service}
                            </Badge>
                          ))}
                          {provider.services_offered.length > 3 && (
                            <Badge variant="outline" className="text-xs font-normal">
                              +{provider.services_offered.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Contact & Location */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t">
                        {provider.distance !== undefined && (
                          <div className="flex items-center gap-1.5 text-primary font-medium">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{provider.distance.toFixed(1)} km</span>
                          </div>
                        )}
                        {provider.contact_phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            <span className="truncate">{provider.contact_phone}</span>
                          </div>
                        )}
                        {provider.service_areas.length > 0 && !provider.distance && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{provider.service_areas[0]}</span>
                          </div>
                        )}
                      </div>

                      {/* CTA Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleRequestService(provider.id)}
                          className="flex-1 rounded-xl h-11 font-semibold group-hover:shadow-md transition-all"
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {i18n.language === 'sw' ? 'Panga Miadi' : 'Book'}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleMessage(provider.user_id)}
                          className="rounded-xl h-11 px-4"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
