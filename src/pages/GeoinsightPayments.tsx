import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, DollarSign, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { IncomeRecordWithDetails } from '@/types/geoinsight-income';
import { PaymentInstructionsDialog } from '@/components/PaymentInstructionsDialog';

export default function GeoinsightPayments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecordWithDetails[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<IncomeRecordWithDetails | null>(null);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);

  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    totalOverdue: 0,
    totalPaid: 0,
  });

  useEffect(() => {
    if (user) {
      fetchIncomeRecords();
    }
  }, [user]);

  const fetchIncomeRecords = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('geoinsight_income_records')
        .select(`
          *,
          fee_definition:geoinsight_fee_definitions(*),
          payment_proofs:geoinsight_payment_proofs(*),
          invoice:geoinsight_invoices(*),
          listing:listings(id, title)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setIncomeRecords((data || []) as any);
      
      // Calculate summary
      const outstanding = data?.filter(r => r.status === 'pending' || r.status === 'awaiting_review')
        .reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;
      const overdue = data?.filter(r => r.status === 'overdue')
        .reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;
      const paid = data?.filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;
      
      setSummary({
        totalOutstanding: outstanding,
        totalOverdue: overdue,
        totalPaid: paid,
      });
    } catch (error: any) {
      console.error('Error fetching income records:', error);
      toast.error('Failed to load payment records');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'awaiting_review':
        return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />Under Review</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
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

  const pendingRecords = incomeRecords.filter(r => r.status === 'pending' || r.status === 'overdue');
  const awaitingReviewRecords = incomeRecords.filter(r => r.status === 'awaiting_review');
  const paidRecords = incomeRecords.filter(r => r.status === 'paid');

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My GeoInsight Fee</h1>
          <p className="text-muted-foreground text-sm sm:text-base">View and pay your monthly platform fees</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Amount you owe</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold text-destructive">{formatCurrency(summary.totalOverdue)}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Past due date</p>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Paid (12 months)</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold">{formatCurrency(summary.totalPaid)}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Total paid</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different statuses */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Pending </span>({pendingRecords.length})
            </TabsTrigger>
            <TabsTrigger value="review" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Under </span>Review ({awaitingReviewRecords.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="text-xs sm:text-sm">
              Paid ({paidRecords.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Payments</CardTitle>
                <CardDescription>Payments awaiting your action</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending payments</p>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="space-y-4 md:hidden">
                      {pendingRecords.map((record) => (
                        <Card key={record.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground">
                                  {new Date(record.created_at).toLocaleDateString()}
                                </p>
                                <p className="font-medium line-clamp-2 mt-1">{record.description}</p>
                                {record.fee_definition?.code === 'LISTING_FEE' && (
                                  <Button
                                    size="sm"
                                    variant="link"
                                    className="h-auto p-0 text-primary"
                                    onClick={() => navigate(`/listing-fee-breakdown?recordId=${record.id}`)}
                                  >
                                    <Info className="w-3 h-3 mr-1" />
                                    View breakdown
                                  </Button>
                                )}
                              </div>
                              {getStatusBadge(record.status)}
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t">
                              <div>
                                <p className="text-xs text-muted-foreground">Amount</p>
                                <p className="font-bold text-lg">{formatCurrency(record.amount_due, record.currency)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Due</p>
                                <p className={`text-sm ${record.status === 'overdue' ? 'text-destructive font-medium' : ''}`}>
                                  {record.due_date ? formatDistanceToNow(new Date(record.due_date), { addSuffix: true }) : '-'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowInstructionsDialog(true);
                                }}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Pay
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => navigate(`/upload-payment-proof/${record.id}`)}
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                Upload
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{new Date(record.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="max-w-xs">
                                <div className="flex items-center gap-2">
                                  <span className="line-clamp-2">{record.description}</span>
                                  {record.fee_definition?.code === 'LISTING_FEE' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={() => navigate(`/listing-fee-breakdown?recordId=${record.id}`)}
                                    >
                                      <Info className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{formatCurrency(record.amount_due, record.currency)}</TableCell>
                              <TableCell>
                                {record.due_date ? (
                                  <span className={record.status === 'overdue' ? 'text-destructive' : ''}>
                                    {formatDistanceToNow(new Date(record.due_date), { addSuffix: true })}
                                  </span>
                                ) : '-'}
                              </TableCell>
                              <TableCell>{getStatusBadge(record.status)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedRecord(record);
                                      setShowInstructionsDialog(true);
                                    }}
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    Instructions
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => navigate(`/upload-payment-proof/${record.id}`)}
                                  >
                                    <Upload className="w-4 h-4 mr-1" />
                                    Upload Proof
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Under Review</CardTitle>
                <CardDescription>Payments submitted for admin verification</CardDescription>
              </CardHeader>
              <CardContent>
                {awaitingReviewRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payments under review</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Proof</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {awaitingReviewRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{new Date(record.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="max-w-xs">{record.description}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(record.amount_due, record.currency)}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            {record.payment_proofs && record.payment_proofs.length > 0 && (
                              <Badge variant="secondary">
                                {record.payment_proofs[0].status}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paid" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paid</CardTitle>
                <CardDescription>Successfully verified payments</CardDescription>
              </CardHeader>
              <CardContent>
                {paidRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No paid records yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date Paid</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {record.paid_at ? new Date(record.paid_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="max-w-xs">{record.description}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(record.amount_due, record.currency)}</TableCell>
                          <TableCell>
                            {record.invoice?.pdf_url ? (
                              <Button size="sm" variant="outline" asChild>
                                <a href={record.invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                                  <FileText className="w-4 h-4 mr-1" />
                                  View Invoice
                                </a>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedRecord && (
        <PaymentInstructionsDialog
          open={showInstructionsDialog}
          onOpenChange={setShowInstructionsDialog}
          incomeRecord={selectedRecord}
        />
      )}
    </MainLayout>
  );
}
