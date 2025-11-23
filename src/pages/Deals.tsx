import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, CheckCircle2, Clock, MapPin, DollarSign, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Deal {
  id: string;
  listing_id: string;
  current_step: number;
  process_status: string;
  created_at: string;
  visit_completed: boolean;
  title_verification_completed: boolean;
  registry_search_completed: boolean;
  sale_agreement_completed: boolean;
  payment_completed: boolean;
  transfer_completed: boolean;
  listing: {
    id: string;
    title: string;
    location_label: string;
    price: number;
    currency: string;
    property_type: string;
    listing_type: string;
    status: string;
  };
  seller: {
    full_name: string;
    organization_name: string;
  };
}

export default function Deals() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (user?.id) {
      fetchDeals();
    }
  }, [user?.id]);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('buying_process_tracker')
        .select(`
          *,
          listing:listings(
            id,
            title,
            location_label,
            price,
            currency,
            property_type,
            listing_type,
            status
          ),
          seller:profiles!buying_process_tracker_seller_id_fkey(
            full_name,
            organization_name
          )
        `)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (deal: Deal) => {
    const steps = [
      deal.visit_completed,
      deal.title_verification_completed,
      deal.registry_search_completed,
      deal.sale_agreement_completed,
      deal.payment_completed,
      deal.transfer_completed,
    ];
    const completed = steps.filter(Boolean).length;
    return (completed / steps.length) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'in_progress':
        return 'bg-primary text-primary-foreground';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const activeDeals = deals.filter(d => d.process_status === 'in_progress');
  const completedDeals = deals.filter(d => d.process_status === 'completed');
  const cancelledDeals = deals.filter(d => d.process_status === 'cancelled');

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your deals...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">My Deals</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track all your property purchases and their progress
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Active Deals</p>
                  <p className="text-2xl md:text-3xl font-bold">{activeDeals.length}</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Completed</p>
                  <p className="text-2xl md:text-3xl font-bold">{completedDeals.length}</p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Value</p>
                  <p className="text-xl md:text-3xl font-bold truncate">
                    {deals.reduce((sum, d) => sum + (d.listing?.price || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deals List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 md:mb-6 w-full sm:w-auto grid grid-cols-3 sm:inline-grid">
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              Active ({activeDeals.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">
              Completed ({completedDeals.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs sm:text-sm">
              Cancelled ({cancelledDeals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 md:space-y-4">
            {activeDeals.length === 0 ? (
              <Card>
                <CardContent className="p-8 md:p-12 text-center">
                  <ShoppingBag className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                  <h3 className="text-base md:text-lg font-semibold mb-2">No Active Deals</h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">
                    Start your property buying journey by browsing listings
                  </p>
                  <Link to="/listings">
                    <Button className="touch-feedback">Browse Properties</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              activeDeals.map((deal) => (
                <Card key={deal.id} className="hover:shadow-md transition-shadow mobile-card">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col gap-4 md:gap-6">
                      {/* Property Info */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <Link to={`/buying-process/${deal.id}`}>
                              <h3 className="text-lg md:text-xl font-semibold hover:text-primary transition-colors line-clamp-2">
                                {deal.listing?.title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-1.5 text-sm md:text-base text-muted-foreground mt-1">
                              <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="line-clamp-1">{deal.listing?.location_label}</span>
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(deal.process_status)} whitespace-nowrap text-xs`}>
                            {deal.process_status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4">
                          <Badge variant="outline" className="capitalize text-xs">
                            {deal.listing?.property_type}
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">
                            For {deal.listing?.listing_type}
                          </Badge>
                          {deal.listing?.price && (
                            <Badge variant="outline" className="text-xs">
                              {deal.listing.price.toLocaleString()} {deal.listing.currency}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{Math.round(calculateProgress(deal))}%</span>
                          </div>
                          <Progress value={calculateProgress(deal)} className="h-2" />
                        </div>

                        <div className="mt-3 md:mt-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm text-muted-foreground">
                          <span className="line-clamp-1">Seller: {deal.seller?.organization_name || deal.seller?.full_name}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>Started {new Date(deal.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row sm:flex-col gap-2 sm:w-auto">
                        <Link to={`/buying-process/${deal.id}`} className="flex-1 sm:flex-initial sm:w-full">
                          <Button className="w-full touch-feedback h-11 md:h-10 text-sm">
                            <span className="hidden sm:inline">View Process</span>
                            <span className="sm:hidden">Process</span>
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                        <Link to={`/listings/${deal.listing_id}`} className="flex-1 sm:flex-initial sm:w-full">
                          <Button variant="outline" className="w-full touch-feedback h-11 md:h-10 text-sm">
                            <span className="hidden sm:inline">View Listing</span>
                            <span className="sm:hidden">Listing</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedDeals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Deals</h3>
                  <p className="text-muted-foreground">
                    Completed property purchases will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedDeals.map((deal) => (
                <Card key={deal.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link to={`/buying-process/${deal.id}`}>
                          <h3 className="text-xl font-semibold hover:text-primary transition-colors">
                            {deal.listing?.title}
                          </h3>
                        </Link>
                        <p className="text-muted-foreground mt-1">{deal.listing?.location_label}</p>
                        <div className="mt-4 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <span className="text-sm font-medium text-success">Purchase Complete</span>
                        </div>
                      </div>
                      <Link to={`/buying-process/${deal.id}`}>
                        <Button variant="outline">View Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {cancelledDeals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No cancelled deals</p>
                </CardContent>
              </Card>
            ) : (
              cancelledDeals.map((deal) => (
                <Card key={deal.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{deal.listing?.title}</h3>
                        <p className="text-muted-foreground mt-1">{deal.listing?.location_label}</p>
                      </div>
                      <Badge variant="outline" className="text-muted-foreground">
                        Cancelled
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
