import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings, Upload, Globe, Phone, Mail, Building, MapPin, Navigation } from 'lucide-react';

interface ProviderProfile {
  id: string;
  company_name: string;
  provider_type: string;
  description?: string;
  contact_phone?: string;
  contact_email: string;
  website_url?: string;
  logo_url?: string;
  service_areas?: string[];
  is_active?: boolean;
  is_verified: boolean;
  office_latitude?: number | null;
  office_longitude?: number | null;
  office_address?: string | null;
}

interface ProviderProfileSettingsProps {
  profile: ProviderProfile;
  onUpdate: () => void;
}

const PROVIDER_TYPES = [
  { value: 'lawyer', label: 'Lawyer / Mwanasheria' },
  { value: 'land_valuer', label: 'Land Valuer / Mthamini Ardhi' },
  { value: 'surveyor', label: 'Land Surveyor / Mpimaji Ardhi' },
  { value: 'construction', label: 'Construction Company / Kampuni za Ujenzi' },
  { value: 'materials', label: 'Building Materials Dealer / Wauza Vifaa vya Ujenzi' },
  { value: 'architect', label: 'Architect / Mbunifu' },
  { value: 'real_estate_agent', label: 'Real Estate Agent / Wakala wa Mali Isiyohamishika' },
  { value: 'other', label: 'Other' },
];

const REGIONS = [
  'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Morogoro',
  'Tanga', 'Kilimanjaro', 'Zanzibar', 'Pwani', 'Kagera', 'Iringa',
  'Kigoma', 'Mtwara', 'Ruvuma', 'Shinyanga', 'Singida', 'Tabora',
  'Mara', 'Rukwa', 'Geita', 'Katavi', 'Njombe', 'Simiyu', 'Songwe', 'Lindi'
];

export function ProviderProfileSettings({ profile, onUpdate }: ProviderProfileSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: profile.company_name || '',
    provider_type: profile.provider_type || '',
    description: profile.description || '',
    contact_phone: profile.contact_phone || '',
    contact_email: profile.contact_email || '',
    website_url: profile.website_url || '',
    service_areas: profile.service_areas || [],
    is_active: profile.is_active ?? true,
    office_latitude: profile.office_latitude || null,
    office_longitude: profile.office_longitude || null,
    office_address: profile.office_address || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('service_provider_profiles')
        .update({
          company_name: formData.company_name,
          provider_type: formData.provider_type,
          description: formData.description,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          website_url: formData.website_url,
          service_areas: formData.service_areas,
          is_active: formData.is_active,
          office_latitude: formData.office_latitude,
          office_longitude: formData.office_longitude,
          office_address: formData.office_address,
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaToggle = (area: string) => {
    setFormData(prev => ({
      ...prev,
      service_areas: prev.service_areas.includes(area)
        ? prev.service_areas.filter(a => a !== area)
        : [...prev.service_areas, area]
    }));
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            office_latitude: position.coords.latitude,
            office_longitude: position.coords.longitude,
          }));
          toast.success('Location captured successfully');
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to get location. Please enter coordinates manually.');
          setLocationLoading(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
      setLocationLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>Update your business profile visible to clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Business Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider_type">Business Type *</Label>
              <Select
                value={formData.provider_type}
                onValueChange={(value) => setFormData({ ...formData, provider_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your services, experience, and what makes you stand out..."
              rows={4}
            />
          </div>

          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Profile Active</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              When active, your profile is visible to clients and can receive bookings
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+255 XXX XXX XXX"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website_url">Website (optional)</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://www.yourwebsite.com"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Office Location
          </CardTitle>
          <CardDescription>
            Set your office location so clients can find you based on proximity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="office_address">Office Address</Label>
            <Input
              id="office_address"
              value={formData.office_address}
              onChange={(e) => setFormData({ ...formData, office_address: e.target.value })}
              placeholder="Enter your office address"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="office_latitude">Latitude</Label>
              <Input
                id="office_latitude"
                type="number"
                step="any"
                value={formData.office_latitude || ''}
                onChange={(e) => setFormData({ ...formData, office_latitude: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="-6.8235"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office_longitude">Longitude</Label>
              <Input
                id="office_longitude"
                type="number"
                step="any"
                value={formData.office_longitude || ''}
                onChange={(e) => setFormData({ ...formData, office_longitude: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="37.0172"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={locationLoading}
            className="w-full gap-2"
          >
            <Navigation className="h-4 w-4" />
            {locationLoading ? 'Getting Location...' : 'Use My Current Location'}
          </Button>

          {formData.office_latitude && formData.office_longitude && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location set: {formData.office_latitude.toFixed(6)}, {formData.office_longitude.toFixed(6)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Areas</CardTitle>
          <CardDescription>Select the regions where you offer services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((region) => (
              <Badge
                key={region}
                variant={formData.service_areas.includes(region) ? 'default' : 'outline'}
                className="cursor-pointer transition-all"
                onClick={() => handleAreaToggle(region)}
              >
                {region}
              </Badge>
            ))}
          </div>
          {formData.service_areas.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {formData.service_areas.join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
