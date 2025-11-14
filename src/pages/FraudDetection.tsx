import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, MapPin, DollarSign, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Fraud Detection
          </h1>
          <p className="text-muted-foreground">Monitor suspicious activities and signals</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {signals.length} Active Signals
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                signals.slice(0, 10).map((signal) => (
                  <div
                    key={signal.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex gap-3 flex-1">
                      <div className="mt-1">{getSignalIcon(signal.signal_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">
                            {signal.signal_type.replace(/_/g, ' ').toUpperCase()}
                          </p>
                          <Badge variant={getSignalSeverity(signal.signal_score)}>
                            Score: {signal.signal_score}
                          </Badge>
                        </div>
                        {signal.details && (
                          <p className="text-xs text-muted-foreground mb-2">{signal.details}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(signal.created_at), 'MMM dd, HH:mm')}
                        </div>
                      </div>
                    </div>
                    {signal.listing_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/listings/${signal.listing_id}`)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High-Risk Users</CardTitle>
            <CardDescription>Users with multiple fraud flags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskyUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No high-risk users identified</p>
              ) : (
                riskyUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{user.profiles?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.profiles?.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="destructive" className="text-xs">
                          {user.fraud_flags_count} flags
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Score: {user.total_score}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Review
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fraud Detection Rules</CardTitle>
          <CardDescription>Active monitoring rules in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Polygon Duplication
              </h4>
              <p className="text-sm text-muted-foreground">
                Detects identical polygons across multiple listings
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Polygon Overlap
              </h4>
              <p className="text-sm text-muted-foreground">
                Flags listings with &gt;80% polygon overlap
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Multi-Account Detection
              </h4>
              <p className="text-sm text-muted-foreground">
                Identifies multiple accounts with same phone/device
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Price Drop Analysis
              </h4>
              <p className="text-sm text-muted-foreground">
                Flags sudden price drops &gt;50%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
