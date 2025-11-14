import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Star, Award, Clock, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ServiceProvider {
  id: string;
  company_name: string;
  company_type: string;
  rating: number;
  total_reviews: number;
  completed_projects: number;
  average_turnaround_days: number | null;
  is_verified: boolean;
  description: string | null;
  contact_phone: string | null;
  services_offered: string[];
}

interface ServiceProviderSelectorProps {
  serviceType: string;
  selectedProvider: string;
  onProviderChange: (providerId: string) => void;
}

export function ServiceProviderSelector({ serviceType, selectedProvider, onProviderChange }: ServiceProviderSelectorProps) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, [serviceType]);

  const fetchProviders = async () => {
    if (!serviceType) {
      setProviders([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('is_active', true)
        .contains('services_offered', [serviceType])
        .order('rating', { ascending: false })
        .order('completed_projects', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No service providers available for this service type.</p>
        <p className="text-sm mt-2">Please contact support to register service providers.</p>
      </div>
    );
  }

  const recommendedProviders = providers.filter(p => p.rating >= 4.0 && p.completed_projects >= 5);

  return (
    <div className="space-y-4">
      {recommendedProviders.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Award className="h-4 w-4 text-primary" />
          <span className="font-medium text-primary">Top Rated Providers</span>
        </div>
      )}
      
      <RadioGroup value={selectedProvider} onValueChange={onProviderChange}>
        {providers.map((provider, index) => {
          const isRecommended = recommendedProviders.includes(provider);
          
          return (
            <div key={provider.id} className="relative">
              <Card className={`p-4 cursor-pointer transition-all hover:border-primary ${selectedProvider === provider.id ? 'border-primary bg-primary/5' : ''} ${isRecommended && index < 3 ? 'border-primary/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={provider.id} id={provider.id} className="mt-1" />
                  
                  <Label htmlFor={provider.id} className="flex-1 cursor-pointer">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{provider.company_name}</span>
                            {provider.is_verified && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                            {isRecommended && index < 3 && (
                              <Badge variant="default" className="text-xs">Recommended</Badge>
                            )}
                          </div>
                          {provider.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {provider.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          <span className="font-medium">{provider.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">({provider.total_reviews} reviews)</span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{provider.completed_projects} projects</span>
                        </div>
                        
                        {provider.average_turnaround_days && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>~{provider.average_turnaround_days} days</span>
                          </div>
                        )}
                      </div>

                      {provider.contact_phone && (
                        <p className="text-xs text-muted-foreground">
                          Contact: {provider.contact_phone}
                        </p>
                      )}
                    </div>
                  </Label>
                </div>
              </Card>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
