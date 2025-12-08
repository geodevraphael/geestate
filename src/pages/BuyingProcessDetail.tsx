import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { 
  CheckCircle2, Circle, ArrowLeft, Calendar, FileCheck, Search, 
  FileText, CreditCard, Key, MapPin, User, X, ExternalLink,
  Scale, Ruler, Building2, Hammer, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { VisitRequestDialog } from '@/components/VisitRequestDialog';
import { PaymentProofDialog } from '@/components/PaymentProofDialog';
import { useIsMobile } from '@/hooks/use-mobile';

// Map step IDs to required service provider types
const STEP_SERVICE_PROVIDERS: Record<number, { type: string; label: string; icon: any }[]> = {
  0: [{ type: 'surveyor', label: 'Land Surveyor', icon: MapPin }],
  1: [{ type: 'lawyer', label: 'Lawyer', icon: Scale }],
  2: [{ type: 'lawyer', label: 'Lawyer', icon: Scale }],
  3: [{ type: 'lawyer', label: 'Lawyer', icon: Scale }, { type: 'land_valuer', label: 'Land Valuer', icon: Ruler }],
  4: [],
  5: [{ type: 'lawyer', label: 'Lawyer', icon: Scale }],
};

// Service providers for post-completion construction
const CONSTRUCTION_PROVIDERS = [
  { type: 'architect', label: 'Architect', icon: Pencil, description: 'Design your new building' },
  { type: 'construction_company', label: 'Construction Company', icon: Building2, description: 'Build your project' },
  { type: 'contractor', label: 'Contractor', icon: Hammer, description: 'Hire skilled contractors' },
  { type: 'surveyor', label: 'Land Surveyor', icon: MapPin, description: 'Survey your land' },
  { type: 'land_valuer', label: 'Land Valuer', icon: Ruler, description: 'Get property valuation' },
];

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
  const isMobile = useIsMobile();
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
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Buying process not found');
        navigate('/deals');
        return;
      }
      
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

  const renderStepDetails = (stepId: number) => {
    if (!processData) return null;

    // Field Visit details
    if (stepId === 0 && processData.visit_completed) {
      return (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Completed:</span>
              <p className="font-medium">{new Date(processData.visit_completed_at).toLocaleDateString()}</p>
            </div>
          </div>
          {processData.visit_notes && (
            <div>
              <span className="text-muted-foreground">Visit Notes:</span>
              <p className="mt-1 whitespace-pre-wrap">{processData.visit_notes}</p>
            </div>
          )}
        </div>
      );
    }

    // Title Verification details
    if (stepId === 1 && processData.title_verification_completed) {
      return (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Title Deed Number:</span>
              <p className="font-medium">{processData.title_deed_number}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Registry Office:</span>
              <p className="font-medium">{processData.title_registry_office}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Verification Date:</span>
              <p className="font-medium">{processData.title_verification_date ? new Date(processData.title_verification_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Completed:</span>
              <p className="font-medium">{new Date(processData.title_verification_completed_at).toLocaleDateString()}</p>
            </div>
          </div>
          {processData.title_verification_notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1 whitespace-pre-wrap">{processData.title_verification_notes}</p>
            </div>
          )}
        </div>
      );
    }

    // Registry Search details
    if (stepId === 2 && processData.registry_search_completed) {
      return (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Search Date:</span>
              <p className="font-medium">{processData.registry_search_date ? new Date(processData.registry_search_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Encumbrance Status:</span>
              <p className="font-medium">{processData.encumbrance_status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Completed:</span>
              <p className="font-medium">{new Date(processData.registry_search_completed_at).toLocaleDateString()}</p>
            </div>
          </div>
          {processData.registry_search_findings && (
            <div>
              <span className="text-muted-foreground">Findings:</span>
              <p className="mt-1 whitespace-pre-wrap">{processData.registry_search_findings}</p>
            </div>
          )}
        </div>
      );
    }

    // Sale Agreement details
    if (stepId === 3 && processData.sale_agreement_completed) {
      return (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Lawyer Name:</span>
              <p className="font-medium">{processData.lawyer_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Lawyer Contact:</span>
              <p className="font-medium">{processData.lawyer_contact}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Agreement Date:</span>
              <p className="font-medium">{processData.agreement_date ? new Date(processData.agreement_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Completed:</span>
              <p className="font-medium">{new Date(processData.sale_agreement_completed_at).toLocaleDateString()}</p>
            </div>
          </div>
          {processData.agreement_notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1 whitespace-pre-wrap">{processData.agreement_notes}</p>
            </div>
          )}
        </div>
      );
    }

    // Payment details
    if (stepId === 4 && processData.payment_completed) {
      return (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Payment Method:</span>
              <p className="font-medium">{processData.payment_method}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Payment Reference:</span>
              <p className="font-medium">{processData.payment_reference}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Payment Date:</span>
              <p className="font-medium">{processData.payment_date ? new Date(processData.payment_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Completed:</span>
              <p className="font-medium">{new Date(processData.payment_completed_at).toLocaleDateString()}</p>
            </div>
          </div>
          {processData.payment_notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1 whitespace-pre-wrap">{processData.payment_notes}</p>
            </div>
          )}
        </div>
      );
    }

    // Transfer details
    if (stepId === 5 && processData.transfer_completed) {
      return (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Transfer Date:</span>
              <p className="font-medium">{processData.transfer_date ? new Date(processData.transfer_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">New Title Deed Number:</span>
              <p className="font-medium">{processData.new_title_deed_number}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Final Completion:</span>
              <p className="font-medium">{processData.final_completion_date ? new Date(processData.final_completion_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Completed:</span>
              <p className="font-medium">{new Date(processData.transfer_completed_at).toLocaleDateString()}</p>
            </div>
          </div>
          {processData.transfer_notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1 whitespace-pre-wrap">{processData.transfer_notes}</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Helper function to render service provider links for a step
  const renderServiceProviderLinks = (stepId: number) => {
    const providers = STEP_SERVICE_PROVIDERS[stepId];
    if (!providers || providers.length === 0) return null;

    return (
      <div className="p-3 border rounded-lg bg-primary/5 border-primary/20 mb-4">
        <p className="text-sm font-medium text-foreground mb-2">Need professional help?</p>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => {
            const Icon = provider.icon;
            return (
              <Link 
                key={provider.type}
                to={`/service-providers?type=${provider.type}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Icon className="h-3 w-3" />
                {provider.label}
                <ExternalLink className="h-3 w-3" />
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStepForm = (stepId: number) => {
    // For Field Visit (step 0) - integrate with visit requests
    if (stepId === 0) {
      const approvedVisit = visitRequests.find(v => v.status === 'accepted');
      
      return (
        <div className="space-y-4">
          {renderServiceProviderLinks(stepId)}
          
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
          {renderServiceProviderLinks(stepId)}
          
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
          {renderServiceProviderLinks(stepId)}
          
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
          {renderServiceProviderLinks(stepId)}
          
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
          {renderServiceProviderLinks(stepId)}
          
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

  if (!processData || !processData.listing) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-bold mb-2">Process Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The buying process you're looking for doesn't exist or the associated listing is no longer available
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
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Link to="/deals">
            <Button variant="outline" size="sm" className="touch-feedback">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Deals
            </Button>
          </Link>
          {processData.process_status === 'in_progress' && (
            <Button variant="destructive" size="sm" onClick={() => setShowCancelDialog(true)} className="touch-feedback">
              <X className="mr-2 h-4 w-4" />
              Cancel Process
            </Button>
          )}
        </div>

        {/* Property Info Card */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold mb-2 line-clamp-2">{processData.listing.title}</h1>
                    <div className="flex items-center gap-2 text-sm md:text-base text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-1">{processData.listing.location_label}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={processData.process_status === 'completed' ? 'default' : 'secondary'}
                    className="capitalize whitespace-nowrap text-xs"
                  >
                    {processData.process_status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="line-clamp-1">Seller: {processData.seller.organization_name || processData.seller.full_name}</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-muted-foreground">
                    Started {new Date(processData.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="w-full sm:w-auto sm:text-right">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-2">
                  {processData.listing.price?.toLocaleString()} {processData.listing.currency}
                </div>
                <Link to={`/listings/${processData.listing_id}`} className="block sm:inline-block">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto touch-feedback">
                    View Listing
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-4 md:mt-6">
              <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground mb-2">
                <span>{completedSteps} of {steps.length} steps completed</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 md:h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Process Steps */}
        <div className="space-y-3 md:space-y-4">
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;
            
            return (
              <Card key={step.id} className={`mobile-card ${status === 'current' ? 'border-primary shadow-md' : ''}`}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-7 w-7 md:h-8 md:w-8 text-success" />
                      ) : status === 'current' ? (
                        <Circle className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                      ) : (
                        <Circle className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 md:gap-3 mb-2">
                        <StepIcon className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                        <h3 className="text-lg md:text-xl font-semibold">{step.name}</h3>
                      </div>
                      <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">{step.description}</p>
                      
                      {status === 'completed' && (
                        <>
                          <Badge variant="outline" className="text-success border-success text-xs mb-2">
                            Completed
                          </Badge>
                          {renderStepDetails(step.id)}
                        </>
                      )}
                    </div>

                    {status === 'current' && processData.process_status === 'in_progress' && (
                      <Button 
                        onClick={() => setCurrentStepDialog(step.id)} 
                        size="sm"
                        className="touch-feedback whitespace-nowrap text-sm h-10"
                      >
                        Complete Step
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Post-Completion: Construction Services Section */}
        {processData.process_status === 'completed' && (
          <Card className="mt-6 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-primary" />
                Ready to Build?
              </CardTitle>
              <CardDescription>
                Congratulations on your property purchase! Connect with professional service providers to start your construction project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CONSTRUCTION_PROVIDERS.map((provider) => {
                  const Icon = provider.icon;
                  return (
                    <Link
                      key={provider.type}
                      to={`/service-providers?type=${provider.type}`}
                      className="flex items-start gap-3 p-4 rounded-xl border bg-background hover:border-primary hover:shadow-md transition-all group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{provider.label}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Completion Dialog */}
        <ResponsiveModal
          open={currentStepDialog !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCurrentStepDialog(null);
              setStepFormData({});
            }
          }}
          title={currentStepDialog !== null ? `Complete ${steps[currentStepDialog].name}` : ''}
        >
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
                className="flex-1 touch-feedback h-11 md:h-10"
                onClick={() => {
                  setCurrentStepDialog(null);
                  setStepFormData({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 touch-feedback h-11 md:h-10">
                Complete Step
              </Button>
            </div>
          </form>
        </ResponsiveModal>

        {/* Cancel Confirmation Dialog */}
        <Sheet open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "rounded-t-3xl" : ""}>
            <SheetHeader>
              <SheetTitle>Cancel Buying Process?</SheetTitle>
              <SheetDescription>
                Are you sure you want to cancel this buying process? This action cannot be undone.
              </SheetDescription>
            </SheetHeader>
            <SheetFooter className="mt-6 flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                className="w-full touch-feedback h-11 md:h-10"
              >
                No, Keep It
              </Button>
              <Button
                onClick={cancelProcess}
                className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-feedback h-11 md:h-10"
              >
                Yes, Cancel Process
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
}
