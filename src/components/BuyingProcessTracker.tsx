import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Circle, ShoppingBag, FileCheck, Search, FileText, CreditCard, Key } from 'lucide-react';
import { toast } from 'sonner';

interface BuyingProcessTrackerProps {
  listingId: string;
  sellerId: string;
  approvedVisitRequestId?: string;
}

interface ProcessData {
  id?: string;
  current_step: number;
  process_status: string;
  visit_completed: boolean;
  visit_notes?: string;
  title_verification_completed: boolean;
  title_deed_number?: string;
  title_registry_office?: string;
  title_verification_date?: string;
  title_verification_notes?: string;
  registry_search_completed: boolean;
  registry_search_date?: string;
  encumbrance_status?: string;
  registry_search_findings?: string;
  sale_agreement_completed: boolean;
  lawyer_name?: string;
  lawyer_contact?: string;
  agreement_date?: string;
  agreement_notes?: string;
  payment_completed: boolean;
  payment_method?: string;
  payment_reference?: string;
  payment_date?: string;
  payment_notes?: string;
  transfer_completed: boolean;
  transfer_date?: string;
  new_title_deed_number?: string;
  final_completion_date?: string;
  transfer_notes?: string;
}

const steps = [
  { id: 0, name: 'Field Visit', icon: ShoppingBag, description: 'Visit and inspect the property' },
  { id: 1, name: 'Title Verification', icon: FileCheck, description: 'Verify ownership documents' },
  { id: 2, name: 'Registry Search', icon: Search, description: 'Conduct land registry search' },
  { id: 3, name: 'Sale Agreement', icon: FileText, description: 'Prepare and sign agreement' },
  { id: 4, name: 'Payment', icon: CreditCard, description: 'Arrange payment' },
  { id: 5, name: 'Transfer', icon: Key, description: 'Complete ownership transfer' },
];

export function BuyingProcessTracker({ listingId, sellerId, approvedVisitRequestId }: BuyingProcessTrackerProps) {
  const { user } = useAuth();
  const [processData, setProcessData] = useState<ProcessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepDialog, setCurrentStepDialog] = useState<number | null>(null);
  const [stepFormData, setStepFormData] = useState<any>({});

  useEffect(() => {
    if (user?.id) {
      fetchProcessData();
    }
  }, [user?.id, listingId]);

  const fetchProcessData = async () => {
    try {
      const { data, error } = await supabase
        .from('buying_process_tracker')
        .select('*')
        .eq('listing_id', listingId)
        .eq('buyer_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setProcessData(data);
    } catch (error) {
      console.error('Error fetching process data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startBuyingProcess = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('buying_process_tracker')
        .insert({
          buyer_id: user.id,
          listing_id: listingId,
          seller_id: sellerId,
          visit_request_id: approvedVisitRequestId || null,
          current_step: 0,
          process_status: 'in_progress',
        })
        .select()
        .single();

      if (error) throw error;
      setProcessData(data);
      toast.success('Buying process started!');
    } catch (error) {
      console.error('Error starting process:', error);
      toast.error('Failed to start buying process');
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
    switch (stepId) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label>Visit Notes</Label>
              <Textarea
                placeholder="Record your observations from the site visit..."
                value={stepFormData.notes || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        );
      case 1:
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
                placeholder="Enter registry office location"
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
                placeholder="Additional verification notes..."
                value={stepFormData.notes || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        );
      case 2:
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
                placeholder="e.g., Clear, Encumbered, etc."
                value={stepFormData.encumbranceStatus || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, encumbranceStatus: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Findings</Label>
              <Textarea
                placeholder="Record search findings..."
                value={stepFormData.findings || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, findings: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Lawyer Name*</Label>
              <Input
                placeholder="Enter lawyer's name"
                value={stepFormData.lawyerName || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, lawyerName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Lawyer Contact</Label>
              <Input
                placeholder="Phone or email"
                value={stepFormData.lawyerContact || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, lawyerContact: e.target.value })}
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
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label>Payment Method*</Label>
              <Input
                placeholder="e.g., Bank transfer, Cash"
                value={stepFormData.paymentMethod || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, paymentMethod: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input
                placeholder="Transaction reference"
                value={stepFormData.paymentReference || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, paymentReference: e.target.value })}
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
      case 5:
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
              <Label>New Title Deed Number</Label>
              <Input
                placeholder="New deed number after transfer"
                value={stepFormData.newDeedNumber || ''}
                onChange={(e) => setStepFormData({ ...stepFormData, newDeedNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Completion Date*</Label>
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
      default:
        return null;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!processData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start Your Buying Process</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Track your property purchase journey step-by-step. Record important details and never miss a milestone.
          </p>
          <Button onClick={startBuyingProcess} className="w-full">
            Start Buying Process
          </Button>
        </CardContent>
      </Card>
    );
  }

  const completedSteps = steps.filter(step => getStepStatus(step.id) === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Buying Process Tracker</CardTitle>
          <Badge variant={processData.process_status === 'completed' ? 'default' : 'secondary'}>
            {processData.process_status === 'completed' ? 'Completed' : 'In Progress'}
          </Badge>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{completedSteps} of {steps.length} steps completed</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;
            
            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-lg border ${
                  status === 'current' ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  ) : status === 'current' ? (
                    <Circle className="h-6 w-6 text-primary" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StepIcon className="h-4 w-4" />
                    <h3 className="font-semibold">{step.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {status === 'current' && (
                  <>
                    <Button size="sm" onClick={() => setCurrentStepDialog(step.id)}>
                      Mark Complete
                    </Button>
                    <ResponsiveModal
                      open={currentStepDialog === step.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setCurrentStepDialog(null);
                          setStepFormData({});
                        }
                      }}
                      title={`Complete ${step.name}`}
                      description={step.description}
                    >
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        completeStep(step.id, stepFormData);
                      }}>
                        {renderStepForm(step.id)}
                        <div className="flex gap-2 mt-6">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-11 touch-feedback"
                            onClick={() => {
                              setCurrentStepDialog(null);
                              setStepFormData({});
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1 h-11 touch-feedback">
                            Complete Step
                          </Button>
                        </div>
                      </form>
                    </ResponsiveModal>
                  </>
                )}
                {status === 'completed' && (
                  <Badge variant="outline" className="text-success border-success">
                    Done
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}