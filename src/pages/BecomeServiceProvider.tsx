import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Scale, Building2, Hammer, Package, MapPin, Ruler, 
  Pencil, UserCheck, CheckCircle, ArrowRight, Briefcase
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PROVIDER_TYPES = [
  { value: 'lawyer', label: 'Lawyer / Mwanasheria', labelSw: 'Mwanasheria', icon: Scale },
  { value: 'land_valuer', label: 'Land Valuer / Mthamini Ardhi', labelSw: 'Mthamini Ardhi', icon: Ruler },
  { value: 'construction_company', label: 'Construction Company / Kampuni ya Ujenzi', labelSw: 'Kampuni ya Ujenzi', icon: Building2 },
  { value: 'building_materials', label: 'Building Materials / Vifaa vya Ujenzi', labelSw: 'Vifaa vya Ujenzi', icon: Package },
  { value: 'surveyor', label: 'Surveyor / Mpima Ardhi', labelSw: 'Mpima Ardhi', icon: MapPin },
  { value: 'architect', label: 'Architect / Mhandisi wa Majengo', labelSw: 'Mhandisi wa Majengo', icon: Pencil },
  { value: 'contractor', label: 'Contractor / Mkandarasi', labelSw: 'Mkandarasi', icon: Hammer },
];

const SERVICES_BY_TYPE: Record<string, string[]> = {
  lawyer: ['Land Contract Review', 'Title Deed Transfer', 'Property Disputes', 'Due Diligence', 'Legal Documentation'],
  land_valuer: ['Property Valuation', 'Land Survey', 'Market Analysis', 'Investment Appraisal', 'Insurance Valuation'],
  construction_company: ['Residential Construction', 'Commercial Construction', 'Renovations', 'Project Management', 'Design & Build'],
  building_materials: ['Cement & Concrete', 'Steel & Iron', 'Timber & Wood', 'Roofing Materials', 'Finishing Materials', 'Plumbing & Electrical'],
  surveyor: ['Land Survey', 'Boundary Marking', 'Topographic Survey', 'GPS Mapping', 'Cadastral Survey'],
  architect: ['Architectural Design', 'Interior Design', 'Building Plans', 'Project Supervision', '3D Visualization'],
  contractor: ['General Contracting', 'Subcontracting', 'Project Management', 'Site Supervision', 'Quality Control'],
};

const REGIONS = [
  'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Morogoro', 
  'Tanga', 'Kilimanjaro', 'Zanzibar', 'Iringa', 'Mara', 'Kagera', 'Nationwide'
];

export default function BecomeServiceProvider() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    provider_type: '',
    company_name: '',
    license_number: '',
    years_in_business: '',
    description: '',
    services_offered: [] as string[],
    service_areas: [] as string[],
    contact_phone: profile?.phone || '',
    contact_email: profile?.email || '',
    website_url: '',
  });

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service]
    }));
  };

  const handleAreaToggle = (area: string) => {
    setFormData(prev => ({
      ...prev,
      service_areas: prev.service_areas.includes(area)
        ? prev.service_areas.filter(a => a !== area)
        : [...prev.service_areas, area]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth', { state: { returnTo: '/become-service-provider' } });
      return;
    }

    if (!formData.provider_type || !formData.company_name || !formData.contact_email) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('service_provider_requests').insert({
        user_id: user.id,
        provider_type: formData.provider_type,
        company_name: formData.company_name,
        license_number: formData.license_number || null,
        years_in_business: formData.years_in_business ? parseInt(formData.years_in_business) : null,
        description: formData.description || null,
        services_offered: formData.services_offered,
        service_areas: formData.service_areas,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email,
        website_url: formData.website_url || null,
      });

      if (error) throw error;

      toast({
        title: i18n.language === 'sw' ? 'Ombi Limetumwa' : 'Application Submitted',
        description: i18n.language === 'sw' 
          ? 'Ombi lako litapitiwa na timu yetu. Tutawasiliana nawe hivi karibuni.'
          : 'Your application will be reviewed by our team. We\'ll contact you soon.',
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error submitting provider request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableServices = formData.provider_type ? SERVICES_BY_TYPE[formData.provider_type] || [] : [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full mb-4">
            <Briefcase className="h-4 w-4" />
            <span className="text-sm font-medium">
              {i18n.language === 'sw' ? 'Jiunge na Watoa Huduma' : 'Join Our Provider Network'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {i18n.language === 'sw' ? 'Kuwa Mtoa Huduma' : 'Become a Service Provider'}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {i18n.language === 'sw' 
              ? 'Jiunge na mtandao wetu wa wataalamu wa ardhi na ujenzi. Pata wateja wengi zaidi na ukuze biashara yako.'
              : 'Join our network of verified land and construction professionals. Reach more clients and grow your business.'}
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: CheckCircle, title: i18n.language === 'sw' ? 'Uthibitishaji' : 'Verified Badge', desc: i18n.language === 'sw' ? 'Pata beji ya uthibitishaji' : 'Get verified status' },
            { icon: UserCheck, title: i18n.language === 'sw' ? 'Wateja Wengi' : 'More Clients', desc: i18n.language === 'sw' ? 'Fikia wateja wengi zaidi' : 'Reach more customers' },
            { icon: Briefcase, title: i18n.language === 'sw' ? 'Ukuaji' : 'Growth', desc: i18n.language === 'sw' ? 'Kukuza biashara yako' : 'Grow your business' },
          ].map((benefit, idx) => (
            <Card key={idx} className="text-center p-4">
              <benefit.icon className="h-8 w-8 mx-auto text-primary mb-2" />
              <h3 className="font-semibold">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.desc}</p>
            </Card>
          ))}
        </div>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              {i18n.language === 'sw' ? 'Fomu ya Maombi' : 'Application Form'}
            </CardTitle>
            <CardDescription>
              {i18n.language === 'sw' 
                ? 'Jaza taarifa zako za biashara. Timu yetu itapitia ombi lako.'
                : 'Fill in your business details. Our team will review your application.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Provider Type */}
              <div className="space-y-2">
                <Label htmlFor="provider_type">{i18n.language === 'sw' ? 'Aina ya Huduma *' : 'Provider Type *'}</Label>
                <Select
                  value={formData.provider_type}
                  onValueChange={(value) => setFormData({ ...formData, provider_type: value, services_offered: [] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={i18n.language === 'sw' ? 'Chagua aina ya huduma' : 'Select provider type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map(type => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {i18n.language === 'sw' ? type.labelSw : type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company_name">{i18n.language === 'sw' ? 'Jina la Kampuni/Biashara *' : 'Company/Business Name *'}</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder={i18n.language === 'sw' ? 'Ingiza jina la kampuni' : 'Enter company name'}
                  required
                />
              </div>

              {/* License Number */}
              <div className="space-y-2">
                <Label htmlFor="license_number">{i18n.language === 'sw' ? 'Nambari ya Leseni (Hiari)' : 'License Number (Optional)'}</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  placeholder={i18n.language === 'sw' ? 'Nambari ya leseni ya kitaalamu' : 'Professional license number'}
                />
              </div>

              {/* Years in Business */}
              <div className="space-y-2">
                <Label htmlFor="years_in_business">{i18n.language === 'sw' ? 'Miaka ya Uzoefu' : 'Years in Business'}</Label>
                <Input
                  id="years_in_business"
                  type="number"
                  min="0"
                  value={formData.years_in_business}
                  onChange={(e) => setFormData({ ...formData, years_in_business: e.target.value })}
                  placeholder="0"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{i18n.language === 'sw' ? 'Maelezo ya Biashara' : 'Business Description'}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={i18n.language === 'sw' 
                    ? 'Eleza huduma zako na uzoefu wako...'
                    : 'Describe your services and experience...'}
                  rows={4}
                />
              </div>

              {/* Services Offered */}
              {availableServices.length > 0 && (
                <div className="space-y-3">
                  <Label>{i18n.language === 'sw' ? 'Huduma Unazotoa' : 'Services Offered'}</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableServices.map(service => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={service}
                          checked={formData.services_offered.includes(service)}
                          onCheckedChange={() => handleServiceToggle(service)}
                        />
                        <label htmlFor={service} className="text-sm cursor-pointer">{service}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Areas */}
              <div className="space-y-3">
                <Label>{i18n.language === 'sw' ? 'Maeneo ya Huduma' : 'Service Areas'}</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {REGIONS.map(region => (
                    <div key={region} className="flex items-center space-x-2">
                      <Checkbox
                        id={region}
                        checked={formData.service_areas.includes(region)}
                        onCheckedChange={() => handleAreaToggle(region)}
                      />
                      <label htmlFor={region} className="text-sm cursor-pointer">{region}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">{i18n.language === 'sw' ? 'Nambari ya Simu' : 'Phone Number'}</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+255..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">{i18n.language === 'sw' ? 'Barua Pepe *' : 'Email *'}</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website_url">{i18n.language === 'sw' ? 'Tovuti (Hiari)' : 'Website (Optional)'}</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1"
                >
                  {i18n.language === 'sw' ? 'Ghairi' : 'Cancel'}
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !formData.provider_type || !formData.company_name} 
                  className="flex-1"
                >
                  {loading 
                    ? (i18n.language === 'sw' ? 'Inatuma...' : 'Submitting...') 
                    : (i18n.language === 'sw' ? 'Tuma Ombi' : 'Submit Application')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}