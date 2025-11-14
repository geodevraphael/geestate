import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Droplets, Target, TrendingUp, Users, Building } from 'lucide-react';
import { ServiceProviderSelector } from '@/components/ServiceProviderSelector';

interface GeoInsightServicesProps {
  listingId: string;
  sellerId: string;
}

const GEOINSIGHT_SERVICES = [
  { 
    value: 'flood_risk_evaluation', 
    label: 'Flood Risk Evaluation', 
    icon: Droplets, 
    description: 'Comprehensive flood risk assessment using advanced geospatial modeling and historical data analysis'
  },
  { 
    value: 'suitability_analysis', 
    label: 'Suitability Analysis', 
    icon: Target, 
    description: 'Land use suitability evaluation for various development types including residential, commercial, and industrial'
  },
  { 
    value: 'business_insights', 
    label: 'Business Insights', 
    icon: TrendingUp, 
    description: 'Market trends, growth potential, and investment opportunities analysis for the area'
  },
  { 
    value: 'competition_analysis', 
    label: 'Business Competition Analysis', 
    icon: Building, 
    description: 'Competitive landscape mapping including nearby businesses, market saturation, and opportunity gaps'
  },
  { 
    value: 'demographic_insight', 
    label: 'Demographic Insight', 
    icon: Users, 
    description: 'Population demographics, income levels, age distribution, and consumer behavior patterns'
  },
];

export function GeoInsightServices({ listingId, sellerId }: GeoInsightServicesProps) {
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
        service_category: 'geoinsight',
        status: 'pending',
        request_notes: notes,
      });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Your GeoInsight service request has been sent. We will contact you shortly.',
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
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          GeoInsight Professional Services
        </CardTitle>
        <CardDescription>
          Advanced geospatial analytics and business intelligence for informed decision-making
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {GEOINSIGHT_SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <div 
                key={service.value} 
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">{service.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{service.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">Request GeoInsight Analysis</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request GeoInsight Service</DialogTitle>
              <DialogDescription>
                Select an analysis service and choose from our expert providers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="geoinsight-service-type">Select Service</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger id="geoinsight-service-type">
                    <SelectValue placeholder="Choose an analysis service" />
                  </SelectTrigger>
                  <SelectContent>
                    {GEOINSIGHT_SERVICES.map((service) => (
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
                <Label htmlFor="geoinsight-notes">Additional Requirements</Label>
                <Textarea
                  id="geoinsight-notes"
                  placeholder="Describe any specific requirements or questions about this analysis..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  The selected provider will review your request and provide a detailed quote within 24-48 hours.
                </p>
              </div>
              <Button onClick={handleSubmit} disabled={loading || !serviceType || !selectedProvider} className="w-full" size="lg">
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
