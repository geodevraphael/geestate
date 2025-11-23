import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ArrowRight, CheckCircle } from 'lucide-react';

const MONTHLY_FEE = 100000;

export default function Subscriptions() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  
  // Redirect buyers to homepage (they don't need subscriptions)
  useEffect(() => {
    if (user && hasRole('buyer') && !hasRole('seller') && !hasRole('admin')) {
      navigate('/');
    }
  }, [user, hasRole, navigate]);

  const handleViewPayments = () => {
    navigate('/geoinsight-payments');
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Monthly Platform Fee</h1>
          <p className="text-muted-foreground">Simple, transparent pricing for all users</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="border-primary shadow-lg">
            <CardHeader className="text-center pt-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">GeoInsight Platform</CardTitle>
              <CardDescription>
                <span className="text-4xl font-bold text-foreground">{MONTHLY_FEE.toLocaleString()} TZS</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-center text-muted-foreground">
                  This monthly fee includes:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Full access to the GeoInsight platform</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Create and manage property listings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Advanced geospatial tools and analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Professional support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Payment tracking and invoices</span>
                  </li>
                </ul>
              </div>

              <Button 
                onClick={handleViewPayments}
                className="w-full"
                size="lg"
              >
                View My Payments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Monthly fees are automatically generated and payable via bank transfer or mobile money.
                View all your payments and submit proof in the payments section.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold mb-1">When is the monthly fee due?</p>
              <p className="text-sm text-muted-foreground">
                Your monthly fee is generated at the start of each month and is due by the end of the month.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">What payment methods do you accept?</p>
              <p className="text-sm text-muted-foreground">
                We accept M-Pesa, Tigo Pesa, Airtel Money, and bank transfers.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">What if I miss a payment?</p>
              <p className="text-sm text-muted-foreground">
                Late payments may result in service suspension. Please contact support if you're having trouble making payments.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
