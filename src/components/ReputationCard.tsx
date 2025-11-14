import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, Shield, MessageSquare, TrendingUp } from 'lucide-react';

interface ReputationScore {
  total_score: number;
  reliability_score: number;
  communication_score: number;
  honesty_score: number;
  deals_closed_count: number;
  fraud_flags_count: number;
}

interface ReputationCardProps {
  reputation: ReputationScore;
  compact?: boolean;
}

export function ReputationCard({ reputation, compact = false }: ReputationCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <span className="font-semibold">{reputation.total_score}</span>
        </div>
        <Badge variant={getBadgeVariant(reputation.total_score)}>
          {getScoreLabel(reputation.total_score)}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {reputation.deals_closed_count} deals
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Reputation Score</CardTitle>
          <Badge variant={getBadgeVariant(reputation.total_score)} className="text-lg px-3 py-1">
            {reputation.total_score}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reliability */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Reliability</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(reputation.reliability_score)}`}>
              {reputation.reliability_score}/100
            </span>
          </div>
          <Progress value={reputation.reliability_score} className="h-2" />
        </div>

        {/* Honesty */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Honesty</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(reputation.honesty_score)}`}>
              {reputation.honesty_score}/100
            </span>
          </div>
          <Progress value={reputation.honesty_score} className="h-2" />
        </div>

        {/* Communication */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Communication</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(reputation.communication_score)}`}>
              {reputation.communication_score}/100
            </span>
          </div>
          <Progress value={reputation.communication_score} className="h-2" />
        </div>

        {/* Stats */}
        <div className="pt-4 border-t grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{reputation.deals_closed_count}</div>
            <div className="text-xs text-muted-foreground">Deals Closed</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${reputation.fraud_flags_count > 0 ? 'text-destructive' : 'text-success'}`}>
              {reputation.fraud_flags_count}
            </div>
            <div className="text-xs text-muted-foreground">Fraud Flags</div>
          </div>
        </div>

        {reputation.fraud_flags_count > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              ⚠️ This user has {reputation.fraud_flags_count} fraud flag{reputation.fraud_flags_count > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
