import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { ReputationCard } from '@/components/ReputationCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trophy, History } from 'lucide-react';
import { format } from 'date-fns';

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
  created_at: string;
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Reputation Data</CardTitle>
              <CardDescription>Complete deals to build your reputation score.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Your Reputation</h1>
            <p className="text-muted-foreground">Track your performance and trustworthiness</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Reputation Card */}
          <div className="lg:col-span-2">
            <ReputationCard reputation={reputation} />
          </div>

          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-semibold">{format(new Date(reputation.created_at), 'MMM dd, yyyy')}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-semibold">{format(new Date(reputation.last_updated), 'MMM dd, yyyy')}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Score Breakdown</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Reliability:</span>
                    <span className="font-medium">{reputation.reliability_score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Honesty:</span>
                    <span className="font-medium">{reputation.honesty_score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Communication:</span>
                    <span className="font-medium">{reputation.communication_score}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to Improve */}
        <Card>
          <CardHeader>
            <CardTitle>How to Improve Your Reputation</CardTitle>
            <CardDescription>Follow these tips to build trust with other users</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Complete deals:</strong> Successfully close transactions to boost your reliability score</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Respond promptly:</strong> Quick responses improve your communication score</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Provide accurate information:</strong> Honest listings increase your honesty score</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Avoid flags:</strong> Ensure all your listings and transactions comply with platform rules</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
