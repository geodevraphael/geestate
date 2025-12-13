import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Loader2, FileText, CheckCircle, Image } from 'lucide-react';
import { toast } from 'sonner';
import { IncomeRecordWithDetails, PaymentChannel } from '@/types/geoinsight-income';

const PAYMENT_CHANNELS: { value: PaymentChannel; label: string }[] = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'tigo_pesa', label: 'Tigo Pesa' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'nmb', label: 'NMB Bank' },
  { value: 'crdb', label: 'CRDB Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export default function UploadPaymentProof() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [incomeRecord, setIncomeRecord] = useState<IncomeRecordWithDetails | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    payment_channel: '' as PaymentChannel,
    transaction_reference: '',
    amount_paid: '',
    proof_text: '',
  });

  useEffect(() => {
    if (recordId && user) {
      fetchIncomeRecord();
    }
  }, [recordId, user]);

  const fetchIncomeRecord = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('geoinsight_income_records')
        .select(`
          *,
          fee_definition:geoinsight_fee_definitions(*),
          listing:listings(id, title)
        `)
        .eq('id', recordId)
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;

      setIncomeRecord(data as any);
      setFormData(prev => ({
        ...prev,
        amount_paid: data.amount_due.toString(),
      }));
    } catch (error: any) {
      console.error('Error fetching income record:', error);
      toast.error('Failed to load payment record');
      navigate('/geoinsight-payments');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incomeRecord) return;
    
    if (!formData.payment_channel) {
      toast.error('Please select a payment channel');
      return;
    }

    if (!selectedFile && !formData.proof_text) {
      toast.error('Please upload a proof file or provide SMS/bank text');
      return;
    }

    try {
      setSubmitting(true);
      
      let proofFileUrl = null;
      
      // Upload file if provided
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${incomeRecord.user_id}/${incomeRecord.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('geoinsight-proofs')
          .upload(fileName, selectedFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('geoinsight-proofs')
          .getPublicUrl(fileName);
        
        proofFileUrl = publicUrl;
      }

      // Create payment proof record
      const { error: insertError } = await supabase
        .from('geoinsight_payment_proofs')
        .insert({
          income_record_id: incomeRecord.id,
          payer_id: incomeRecord.user_id,
          proof_file_url: proofFileUrl,
          proof_text: formData.proof_text || null,
          payment_channel: formData.payment_channel,
          transaction_reference: formData.transaction_reference || null,
          amount_paid: parseFloat(formData.amount_paid),
          status: 'submitted',
        });

      if (insertError) throw insertError;

      // Update income record status
      const { error: updateError } = await supabase
        .from('geoinsight_income_records')
        .update({ status: 'awaiting_review' })
        .eq('id', incomeRecord.id);

      if (updateError) throw updateError;

      toast.success('Payment proof submitted successfully!');
      navigate('/geoinsight-payments');
    } catch (error: any) {
      console.error('Error uploading payment proof:', error);
      toast.error(error.message || 'Failed to upload payment proof');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!incomeRecord) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <p className="text-muted-foreground">Payment record not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/geoinsight-payments')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Upload Payment Proof</h1>
            <p className="text-muted-foreground">
              Submit proof of payment for verification
            </p>
          </div>
        </div>

        {/* Payment Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description</span>
              <span className="font-medium text-right max-w-[60%]">{incomeRecord.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Due</span>
              <span className="font-bold text-lg text-primary">
                {formatCurrency(incomeRecord.amount_due, incomeRecord.currency)}
              </span>
            </div>
            {incomeRecord.listing && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Related Listing</span>
                <span className="font-medium">{incomeRecord.listing.title}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Information</CardTitle>
            <CardDescription>
              Fill in the details and upload your payment proof
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="payment_channel">Payment Channel *</Label>
                <Select
                  value={formData.payment_channel}
                  onValueChange={(value) => setFormData({ ...formData, payment_channel: value as PaymentChannel })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_CHANNELS.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount_paid">Amount Paid</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_reference">Transaction Reference / Receipt Number</Label>
                <Input
                  id="transaction_reference"
                  value={formData.transaction_reference}
                  onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
                  placeholder="e.g., ABC123456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof_file">Upload Screenshot / Photo / PDF *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <Input
                    id="proof_file"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label 
                    htmlFor="proof_file" 
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {previewUrl ? (
                      <div className="relative">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="max-h-48 rounded-lg object-contain"
                        />
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      </div>
                    ) : selectedFile ? (
                      <div className="flex items-center gap-2 text-primary">
                        <FileText className="h-12 w-12" />
                        <div className="text-left">
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Image className="h-12 w-12 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, PDF up to 10MB
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof_text">SMS / Bank Text (Optional)</Label>
                <Textarea
                  id="proof_text"
                  value={formData.proof_text}
                  onChange={(e) => setFormData({ ...formData, proof_text: e.target.value })}
                  placeholder="Paste SMS confirmation or bank message here..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  You can paste mobile money SMS or bank confirmation message
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/geoinsight-payments')}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Proof
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
