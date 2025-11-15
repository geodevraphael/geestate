import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { ReviewPaymentProofDialog } from './ReviewPaymentProofDialog';

export function AdminPaymentProofs() {
  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchProofs();
  }, []);

  const fetchProofs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('geoinsight_payment_proofs')
        .select(`
          *,
          income_record:geoinsight_income_records(*),
          payer:profiles!geoinsight_payment_proofs_payer_id_fkey(id, full_name, email, role)
        `)
        .in('status', ['submitted', 'under_review'])
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      setProofs(data || []);
    } catch (error: any) {
      console.error('Error fetching payment proofs:', error);
      toast.error('Failed to load payment proofs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'under_review':
        return <Badge variant="secondary" className="bg-blue-100">Under Review</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Proofs Pending Review</CardTitle>
          <CardDescription>Review and verify user-submitted payment proofs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : proofs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment proofs pending review
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Related Income</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proofs.map((proof) => (
                  <TableRow key={proof.id}>
                    <TableCell>{new Date(proof.submitted_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{proof.payer?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{proof.payer?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-sm">{proof.income_record?.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {formatCurrency(proof.income_record?.amount_due)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {proof.payment_channel && (
                        <Badge variant="outline">{proof.payment_channel}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {proof.amount_paid ? formatCurrency(proof.amount_paid) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(proof.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {proof.proof_file_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={proof.proof_file_url} target="_blank" rel="noopener noreferrer">
                              File
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </Button>
                        )}
                        {proof.proof_text && (
                          <Badge variant="secondary" className="text-xs">SMS</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProof(proof);
                          setShowDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedProof && (
        <ReviewPaymentProofDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          proof={selectedProof}
          onUpdate={fetchProofs}
        />
      )}
    </div>
  );
}
