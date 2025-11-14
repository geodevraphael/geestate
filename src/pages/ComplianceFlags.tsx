import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Navigate, Link } from 'react-router-dom';

export default function ComplianceFlags() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<any[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<any | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const isAdmin = profile?.role && ['admin', 'compliance_officer'].includes(profile.role);

  useEffect(() => {
    if (isAdmin) {
      fetchFlags();
    }
  }, [isAdmin]);

  const fetchFlags = async () => {
    try {
      const { data } = await supabase
        .from('compliance_flags')
        .select(`
          *,
          listing:listings(*),
          triggered_by_profile:profiles!compliance_flags_triggered_by_fkey(*),
          resolved_by_profile:profiles!compliance_flags_resolved_by_fkey(*)
        `)
        .order('created_at', { ascending: false });

      setFlags(data || []);
    } catch (error) {
      console.error('Error fetching flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedFlag || !resolutionNotes.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('compliance_flags')
        .update({
          resolved: true,
          resolved_by: profile?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', selectedFlag.id);

      if (error) throw error;

      toast({
        title: 'Flag Resolved',
        description: 'Compliance flag has been marked as resolved.',
      });

      setShowResolveDialog(false);
      setResolutionNotes('');
      setSelectedFlag(null);
      fetchFlags();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityBadge = (severity: number) => {
    if (severity >= 4) {
      return <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>;
    } else if (severity === 3) {
      return <Badge className="bg-warning text-warning-foreground">High</Badge>;
    } else if (severity === 2) {
      return <Badge className="bg-info text-info-foreground">Medium</Badge>;
    }
    return <Badge variant="outline">Low</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, string> = {
      payment_mismatch: 'Payment Mismatch',
      duplicate_polygon: 'Duplicate Polygon',
      suspicious_listing: 'Suspicious Listing',
      buyer_seller_conflict: 'Buyer-Seller Conflict',
      other: 'Other',
    };
    return config[type] || type;
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const unresolvedFlags = flags.filter(f => !f.resolved);
  const resolvedFlags = flags.filter(f => f.resolved);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Compliance Flags</h1>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{unresolvedFlags.length}</p>
              <p className="text-sm text-muted-foreground">Unresolved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{resolvedFlags.length}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </div>
        </div>

        {unresolvedFlags.length === 0 && resolvedFlags.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No compliance flags found
            </CardContent>
          </Card>
        ) : (
          <>
            {unresolvedFlags.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Unresolved Flags
                </h2>
                <div className="space-y-4">
                  {unresolvedFlags.map((flag) => (
                    <Card key={flag.id} className="border-l-4 border-l-destructive">
                      <CardHeader>
                        <CardTitle className="flex items-start justify-between">
                          <div>
                            <Link
                              to={`/listings/${flag.listing_id}`}
                              className="text-lg hover:underline"
                            >
                              {flag.listing?.title}
                            </Link>
                            <p className="text-sm font-normal text-muted-foreground mt-1">
                              Flagged by: {flag.triggered_by_profile?.full_name}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            {getSeverityBadge(flag.severity)}
                            <Badge variant="outline">{getTypeBadge(flag.type)}</Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-semibold mb-1">Issue Description:</p>
                          <p className="text-sm text-muted-foreground">{flag.notes}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Flagged: {format(new Date(flag.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                          <div className="flex gap-2">
                            <Link to={`/listings/${flag.listing_id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                View Listing
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFlag(flag);
                                setShowResolveDialog(true);
                              }}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Resolve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {resolvedFlags.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Resolved Flags
                </h2>
                <div className="space-y-4">
                  {resolvedFlags.map((flag) => (
                    <Card key={flag.id} className="opacity-75">
                      <CardHeader>
                        <CardTitle className="flex items-start justify-between">
                          <div>
                            <Link
                              to={`/listings/${flag.listing_id}`}
                              className="text-lg hover:underline"
                            >
                              {flag.listing?.title}
                            </Link>
                            <p className="text-sm font-normal text-muted-foreground mt-1">
                              Resolved by: {flag.resolved_by_profile?.full_name}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <Badge className="bg-success text-success-foreground">Resolved</Badge>
                            <Badge variant="outline">{getTypeBadge(flag.type)}</Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold mb-1">Original Issue:</p>
                          <p className="text-sm text-muted-foreground">{flag.notes}</p>
                        </div>

                        <div>
                          <p className="text-sm font-semibold mb-1">Resolution:</p>
                          <p className="text-sm text-muted-foreground">{flag.resolution_notes}</p>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Flagged: {format(new Date(flag.created_at), 'MMM dd, yyyy')}</span>
                          <span>Resolved: {format(new Date(flag.resolved_at), 'MMM dd, yyyy')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Compliance Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFlag && (
              <div className="p-3 bg-muted rounded">
                <p className="text-sm font-semibold mb-1">Issue:</p>
                <p className="text-sm text-muted-foreground">{selectedFlag.notes}</p>
              </div>
            )}

            <div>
              <Label>Resolution Notes *</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain how this issue was resolved..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={processing || !resolutionNotes.trim()}
              >
                {processing ? 'Resolving...' : 'Mark as Resolved'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
