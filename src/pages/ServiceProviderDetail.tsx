import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Scale, Building2, Hammer, Package, MapPin, Ruler, 
  Pencil, Star, CheckCircle2, Phone, Mail, Globe,
  ArrowLeft, Send, Clock, Briefcase, Calendar
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

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer: { full_name: string } | null;
}

const PROVIDER_TYPES: Record<string, { label: string; labelSw: string; icon: any }> = {
  lawyer: { label: 'Lawyer', labelSw: 'Mwanasheria', icon: Scale },
  land_valuer: { label: 'Land Valuer', labelSw: 'Mthamini Ardhi', icon: Ruler },
  construction_company: { label: 'Construction Company', labelSw: 'Kampuni ya Ujenzi', icon: Building2 },
  building_materials: { label: 'Building Materials', labelSw: 'Vifaa vya Ujenzi', icon: Package },
  surveyor: { label: 'Surveyor', labelSw: 'Mpima Ardhi', icon: MapPin },
  architect: { label: 'Architect', labelSw: 'Mhandisi wa Majengo', icon: Pencil },
  contractor: { label: 'Contractor', labelSw: 'Mkandarasi', icon: Hammer },
};

export default function ServiceProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    service_type: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchProvider();
      fetchReviews();
    }
  }, [id]);

  const fetchProvider = async () => {
    try {
      const { data, error } = await supabase
        .from('service_provider_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProvider(data);
    } catch (error) {
      console.error('Error fetching provider:', error);
      toast({
        title: 'Error',
        description: 'Provider not found',
        variant: 'destructive',
      });
      navigate('/service-providers');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('service_provider_reviews')
        .select('id, rating, review_text, created_at')
        .eq('provider_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReviews((data || []).map(r => ({ ...r, reviewer: null })) as Review[]);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmitRequest = async () => {
    if (!user) {
      navigate('/auth', { state: { returnTo: `/service-providers/${id}` } });
      return;
    }

    if (!requestForm.service_type) {
      toast({
        title: 'Error',
        description: 'Please select a service type',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create a general service request (not linked to a specific listing)
      const { error } = await supabase.from('service_requests').insert({
        listing_id: '00000000-0000-0000-0000-000000000000', // Placeholder for general requests
        requester_id: user.id,
        service_provider_id: provider?.user_id,
        service_type: requestForm.service_type,
        service_category: 'external_provider',
        status: 'pending',
        request_notes: requestForm.notes,
      });

      if (error) throw error;

      // Notify the provider
      if (provider?.user_id) {
        await supabase.from('notifications').insert({
          user_id: provider.user_id,
          type: 'new_message' as const,
          title: i18n.language === 'sw' ? 'Ombi Jipya la Huduma' : 'New Service Request',
          message: `You have a new ${requestForm.service_type} request`,
          link_url: '/dashboard',
        });
      }

      toast({
        title: i18n.language === 'sw' ? 'Ombi Limetumwa' : 'Request Sent',
        description: i18n.language === 'sw' 
          ? 'Mtoa huduma atawasiliana nawe hivi karibuni'
          : 'The provider will contact you soon',
      });
      
      setRequestOpen(false);
      setRequestForm({ service_type: '', notes: '' });
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!provider) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Provider Not Found</h1>
          <Button onClick={() => navigate('/service-providers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Providers
          </Button>
        </div>
      </MainLayout>
    );
  }

  const typeInfo = PROVIDER_TYPES[provider.provider_type] || { 
    label: provider.provider_type, 
    labelSw: provider.provider_type,
    icon: Building2 
  };
  const Icon = typeInfo.icon;

  return (
    <MainLayout>
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/service-providers')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {i18n.language === 'sw' ? 'Rudi' : 'Back'}
        </Button>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 md:p-10 text-primary-foreground">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10">
            {/* Provider Icon/Logo */}
            <div className="flex-shrink-0">
              {provider.logo_url ? (
                <img 
                  src={provider.logo_url} 
                  alt={provider.company_name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-white/20 shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <Icon className="h-12 w-12 md:h-16 md:w-16 text-primary-foreground/80" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold">{provider.company_name}</h1>
                  {provider.is_verified && (
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <p className="text-lg md:text-xl text-white/90 font-medium">
                  {i18n.language === 'sw' ? typeInfo.labelSw : typeInfo.label}
                </p>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                    <span className="text-2xl font-bold text-white">{provider.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-white/90">({provider.total_reviews} {i18n.language === 'sw' ? 'maoni' : 'reviews'})</span>
                </div>
                {provider.completed_projects > 0 && (
                  <div className="flex items-center gap-2 text-white/90">
                    <Briefcase className="h-5 w-5" />
                    <span className="font-medium">{provider.completed_projects} {i18n.language === 'sw' ? 'miradi' : 'projects completed'}</span>
                  </div>
                )}
                {provider.years_in_business && (
                  <div className="flex items-center gap-2 text-white/90">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">{provider.years_in_business} {i18n.language === 'sw' ? 'miaka kazini' : 'years in business'}</span>
                  </div>
                )}
              </div>

              {/* Contact Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                {provider.contact_phone && (
                  <a href={`tel:${provider.contact_phone}`}>
                    <Button variant="secondary" size="lg" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20">
                      <Phone className="h-4 w-4" />
                      {provider.contact_phone}
                    </Button>
                  </a>
                )}
                <a href={`mailto:${provider.contact_email}`}>
                  <Button variant="secondary" size="lg" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20">
                    <Mail className="h-4 w-4" />
                    {i18n.language === 'sw' ? 'Barua Pepe' : 'Email'}
                  </Button>
                </a>
                {provider.website_url && (
                  <a href={provider.website_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="lg" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20">
                      <Globe className="h-4 w-4" />
                      {i18n.language === 'sw' ? 'Tovuti' : 'Website'}
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <div className="lg:flex-shrink-0">
              <ResponsiveModal
                open={requestOpen}
                onOpenChange={setRequestOpen}
                title={i18n.language === 'sw' ? 'Omba Huduma' : 'Request Service'}
                description={i18n.language === 'sw' 
                  ? 'Tuma ombi lako kwa mtoa huduma huyu'
                  : 'Send your service request to this provider'}
                trigger={
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full lg:w-auto bg-white text-primary hover:bg-white/90 shadow-lg">
                      <Send className="mr-2 h-5 w-5" />
                      {i18n.language === 'sw' ? 'Omba Huduma' : 'Request Service'}
                    </Button>
                  </DialogTrigger>
                }
              >
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>{i18n.language === 'sw' ? 'Aina ya Huduma' : 'Service Type'}</Label>
                    <Select 
                      value={requestForm.service_type} 
                      onValueChange={(v) => setRequestForm({ ...requestForm, service_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={i18n.language === 'sw' ? 'Chagua huduma' : 'Select service'} />
                      </SelectTrigger>
                      <SelectContent>
                        {provider.services_offered.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                        <SelectItem value="other">{i18n.language === 'sw' ? 'Nyingine' : 'Other'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{i18n.language === 'sw' ? 'Maelezo ya Ombi' : 'Request Details'}</Label>
                    <Textarea
                      value={requestForm.notes}
                      onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                      placeholder={i18n.language === 'sw' 
                        ? 'Eleza mahitaji yako...'
                        : 'Describe your requirements...'}
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={handleSubmitRequest} 
                    disabled={submitting || !requestForm.service_type}
                    className="w-full"
                  >
                    {submitting 
                      ? (i18n.language === 'sw' ? 'Inatuma...' : 'Sending...') 
                      : (i18n.language === 'sw' ? 'Tuma Ombi' : 'Send Request')}
                  </Button>
                </div>
              </ResponsiveModal>
            </div>
          </div>
        </div>

        {/* Details Grid - Full Width */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - About & Description */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {i18n.language === 'sw' ? 'Kuhusu Sisi' : 'About Us'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {provider.description ? (
                  <p className="text-muted-foreground leading-relaxed text-lg">{provider.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    {i18n.language === 'sw' ? 'Hakuna maelezo' : 'No description provided'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Services Offered */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  {i18n.language === 'sw' ? 'Huduma Tunazotoa' : 'Services We Offer'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {provider.services_offered.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {provider.services_offered.map((service, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{service}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">
                    {i18n.language === 'sw' ? 'Hakuna huduma zilizoorodheshwa' : 'No services listed'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  {i18n.language === 'sw' ? 'Maoni ya Wateja' : 'Customer Reviews'}
                </CardTitle>
                <CardDescription>
                  {provider.total_reviews} {i18n.language === 'sw' ? 'maoni jumla' : 'total reviews'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className="p-4 rounded-xl bg-muted border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {review.reviewer?.full_name?.charAt(0) || 'A'}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">{review.reviewer?.full_name || 'Anonymous'}</span>
                          </div>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        {review.review_text && (
                          <p className="text-foreground/80">{review.review_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">
                      {i18n.language === 'sw' ? 'Hakuna maoni bado' : 'No reviews yet'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats Card */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">{i18n.language === 'sw' ? 'Takwimu' : 'Quick Stats'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                  <span className="text-muted-foreground">{i18n.language === 'sw' ? 'Ukadiriaji' : 'Rating'}</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-foreground">{provider.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                  <span className="text-muted-foreground">{i18n.language === 'sw' ? 'Maoni' : 'Reviews'}</span>
                  <span className="font-bold text-foreground">{provider.total_reviews}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                  <span className="text-muted-foreground">{i18n.language === 'sw' ? 'Miradi' : 'Projects'}</span>
                  <span className="font-bold text-foreground">{provider.completed_projects}</span>
                </div>
                {provider.years_in_business && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                    <span className="text-muted-foreground">{i18n.language === 'sw' ? 'Miaka' : 'Years'}</span>
                    <span className="font-bold text-foreground">{provider.years_in_business}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Areas */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {i18n.language === 'sw' ? 'Maeneo ya Huduma' : 'Service Areas'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {provider.service_areas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {provider.service_areas.map((area, idx) => (
                      <Badge key={idx} variant="outline" className="px-3 py-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {area}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-sm">
                    {i18n.language === 'sw' ? 'Hakuna maeneo yaliyoorodheshwa' : 'No areas listed'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">{i18n.language === 'sw' ? 'Wasiliana Nasi' : 'Contact Us'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a href={`mailto:${provider.contact_email}`} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:bg-muted transition-colors">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="text-sm truncate text-foreground">{provider.contact_email}</span>
                </a>
                {provider.contact_phone && (
                  <a href={`tel:${provider.contact_phone}`} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:bg-muted transition-colors">
                    <Phone className="h-5 w-5 text-primary" />
                    <span className="text-sm text-foreground">{provider.contact_phone}</span>
                  </a>
                )}
                {provider.website_url && (
                  <a href={provider.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:bg-muted transition-colors">
                    <Globe className="h-5 w-5 text-primary" />
                    <span className="text-sm truncate text-foreground">{provider.website_url}</span>
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}