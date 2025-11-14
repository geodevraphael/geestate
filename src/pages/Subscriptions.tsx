import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Rocket } from 'lucide-react';
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

const plans = [
  {
    name: 'Basic',
    type: 'basic' as const,
    price: 'Free',
    icon: Zap,
    features: [
      '5 active listings',
      'Basic support',
      'Standard listing visibility',
      'Map browsing access',
    ],
  },
  {
    name: 'Pro',
    type: 'pro' as const,
    price: 'TZS 50,000/month',
    icon: Crown,
    features: [
      '25 active listings',
      'Priority support',
      'Agent badge on profile',
      'Enhanced listing visibility',
      'Advanced analytics',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    type: 'enterprise' as const,
    price: 'TZS 150,000/month',
    icon: Rocket,
    features: [
      'Unlimited listings',
      'Featured listings',
      'Boosted visibility',
      'Premium analytics',
      'Dedicated account manager',
      'Custom branding',
    ],
  },
];

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
    toast({
      title: 'Contact Sales',
      description: 'Please contact our sales team to upgrade your subscription plan.',
    });
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
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
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Started: {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires: {format(new Date(subscription.end_date), 'MMM dd, yyyy')}
                </p>
              </div>
              {subscription.invoice_url && (
                <Button variant="outline" asChild>
                  <a href={subscription.invoice_url} target="_blank" rel="noopener noreferrer">
                    View Invoice
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = subscription?.plan_type === plan.type;

          return (
            <Card
              key={plan.type}
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${
                isCurrentPlan ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                  {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-2xl font-bold text-foreground">
                  {plan.price}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  disabled={isCurrentPlan}
                  onClick={() => handleUpgrade(plan.type)}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Upgrade Now'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Instructions</CardTitle>
          <CardDescription>How to upgrade your subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Bank Transfer</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Transfer the subscription amount to our bank account:
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
              <p>Bank: CRDB Bank Tanzania</p>
              <p>Account Name: GeoEstate Tanzania Ltd</p>
              <p>Account Number: 0150123456789</p>
              <p>Swift Code: CORUTZTZ</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Mobile Money</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Send payment via M-Pesa, Tigo Pesa, or Airtel Money:
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
              <p>Business Number: 123456</p>
              <p>Business Name: GeoEstate Tanzania</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              After payment, please upload your payment proof through your dashboard or contact
              support with your transaction reference.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
