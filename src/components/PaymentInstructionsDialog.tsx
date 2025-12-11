import { ResponsiveModal } from '@/components/ResponsiveModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Building2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { IncomeRecordWithDetails } from '@/types/geoinsight-income';

interface PaymentInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeRecord: IncomeRecordWithDetails;
}

// Payment account details (hard-coded or could be from settings table)
const PAYMENT_ACCOUNTS = {
  bank: {
    name: 'GeoInsight Tanzania Ltd',
    accounts: [
      {
        bank: 'CRDB Bank',
        accountNumber: '0150123456789',
        swiftCode: 'CORUTZTZ',
      },
      {
        bank: 'NMB Bank',
        accountNumber: '20110123456',
        swiftCode: 'NLCBTZTX',
      },
    ],
  },
  mobileMoney: {
    mpesa: {
      name: 'M-Pesa',
      number: '+255 754 123 456',
      businessNumber: '123456',
    },
    tigoPesa: {
      name: 'Tigo Pesa',
      number: '+255 714 123 456',
    },
    airtelMoney: {
      name: 'Airtel Money',
      number: '+255 784 123 456',
    },
  },
};

export function PaymentInstructionsDialog({
  open,
  onOpenChange,
  incomeRecord,
}: PaymentInstructionsDialogProps) {
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

        {/* Bank Transfer Instructions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <h3 className="font-semibold">Bank Transfer</h3>
          </div>
          
          {PAYMENT_ACCOUNTS.bank.accounts.map((account, index) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{account.bank}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Account Name:</span>
                    <div className="flex items-center gap-2">
                      <span>{PAYMENT_ACCOUNTS.bank.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(PAYMENT_ACCOUNTS.bank.name, 'Account name')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Account Number:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{account.accountNumber}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(account.accountNumber, 'Account number')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">SWIFT Code:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{account.swiftCode}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(account.swiftCode, 'SWIFT code')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile Money Instructions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            <h3 className="font-semibold">Mobile Money</h3>
          </div>

          <div className="grid gap-3">
            {/* M-Pesa */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{PAYMENT_ACCOUNTS.mobileMoney.mpesa.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Business: {PAYMENT_ACCOUNTS.mobileMoney.mpesa.businessNumber}
                    </p>
                    <p className="text-sm">{PAYMENT_ACCOUNTS.mobileMoney.mpesa.number}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(
                      PAYMENT_ACCOUNTS.mobileMoney.mpesa.number,
                      'M-Pesa number'
                    )}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tigo Pesa */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{PAYMENT_ACCOUNTS.mobileMoney.tigoPesa.name}</p>
                    <p className="text-sm">{PAYMENT_ACCOUNTS.mobileMoney.tigoPesa.number}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(
                      PAYMENT_ACCOUNTS.mobileMoney.tigoPesa.number,
                      'Tigo Pesa number'
                    )}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Airtel Money */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{PAYMENT_ACCOUNTS.mobileMoney.airtelMoney.name}</p>
                    <p className="text-sm">{PAYMENT_ACCOUNTS.mobileMoney.airtelMoney.number}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(
                      PAYMENT_ACCOUNTS.mobileMoney.airtelMoney.number,
                      'Airtel Money number'
                    )}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
