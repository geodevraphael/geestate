import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Building2, Smartphone, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface SellerPaymentInfo {
  id: string;
  payment_type: string;
  provider_name: string | null;
  account_name: string;
  account_number: string;
  swift_code: string | null;
  is_primary: boolean;
}

interface SellerPaymentInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string;
  sellerName?: string;
}

export function SellerPaymentInstructionsDialog({
  open,
  onOpenChange,
  sellerId,
  sellerName,
}: SellerPaymentInstructionsDialogProps) {
  const [paymentInfo, setPaymentInfo] = useState<SellerPaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchPaymentInfo();
    }
  }, [open, sellerId]);

  const fetchPaymentInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('seller_payment_info')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setPaymentInfo(data || []);
    } catch (error) {
      console.error('Failed to fetch seller payment info:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const bankAccounts = paymentInfo.filter(p => p.payment_type === 'bank');
  const mobileAccounts = paymentInfo.filter(p => p.payment_type === 'mobile_money');

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Seller Payment Instructions"
      description={sellerName ? `How to pay ${sellerName}` : 'Payment details for the seller'}
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : paymentInfo.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              The seller has not added payment information yet. Please contact them directly.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Bank Accounts */}
            {bankAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <h3 className="font-semibold">Bank Transfer</h3>
                </div>
                
                {bankAccounts.map((account) => (
                  <Card key={account.id} className={account.is_primary ? 'border-primary' : ''}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{account.provider_name}</span>
                        {account.is_primary && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Preferred
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Account Name:</span>
                          <div className="flex items-center gap-2">
                            <span>{account.account_name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(account.account_name, 'Account name')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Account Number:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{account.account_number}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(account.account_number, 'Account number')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {account.swift_code && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">SWIFT Code:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{account.swift_code}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(account.swift_code!, 'SWIFT code')}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Mobile Money */}
            {mobileAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  <h3 className="font-semibold">Mobile Money</h3>
                </div>

                <div className="grid gap-3">
                  {mobileAccounts.map((account) => (
                    <Card key={account.id} className={account.is_primary ? 'border-primary' : ''}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{account.provider_name}</p>
                              {account.is_primary && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  Preferred
                                </span>
                              )}
                            </div>
                            <p className="text-sm">{account.account_name}</p>
                            <p className="text-sm font-mono">{account.account_number}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(account.account_number, `${account.provider_name} number`)}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Important Notes */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Always verify payment details with the seller before sending money</li>
                <li>Keep a record/screenshot of your payment</li>
                <li>Upload your payment proof on this platform after making payment</li>
                <li>Never share your PIN or passwords with anyone</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveModal>
  );
}
