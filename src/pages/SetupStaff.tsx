import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Users, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SetupStaff() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSetup = async () => {
    setLoading(true);
    setResults(null);

    try {
      toast({
        title: 'Creating Staff Accounts',
        description: 'Please wait while we set up all GeoInsight staff accounts...',
      });

      const { data, error } = await supabase.functions.invoke('setup-staff-accounts');

      if (error) {
        throw error;
      }

      if (data.success) {
        setResults(data);
        toast({
          title: 'Setup Complete!',
          description: `Created ${data.summary.created} accounts, ${data.summary.existing} already existed`,
        });
      } else {
        throw new Error(data.error || 'Setup failed');
      }
    } catch (error) {
      console.error('Error setting up staff:', error);
      toast({
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Failed to create staff accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const staffList = [
    { name: 'John Mwamba', email: 'john.mwamba@geoestate.tz', role: 'Admin' },
    { name: 'Sarah Kimaro', email: 'sarah.kimaro@geoestate.tz', role: 'Admin' },
    { name: 'Michael Ngowi', email: 'michael.ngowi@geoestate.tz', role: 'Verification Officer' },
    { name: 'Grace Mollel', email: 'grace.mollel@geoestate.tz', role: 'Verification Officer' },
    { name: 'Joseph Moshi', email: 'joseph.moshi@geoestate.tz', role: 'Verification Officer' },
    { name: 'Amina Hassan', email: 'amina.hassan@geoestate.tz', role: 'Compliance Officer' },
    { name: 'David Nyerere', email: 'david.nyerere@geoestate.tz', role: 'Compliance Officer' },
    { name: 'Peter Makori', email: 'peter.makori@geoestate.tz', role: 'Spatial Analyst' },
    { name: 'Fatuma Juma', email: 'fatuma.juma@geoestate.tz', role: 'Spatial Analyst' },
    { name: 'Rose Mwakasege', email: 'rose.mwakasege@geoestate.tz', role: 'Customer Success' },
    { name: 'Ibrahim Said', email: 'ibrahim.said@geoestate.tz', role: 'Customer Success' },
    { name: 'Lucy Mtui', email: 'lucy.mtui@geoestate.tz', role: 'Staff' },
    { name: 'James Kapinga', email: 'james.kapinga@geoestate.tz', role: 'Staff' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            GeoInsight Staff Setup
          </h1>
          <p className="text-muted-foreground">Create all staff accounts with dummy data</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will create {staffList.length} staff accounts with password: <strong>TEST123</strong>
            <br />
            Accounts that already exist will be skipped.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Staff Accounts to Create</CardTitle>
            <CardDescription>
              Complete GeoInsight team with different roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              {staffList.map((staff) => (
                <div key={staff.email} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{staff.name}</p>
                    <p className="text-sm text-muted-foreground">{staff.email}</p>
                  </div>
                  <Badge variant="outline">{staff.role}</Badge>
                </div>
              ))}
            </div>

            <Button
              onClick={handleSetup}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Accounts...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Create All Staff Accounts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-success/10">
                  <div className="flex items-center gap-2 text-success mb-1">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-bold text-2xl">{results.summary.created}</span>
                  </div>
                  <p className="text-sm">Created</p>
                </div>

                <div className="p-4 border rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-bold text-2xl">{results.summary.existing}</span>
                  </div>
                  <p className="text-sm">Already Existed</p>
                </div>

                <div className="p-4 border rounded-lg bg-destructive/10">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <XCircle className="h-5 w-5" />
                    <span className="font-bold text-2xl">{results.summary.failed}</span>
                  </div>
                  <p className="text-sm">Failed</p>
                </div>
              </div>

              {results.details.success.length > 0 && (
                <div>
                  <h3 className="font-semibold text-success mb-2">✓ Successfully Created</h3>
                  <div className="space-y-1">
                    {results.details.success.map((email: string) => (
                      <p key={email} className="text-sm text-muted-foreground pl-4">• {email}</p>
                    ))}
                  </div>
                </div>
              )}

              {results.details.existing.length > 0 && (
                <div>
                  <h3 className="font-semibold text-muted-foreground mb-2">⊙ Already Existed</h3>
                  <div className="space-y-1">
                    {results.details.existing.map((email: string) => (
                      <p key={email} className="text-sm text-muted-foreground pl-4">• {email}</p>
                    ))}
                  </div>
                </div>
              )}

              {results.details.failed.length > 0 && (
                <div>
                  <h3 className="font-semibold text-destructive mb-2">✗ Failed</h3>
                  <div className="space-y-2">
                    {results.details.failed.map((item: any) => (
                      <div key={item.email} className="pl-4">
                        <p className="text-sm font-medium">{item.email}</p>
                        <p className="text-sm text-muted-foreground">{item.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  All accounts use password: <strong>TEST123</strong>
                  <br />
                  Users can login immediately at /auth
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}