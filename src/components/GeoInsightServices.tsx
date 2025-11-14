import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Droplets, Target, TrendingUp, Users, Building } from 'lucide-react';

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
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!user || !serviceType) {
      toast({
        title: 'Error',
        description: 'Please select a service type',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const selectedService = GEOINSIGHT_SERVICES.find(s => s.value === serviceType);
      
      const { error } = await supabase.from('leads').insert({
        buyer_id: user.id,
        seller_id: sellerId,
        listing_id: listingId,
        source: 'direct_contact',
        status: 'new',
        notes: `GeoInsight Service Request: ${selectedService?.label}\n\n${notes}`,
      });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Your GeoInsight service request has been sent. We will contact you shortly.',
      });
      
      setOpen(false);
      setServiceType('');
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request GeoInsight Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
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
                  Our GeoInsight team will review your request and provide a detailed quote within 24-48 hours.
                </p>
              </div>
              <Button onClick={handleSubmit} disabled={loading || !serviceType} className="w-full" size="lg">
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
