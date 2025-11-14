import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, MapPin, DollarSign, Users, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { calculatePolygonSimilarity, formatArea } from '@/lib/polygonValidation';

interface FraudSignal {
  id: string;
  listing_id: string | null;
  user_id: string;
  signal_type: string;
  signal_score: number;
  details: string | null;
  created_at: string;
}

interface ReputationScore {
  user_id: string;
  total_score: number;
  fraud_flags_count: number;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function FraudDetection() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [signals, setSignals] = useState<FraudSignal[]>([]);
  const [riskyUsers, setRiskyUsers] = useState<ReputationScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchFraudData();
    } else if (user && profile?.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, profile]);

  const fetchFraudData = async () => {
    const [signalsRes, usersRes] = await Promise.all([
      supabase
        .from('fraud_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('reputation_scores')
        .select('user_id, total_score, fraud_flags_count, profiles(full_name, email)')
        .gt('fraud_flags_count', 0)
        .order('fraud_flags_count', { ascending: false })
        .limit(20)
    ]);

    if (signalsRes.data) setSignals(signalsRes.data);
    if (usersRes.data) setRiskyUsers(usersRes.data);
    setLoading(false);
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'duplicate_polygon':
      case 'similar_polygon':
        return <MapPin className="h-4 w-4" />;
      case 'fake_payment':
      case 'rapid_price_drop':
        return <DollarSign className="h-4 w-4" />;
      case 'multiple_accounts_same_phone':
        return <Users className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSignalSeverity = (score: number) => {
    if (score >= 15) return 'destructive';
    if (score >= 10) return 'default';
    return 'secondary';
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Fraud Detection & Prevention
            </h1>
            <p className="text-muted-foreground">Monitor suspicious activities and patterns</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {signals.length} Active Signals
          </Badge>
        </div>

        <Tabs defaultValue="signals" className="space-y-6">
          <TabsList>
            <TabsTrigger value="signals">Fraud Signals</TabsTrigger>
            <TabsTrigger value="users">Risky Users</TabsTrigger>
            <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {signals.filter(s => s.signal_score >= 15).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
                  <Activity className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">
                    {signals.filter(s => s.signal_score >= 10 && s.signal_score < 15).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {signals.filter(s => s.signal_score < 10).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {signals.filter(s => {
                      const signalDate = new Date(s.created_at);
                      const today = new Date();
                      return signalDate.toDateString() === today.toDateString();
                    }).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Fraud Signals</CardTitle>
                <CardDescription>Latest suspicious activities detected by the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {signals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No fraud signals detected</p>
                  ) : (
                    signals.map((signal) => (
                      <div
                        key={signal.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => signal.listing_id && navigate(`/listings/${signal.listing_id}`)}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">{getSignalIcon(signal.signal_type)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium capitalize">
                                {signal.signal_type.replace(/_/g, ' ')}
                              </span>
                              <Badge variant={getSignalSeverity(signal.signal_score) as any}>
                                Score: {signal.signal_score}
                              </Badge>
                            </div>
                            {signal.details && (
                              <p className="text-sm text-muted-foreground">{signal.details}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(signal.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        {signal.listing_id && (
                          <Button variant="outline" size="sm">
                            View Listing
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users with Fraud Flags</CardTitle>
                <CardDescription>Monitor users with suspicious activity patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskyUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No risky users identified</p>
                  ) : (
                    riskyUsers.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{(user as any).profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{(user as any).profiles?.email}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total Score</p>
                            <p className="font-semibold">{user.total_score}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Fraud Flags</p>
                            <p className="font-semibold text-destructive">{user.fraud_flags_count}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/reputation?user=${user.user_id}`)}>
                            View Profile
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns">
            <Card>
              <CardHeader>
                <CardTitle>Pattern Analysis</CardTitle>
                <CardDescription>Common fraud patterns detected in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Polygon-Related Fraud
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Duplicate or overlapping property boundaries detected
                    </p>
                    <div className="text-2xl font-bold text-destructive">
                      {signals.filter(s => s.signal_type.includes('polygon')).length} signals
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Payment Anomalies
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Suspicious pricing or payment patterns
                    </p>
                    <div className="text-2xl font-bold text-warning">
                      {signals.filter(s => s.signal_type.includes('payment') || s.signal_type.includes('price')).length} signals
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Account Abuse
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Multiple accounts or suspicious registration patterns
                    </p>
                    <div className="text-2xl font-bold">
                      {signals.filter(s => s.signal_type.includes('account')).length} signals
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
