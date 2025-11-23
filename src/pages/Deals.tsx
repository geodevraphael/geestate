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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Deals</h1>
          <p className="text-muted-foreground">
            Track all your property purchases and their progress
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Deals</p>
                  <p className="text-3xl font-bold">{activeDeals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completed</p>
                  <p className="text-3xl font-bold">{completedDeals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                  <p className="text-3xl font-bold">
                    {deals.reduce((sum, d) => sum + (d.listing?.price || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deals List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              Active ({activeDeals.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedDeals.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledDeals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeDeals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Deals</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your property buying journey by browsing listings
                  </p>
                  <Link to="/listings">
                    <Button>Browse Properties</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              activeDeals.map((deal) => (
                <Card key={deal.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Property Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Link to={`/buying-process/${deal.id}`}>
                              <h3 className="text-xl font-semibold hover:text-primary transition-colors">
                                {deal.listing?.title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                              <MapPin className="h-4 w-4" />
                              {deal.listing?.location_label}
                            </div>
                          </div>
                          <Badge className={getStatusColor(deal.process_status)}>
                            {deal.process_status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="outline" className="capitalize">
                            {deal.listing?.property_type}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            For {deal.listing?.listing_type}
                          </Badge>
                          {deal.listing?.price && (
                            <Badge variant="outline">
                              {deal.listing.price.toLocaleString()} {deal.listing.currency}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{Math.round(calculateProgress(deal))}%</span>
                          </div>
                          <Progress value={calculateProgress(deal)} className="h-2" />
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Seller: {deal.seller?.organization_name || deal.seller?.full_name}</span>
                          <span>•</span>
                          <span>Started {new Date(deal.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 md:w-48">
                        <Link to={`/buying-process/${deal.id}`} className="w-full">
                          <Button className="w-full">
                            View Process
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                        <Link to={`/listings/${deal.listing_id}`} className="w-full">
                          <Button variant="outline" className="w-full">
                            View Listing
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
