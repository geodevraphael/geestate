import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, TrendingUp, Shield, MessageSquare } from 'lucide-react';

interface ReputationScore {
  id: string;
  user_id: string;
  total_score: number;
  reliability_score: number;
  communication_score: number;
  honesty_score: number;
  deals_closed_count: number;
  fraud_flags_count: number;
  last_updated: string;
}

export default function Reputation() {
  const { user } = useAuth();
  const [reputation, setReputation] = useState<ReputationScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReputation();
    }
  }, [user]);

  const fetchReputation = async () => {
    const { data, error } = await supabase
      .from('reputation_scores')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setReputation(data);
    }
    setLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!reputation) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Reputation Data</CardTitle>
            <CardDescription>Complete deals to build your reputation score.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Reputation</h1>
          <p className="text-muted-foreground">Track your performance and trustworthiness</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Total Score: {reputation.total_score}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reliability</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(reputation.reliability_score)}`}>
              {reputation.reliability_score}/100
            </div>
            <Progress value={reputation.reliability_score} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {getScoreLabel(reputation.reliability_score)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Honesty</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(reputation.honesty_score)}`}>
              {reputation.honesty_score}/100
            </div>
            <Progress value={reputation.honesty_score} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {getScoreLabel(reputation.honesty_score)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Communication</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(reputation.communication_score)}`}>
              {reputation.communication_score}/100
            </div>
            <Progress value={reputation.communication_score} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {getScoreLabel(reputation.communication_score)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals Closed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reputation.deals_closed_count}</div>
            <p className="text-xs text-muted-foreground mt-2">Total successful deals</p>
          </CardContent>
        </Card>
      </div>

      {reputation.fraud_flags_count > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Fraud Flags</CardTitle>
            <CardDescription>
              You have {reputation.fraud_flags_count} fraud flag(s) on your account.
              Please ensure all transactions are legitimate.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How Reputation Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Building Your Score</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Complete deals successfully to increase reliability and honesty scores</li>
              <li>Respond quickly to messages to improve communication score</li>
              <li>Verify payment proofs promptly as a seller</li>
              <li>Upload legitimate payment proofs as a buyer</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">What Hurts Your Score</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Compliance flags and fraud signals</li>
              <li>Rejecting legitimate payment proofs</li>
              <li>Uploading fake payment documents</li>
              <li>Suspicious activity or policy violations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
