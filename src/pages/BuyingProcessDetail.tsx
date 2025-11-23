import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle2, Circle, ArrowLeft, Calendar, FileCheck, Search, FileText, CreditCard, Key, MapPin, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { VisitRequestDialog } from '@/components/VisitRequestDialog';
import { PaymentProofDialog } from '@/components/PaymentProofDialog';

const steps = [
  { id: 0, name: 'Field Visit', icon: Calendar, description: 'Visit and inspect the property' },
  { id: 1, name: 'Title Verification', icon: FileCheck, description: 'Verify ownership documents' },
  { id: 2, name: 'Registry Search', icon: Search, description: 'Conduct land registry search' },
  { id: 3, name: 'Sale Agreement', icon: FileText, description: 'Prepare and sign agreement' },
  { id: 4, name: 'Payment', icon: CreditCard, description: 'Arrange payment' },
  { id: 5, name: 'Transfer', icon: Key, description: 'Complete ownership transfer' },
];

export default function BuyingProcessDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processData, setProcessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepDialog, setCurrentStepDialog] = useState<number | null>(null);
  const [stepFormData, setStepFormData] = useState<any>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [visitRequests, setVisitRequests] = useState<any[]>([]);
  const [paymentProofs, setPaymentProofs] = useState<any[]>([]);

  useEffect(() => {
    if (id && user?.id) {
      fetchProcessData();
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (processData?.listing_id) {
      fetchVisitRequests();
      fetchPaymentProofs();
    }
  }, [processData?.listing_id]);

  const fetchProcessData = async () => {
    try {
      const { data, error } = await supabase
        .from('buying_process_tracker')
        .select(`
          *,
          listing:listings(*),
          seller:profiles!buying_process_tracker_seller_id_fkey(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Check if user is the buyer
      if (data.buyer_id !== user?.id) {
        toast.error('Unauthorized access');
        navigate('/deals');
        return;
      }
      
      setProcessData(data);
    } catch (error) {
      console.error('Error fetching process:', error);
      toast.error('Failed to load buying process');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitRequests = async () => {
    if (!processData?.listing_id) return;
    
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('listing_id', processData.listing_id)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVisitRequests(data || []);
    } catch (error) {
      console.error('Error fetching visit requests:', error);
    }
  };

  const fetchPaymentProofs = async () => {
    if (!processData?.listing_id) return;
    
    try {
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('listing_id', processData.listing_id)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentProofs(data || []);
    } catch (error) {
      console.error('Error fetching payment proofs:', error);
    }
  };

  const completeStep = async (stepId: number, stepData: any) => {
    if (!processData?.id) return;

    const stepFields: Record<number, any> = {
      0: {
        visit_completed: true,
        visit_completed_at: new Date().toISOString(),
        visit_notes: stepData.notes,
      },
      1: {
        title_verification_completed: true,
        title_verification_completed_at: new Date().toISOString(),
        title_deed_number: stepData.deedNumber,
        title_registry_office: stepData.registryOffice,
        title_verification_date: stepData.verificationDate,
        title_verification_notes: stepData.notes,
      },
      2: {
        registry_search_completed: true,
        registry_search_completed_at: new Date().toISOString(),
        registry_search_date: stepData.searchDate,
        encumbrance_status: stepData.encumbranceStatus,
        registry_search_findings: stepData.findings,
      },
      3: {
        sale_agreement_completed: true,
        sale_agreement_completed_at: new Date().toISOString(),
        lawyer_name: stepData.lawyerName,
        lawyer_contact: stepData.lawyerContact,
        agreement_date: stepData.agreementDate,
        agreement_notes: stepData.notes,
      },
      4: {
        payment_completed: true,
        payment_completed_at: new Date().toISOString(),
        payment_method: stepData.paymentMethod,
        payment_reference: stepData.paymentReference,
        payment_date: stepData.paymentDate,
        payment_notes: stepData.notes,
      },
      5: {
        transfer_completed: true,
        transfer_completed_at: new Date().toISOString(),
        transfer_date: stepData.transferDate,
        new_title_deed_number: stepData.newDeedNumber,
        final_completion_date: stepData.completionDate,
        transfer_notes: stepData.notes,
      },
    };

    const updateFields = stepFields[stepId];
    const nextStep = stepId + 1;
    const isLastStep = stepId === 5;

    try {
      const { error } = await supabase
        .from('buying_process_tracker')
        .update({
          ...updateFields,
          current_step: isLastStep ? stepId : nextStep,
          process_status: isLastStep ? 'completed' : 'in_progress',
        })
        .eq('id', processData.id);

      if (error) throw error;

      await fetchProcessData();
      setCurrentStepDialog(null);
      setStepFormData({});
      toast.success(`${steps[stepId].name} completed!`);
    } catch (error) {
      console.error('Error completing step:', error);
      toast.error('Failed to complete step');
    }
  };

  const cancelProcess = async () => {
    try {
      const { error } = await supabase
        .from('buying_process_tracker')
        .update({ process_status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Buying process cancelled');
      navigate('/deals');
    } catch (error) {
      console.error('Error cancelling process:', error);
      toast.error('Failed to cancel process');
    }
  };

  const getStepStatus = (stepId: number): 'completed' | 'current' | 'pending' => {
    if (!processData) return 'pending';
    
    const completionFlags: Record<number, boolean> = {
      0: processData.visit_completed,
      1: processData.title_verification_completed,
      2: processData.registry_search_completed,
      3: processData.sale_agreement_completed,
      4: processData.payment_completed,
      5: processData.transfer_completed,
    };

    if (completionFlags[stepId]) return 'completed';
    if (stepId === processData.current_step) return 'current';
    return 'pending';
  };

  const renderStepForm = (stepId: number) => {
    // For Field Visit (step 0) - integrate with visit requests
    if (stepId === 0) {
      const approvedVisit = visitRequests.find(v => v.status === 'accepted');
      
      return (
        <div className="space-y-4">
          {approvedVisit ? (
            <div className="p-4 border rounded-lg bg-success/5 border-success">
              <p className="text-sm font-medium text-success mb-2">✓ Visit Approved</p>
              <p className="text-sm text-muted-foreground">
                Scheduled for {new Date(approvedVisit.requested_date).toLocaleDateString()} at {approvedVisit.requested_time_slot}
              </p>
            </div>
          ) : (
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-3">
                You need to request and complete a field visit first
              </p>
              <VisitRequestDialog 
                listingId={processData.listing_id} 
                sellerId={processData.seller_id} 
              />
            </div>
          )}
          
          <div>
            <Label>Visit Notes*</Label>
            <Textarea
              placeholder="Record your observations from the site visit..."
              value={stepFormData.notes || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, notes: e.target.value })}
              rows={4}
              required
            />
          </div>
        </div>
      );
    }

    // For Title Verification (step 1)
    if (stepId === 1) {
      return (
        <div className="space-y-4">
          <div>
            <Label>Title Deed Number*</Label>
            <Input
              placeholder="Enter deed number"
              value={stepFormData.deedNumber || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, deedNumber: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Registry Office*</Label>
            <Input
              placeholder="Registry office location"
              value={stepFormData.registryOffice || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, registryOffice: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Verification Date*</Label>
            <Input
              type="date"
              value={stepFormData.verificationDate || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, verificationDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Verification findings..."
              value={stepFormData.notes || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      );
    }

    // For Registry Search (step 2)
    if (stepId === 2) {
      return (
        <div className="space-y-4">
          <div>
            <Label>Search Date*</Label>
            <Input
              type="date"
              value={stepFormData.searchDate || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, searchDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Encumbrance Status*</Label>
            <Input
              placeholder="e.g., Clear, Encumbered"
              value={stepFormData.encumbranceStatus || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, encumbranceStatus: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Findings</Label>
            <Textarea
              placeholder="Registry search findings..."
              value={stepFormData.findings || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, findings: e.target.value })}
              rows={4}
            />
          </div>
        </div>
      );
    }

    // For Sale Agreement (step 3)
    if (stepId === 3) {
      return (
        <div className="space-y-4">
          <div>
            <Label>Lawyer Name*</Label>
            <Input
              placeholder="Legal representative"
              value={stepFormData.lawyerName || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, lawyerName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Lawyer Contact*</Label>
            <Input
              placeholder="Phone or email"
              value={stepFormData.lawyerContact || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, lawyerContact: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Agreement Date*</Label>
            <Input
              type="date"
              value={stepFormData.agreementDate || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, agreementDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Agreement details..."
              value={stepFormData.notes || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      );
    }

    // For Payment (step 4) - integrate with payment proofs
    if (stepId === 4) {
      const acceptedPayment = paymentProofs.find(p => p.status === 'admin_validated');
      
      return (
        <div className="space-y-4">
          {acceptedPayment ? (
            <div className="p-4 border rounded-lg bg-success/5 border-success">
              <p className="text-sm font-medium text-success mb-2">✓ Payment Validated</p>
              <p className="text-sm text-muted-foreground">
                Amount: {acceptedPayment.amount_paid.toLocaleString()} {processData.listing.currency}
              </p>
            </div>
          ) : (
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-3">
                Submit and validate payment proof first
              </p>
              <PaymentProofDialog listing={processData.listing} />
            </div>
          )}
          
          <div>
            <Label>Payment Method*</Label>
            <Input
              placeholder="e.g., Bank Transfer, Cash"
              value={stepFormData.paymentMethod || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, paymentMethod: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Payment Reference*</Label>
            <Input
              placeholder="Transaction reference"
              value={stepFormData.paymentReference || acceptedPayment?.transaction_reference || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, paymentReference: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Payment Date*</Label>
            <Input
              type="date"
              value={stepFormData.paymentDate || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, paymentDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Payment details..."
              value={stepFormData.notes || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      );
    }

    // For Transfer (step 5)
    if (stepId === 5) {
      return (
        <div className="space-y-4">
          <div>
            <Label>Transfer Date*</Label>
            <Input
              type="date"
              value={stepFormData.transferDate || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, transferDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>New Title Deed Number*</Label>
            <Input
              placeholder="New deed number after transfer"
              value={stepFormData.newDeedNumber || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, newDeedNumber: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Final Completion Date*</Label>
            <Input
              type="date"
              value={stepFormData.completionDate || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, completionDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Transfer completion notes..."
              value={stepFormData.notes || ''}
              onChange={(e) => setStepFormData({ ...stepFormData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      );
    }

    return <div>Step form for step {stepId}</div>;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!processData) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-bold mb-2">Process Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The buying process you're looking for doesn't exist
              </p>
              <Link to="/deals">
                <Button>Back to Deals</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const completedSteps = steps.filter(step => getStepStatus(step.id) === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/deals">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Deals
            </Button>
          </Link>
          {processData.process_status === 'in_progress' && (
            <Button variant="destructive" size="sm" onClick={() => setShowCancelDialog(true)}>
              <X className="mr-2 h-4 w-4" />
              Cancel Process
            </Button>
          )}
        </div>

        {/* Property Info Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{processData.listing.title}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {processData.listing.location_label}
                    </div>
                  </div>
                  <Badge 
                    variant={processData.process_status === 'completed' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {processData.process_status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Seller: {processData.seller.organization_name || processData.seller.full_name}</span>
                  </div>
                  <span>•</span>
                  <span className="text-muted-foreground">
                    Started {new Date(processData.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-primary mb-2">
                  {processData.listing.price?.toLocaleString()} {processData.listing.currency}
                </div>
                <Link to={`/listings/${processData.listing_id}`}>
                  <Button variant="outline" size="sm">
                    View Listing
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>{completedSteps} of {steps.length} steps completed</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Process Steps */}
        <div className="space-y-4">
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;
            
            return (
              <Card key={step.id} className={status === 'current' ? 'border-primary shadow-md' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-8 w-8 text-success" />
                      ) : status === 'current' ? (
                        <Circle className="h-8 w-8 text-primary" />
                      ) : (
                        <Circle className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <StepIcon className="h-5 w-5" />
                        <h3 className="text-xl font-semibold">{step.name}</h3>
                      </div>
                      <p className="text-muted-foreground mb-4">{step.description}</p>
                      
                      {status === 'completed' && (
                        <Badge variant="outline" className="text-success border-success">
                          Completed
                        </Badge>
                      )}
                    </div>

                    {status === 'current' && processData.process_status === 'in_progress' && (
                      <Button onClick={() => setCurrentStepDialog(step.id)}>
                        Complete Step
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Step Completion Dialog */}
        <Dialog open={currentStepDialog !== null} onOpenChange={(open) => {
          if (!open) {
            setCurrentStepDialog(null);
            setStepFormData({});
          }
        }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Complete {currentStepDialog !== null && steps[currentStepDialog].name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (currentStepDialog !== null) {
                completeStep(currentStepDialog, stepFormData);
              }
            }}>
              {currentStepDialog !== null && renderStepForm(currentStepDialog)}
              <div className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setCurrentStepDialog(null);
                    setStepFormData({});
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Complete Step
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Buying Process?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this buying process? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Keep It</AlertDialogCancel>
              <AlertDialogAction onClick={cancelProcess} className="bg-destructive text-destructive-foreground">
                Yes, Cancel Process
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
