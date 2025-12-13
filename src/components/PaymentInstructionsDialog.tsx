import { useEffect, useState } from 'react';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Building2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { IncomeRecordWithDetails } from '@/types/geoinsight-income';
import { Skeleton } from '@/components/ui/skeleton';

interface PaymentInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeRecord: IncomeRecordWithDetails;
}

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  swift_code: string | null;
  currency: string;
}

interface MobileMoneyAccount {
  id: string;
  provider_name: string;
  account_name: string;
  phone_number: string;
  business_number: string | null;
}

export function PaymentInstructionsDialog({
  open,
  onOpenChange,
  incomeRecord,
}: PaymentInstructionsDialogProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [mobileAccounts, setMobileAccounts] = useState<MobileMoneyAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchPaymentAccounts();
    }
  }, [open]);

  const fetchPaymentAccounts = async () => {
    setLoading(true);
    try {
      const [bankRes, mobileRes] = await Promise.all([
        supabase
          .from('payment_account_settings')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('mobile_money_accounts')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
      ]);

      if (bankRes.error) throw bankRes.error;
      if (mobileRes.error) throw mobileRes.error;

      setBankAccounts(bankRes.data || []);
      setMobileAccounts(mobileRes.data || []);
    } catch (error) {
      console.error('Failed to fetch payment accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Payment Instructions"
      description={`How to pay ${formatCurrency(incomeRecord.amount_due, incomeRecord.currency)} to GeoInsight`}
    >
      <div className="space-y-6">
        {/* Payment Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Due:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(incomeRecord.amount_due, incomeRecord.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span className="text-sm max-w-xs text-right">{incomeRecord.description}</span>
              </div>
              {incomeRecord.due_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span>{new Date(incomeRecord.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Bank Transfer Instructions */}
            {bankAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <h3 className="font-semibold">Bank Transfer</h3>
                </div>
                
                {bankAccounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{account.bank_name}</span>
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

            {/* Mobile Money Instructions */}
            {mobileAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  <h3 className="font-semibold">Mobile Money</h3>
                </div>

                <div className="grid gap-3">
                  {mobileAccounts.map((account) => (
                    <Card key={account.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{account.provider_name}</p>
                            {account.business_number && (
                              <p className="text-sm text-muted-foreground">
                                Lipa Number: {account.business_number}
                              </p>
                            )}
                            <p className="text-sm">{account.account_name}</p>
                            <p className="text-sm font-mono">{account.phone_number}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(account.phone_number, `${account.provider_name} number`)}
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

            {bankAccounts.length === 0 && mobileAccounts.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No payment accounts configured. Please contact support.
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Important Notes */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>After making payment, upload your proof immediately</li>
                <li>Include transaction reference/receipt number</li>
                <li>Take a clear screenshot or photo of the receipt</li>
                <li>You can also paste the SMS confirmation message</li>
                <li>Admin will review and confirm within 24-48 hours</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveModal>
  );
}
