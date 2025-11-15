import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Rocket, LucideIcon } from 'lucide-react';

interface SubscriptionPlan {
  name: string;
  type: 'basic' | 'pro' | 'enterprise';
  price: string;
  icon: LucideIcon;
  features: string[];
  popular?: boolean;
}

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan?: boolean;
  onSubscribe: (planType: 'basic' | 'pro' | 'enterprise') => void;
}

export function SubscriptionCard({ plan, isCurrentPlan, onSubscribe }: SubscriptionCardProps) {
  const Icon = plan.icon;

  return (
    <Card className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${isCurrentPlan ? 'border-success' : ''}`}>
      {plan.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Most Popular
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success">
          Current Plan
        </Badge>
      )}
      
      <CardHeader className="text-center pt-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold text-foreground">{plan.price}</span>
          {plan.price !== 'Free' && <span className="text-muted-foreground">/month</span>}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() => onSubscribe(plan.type)}
          className="w-full"
          variant={plan.popular ? 'default' : 'outline'}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' : 'Upgrade to ' + plan.name}
        </Button>
      </CardContent>
    </Card>
  );
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    name: 'Basic',
    type: 'basic',
    price: 'Free',
    icon: Zap,
    features: [
      '5 active listings',
      'Basic support',
      'Standard listing visibility',
      'Map browsing access',
      'Messaging system',
    ],
  },
  {
    name: 'Pro',
    type: 'pro',
    price: 'TZS 50,000',
    icon: Crown,
    features: [
      '25 active listings',
      'Priority support',
      'Agent badge on profile',
      'Enhanced listing visibility',
      'Advanced analytics',
      'Payment proof management',
      'Reputation boost',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    type: 'enterprise',
    price: 'TZS 150,000',
    icon: Rocket,
    features: [
      'Unlimited listings',
      'Featured listings',
      'Boosted visibility',
      'Premium analytics',
      'Dedicated account manager',
      'Custom branding',
      'API access',
      'Bulk import tools',
    ],
  },
];
