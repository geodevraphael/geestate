import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveModal } from '@/components/ResponsiveModal';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Ruler, FileText, Compass } from 'lucide-react';
import { ServiceProviderSelector } from '@/components/ServiceProviderSelector';

interface GeospatialServiceRequestProps {
  listingId: string;
  sellerId: string;
}

const GEOSPATIAL_SERVICES = [
  { value: 'boundary_survey', label: 'Boundary Survey', icon: Ruler, description: 'Professional land boundary demarcation and verification' },
  { value: 'title_verification', label: 'Title Deed Verification', icon: FileText, description: 'Official title deed authentication and cadastral check' },
  { value: 'topographic_survey', label: 'Topographic Survey', icon: Compass, description: 'Elevation mapping and terrain analysis' },
  { value: 'cadastral_mapping', label: 'Cadastral Mapping', icon: MapPin, description: 'Official land registry mapping and documentation' },
];

export function GeospatialServiceRequest({ listingId, sellerId }: GeospatialServiceRequestProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!user || !serviceType || !selectedProvider) {
      toast({
        title: 'Error',
        description: 'Please select a service type and provider',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('service_requests').insert({
        listing_id: listingId,
        requester_id: user.id,
        service_provider_id: selectedProvider,
        service_type: serviceType,
        service_category: 'geospatial',
        status: 'pending',
        request_notes: notes,
      });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Your service request has been sent to the provider.',
      });
      
      setOpen(false);
      setServiceType('');
      setSelectedProvider('');
      setNotes('');
    } catch (error) {
      console.error('Error submitting service request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Geospatial Services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Request professional surveying and verification services for this property
        </p>
        <div className="grid gap-3">
          {GEOSPATIAL_SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.value} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{service.label}</p>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        <ResponsiveModal
          open={open}
          onOpenChange={setOpen}
          title="Request Geospatial Service"
          description="Select a service and choose from our verified providers"
          trigger={
            <Button className="w-full">Request Service</Button>
          }
        >
          <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="service-type">Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger id="service-type">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {GEOSPATIAL_SERVICES.map((service) => (
                      <SelectItem key={service.value} value={service.value}>
                        {service.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {serviceType && (
                <div className="space-y-2">
                  <Label>Select Service Provider</Label>
                  <ServiceProviderSelector
                    serviceType={serviceType}
                    selectedProvider={selectedProvider}
                    onProviderChange={setSelectedProvider}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any specific requirements or questions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            <Button onClick={handleSubmit} disabled={loading || !serviceType || !selectedProvider} className="w-full">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </ResponsiveModal>
      </CardContent>
    </Card>
  );
}
