import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { SubscriptionCard, SUBSCRIPTION_PLANS } from '@/components/SubscriptionCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'basic' | 'pro' | 'enterprise';
  start_date: string;
  end_date: string;
  is_active: boolean;
  amount_paid: number | null;
  invoice_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function Subscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .single();

    if (data) {
      setSubscription(data);
    }
    setLoading(false);
  };

  const handleUpgrade = (planType: 'basic' | 'pro' | 'enterprise') => {
    if (subscription && subscription.plan_type === planType) {
      toast({
        title: 'Already Subscribed',
        description: 'You are already on this plan.',
      });
      return;
    }
    
    toast({
      title: 'Contact Sales',
      description: `To upgrade to the ${planType} plan, please contact our sales team at sales@geoestate.tz`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">Choose the perfect plan for your needs</p>
        </div>

        {subscription && (
          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>
                    {subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)} Plan
                  </CardDescription>
                </div>
                <Badge variant={subscription.is_active ? 'default' : 'secondary'}>
                  {subscription.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Started: {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Ends: {format(new Date(subscription.end_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                {subscription.invoice_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={subscription.invoice_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <SubscriptionCard
              key={plan.type}
              plan={plan}
              isCurrentPlan={subscription?.plan_type === plan.type}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold mb-1">Can I change plans anytime?</p>
              <p className="text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">What payment methods do you accept?</p>
              <p className="text-sm text-muted-foreground">
                We accept M-Pesa, bank transfers, and credit cards for subscription payments.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Is there a refund policy?</p>
              <p className="text-sm text-muted-foreground">
                We offer a 7-day money-back guarantee on all paid plans. Contact support for refund requests.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
