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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Scale, Building2, Hammer, Package, MapPin, Ruler, 
  Pencil, Star, CheckCircle2, Search, Phone, Mail, Globe,
  ArrowRight, UserPlus, Filter
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
}

const PROVIDER_TYPES = [
  { value: 'lawyer', label: 'Lawyer / Mwanasheria', labelSw: 'Mwanasheria', icon: Scale },
  { value: 'land_valuer', label: 'Land Valuer / Mthamini Ardhi', labelSw: 'Mthamini Ardhi', icon: Ruler },
  { value: 'construction_company', label: 'Construction Company / Kampuni ya Ujenzi', labelSw: 'Kampuni ya Ujenzi', icon: Building2 },
  { value: 'building_materials', label: 'Building Materials / Vifaa vya Ujenzi', labelSw: 'Vifaa vya Ujenzi', icon: Package },
  { value: 'surveyor', label: 'Surveyor / Mpima Ardhi', labelSw: 'Mpima Ardhi', icon: MapPin },
  { value: 'architect', label: 'Architect / Mhandisi wa Majengo', labelSw: 'Mhandisi wa Majengo', icon: Pencil },
  { value: 'contractor', label: 'Contractor / Mkandarasi', labelSw: 'Mkandarasi', icon: Hammer },
];

export default function ServiceProviders() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchProviders();
  }, []);

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

  const getProviderTypeInfo = (type: string) => {
    return PROVIDER_TYPES.find(t => t.value === type) || { 
      label: type, 
      labelSw: type,
      icon: Building2 
    };
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         provider.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         provider.services_offered.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'all' || provider.provider_type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleRequestService = (providerId: string) => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/service-providers/${providerId}` } });
      return;
    }
    navigate(`/service-providers/${providerId}`);
  };

  return (
    <MainLayout>
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
                {i18n.language === 'sw' ? 'Watoa Huduma' : 'Service Providers'}
              </h1>
              <p className="text-muted-foreground">
                {i18n.language === 'sw' 
                  ? 'Pata wataalamu wa ardhi na ujenzi walioidhinishwa' 
                  : 'Find verified land and construction professionals'}
              </p>
            </div>
            <Link to="/become-service-provider">
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                {i18n.language === 'sw' ? 'Jiunge kama Mtoa Huduma' : 'Become a Provider'}
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={i18n.language === 'sw' ? 'Tafuta watoa huduma...' : 'Search providers...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={i18n.language === 'sw' ? 'Aina yote' : 'All Types'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {i18n.language === 'sw' ? 'Aina Zote' : 'All Types'}
                </SelectItem>
                {PROVIDER_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {i18n.language === 'sw' ? type.labelSw : type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Provider Type Quick Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {PROVIDER_TYPES.map(type => {
            const Icon = type.icon;
            const count = providers.filter(p => p.provider_type === type.value).length;
            return (
              <button
                key={type.value}
                onClick={() => setSelectedType(selectedType === type.value ? 'all' : type.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  selectedType === type.value 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-card hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium text-center leading-tight">
                  {i18n.language === 'sw' ? type.labelSw : type.label.split('/')[0].trim()}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Provider List */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {i18n.language === 'sw' ? 'Hakuna watoa huduma walipatikana' : 'No Service Providers Found'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {i18n.language === 'sw' 
                ? 'Hakuna watoa huduma wanaofanana na utafutaji wako' 
                : 'No providers match your search criteria'}
            </p>
            <Link to="/become-service-provider">
              <Button>
                {i18n.language === 'sw' ? 'Kuwa Mtoa Huduma wa Kwanza' : 'Be the First Provider'}
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProviders.map(provider => {
              const typeInfo = getProviderTypeInfo(provider.provider_type);
              const Icon = typeInfo.icon;
              
              return (
                <Card key={provider.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg truncate">{provider.company_name}</CardTitle>
                          {provider.is_verified && (
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {i18n.language === 'sw' ? typeInfo.labelSw : typeInfo.label}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {provider.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {provider.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="font-medium">{provider.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({provider.total_reviews})</span>
                      </div>
                      {provider.completed_projects > 0 && (
                        <span className="text-muted-foreground">
                          {provider.completed_projects} {i18n.language === 'sw' ? 'miradi' : 'projects'}
                        </span>
                      )}
                    </div>

                    {/* Services */}
                    {provider.services_offered.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {provider.services_offered.slice(0, 3).map((service, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                        {provider.services_offered.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{provider.services_offered.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Contact Quick View */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                      {provider.contact_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{provider.contact_phone}</span>
                        </div>
                      )}
                      {provider.service_areas.length > 0 && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{provider.service_areas[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Button 
                      onClick={() => handleRequestService(provider.id)}
                      className="w-full group-hover:bg-primary/90"
                    >
                      {i18n.language === 'sw' ? 'Omba Huduma' : 'Request Service'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}