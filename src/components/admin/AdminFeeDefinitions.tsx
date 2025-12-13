import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Plus, Percent, DollarSign, AlertTriangle, Loader2, RefreshCw, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FeeDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  fee_type: string;
  percentage_rate: number | null;
  fixed_amount: number | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FeeFormData {
  code: string;
  name: string;
  description: string;
  fee_type: 'percentage' | 'fixed';
  percentage_rate: string;
  fixed_amount: string;
  currency: string;
  is_active: boolean;
}

const initialFormData: FeeFormData = {
  code: '',
  name: '',
  description: '',
  fee_type: 'fixed',
  percentage_rate: '',
  fixed_amount: '',
  currency: 'TZS',
  is_active: true,
};

export function AdminFeeDefinitions() {
  const { user } = useAuth();
  const [fees, setFees] = useState<FeeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeDefinition | null>(null);
  const [formData, setFormData] = useState<FeeFormData>(initialFormData);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('geoinsight_fee_definitions')
        .select('*')
        .order('code');

      if (error) throw error;
      setFees(data || []);
    } catch (error: any) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to load fee definitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async (feeId: string) => {
    const { count, error } = await supabase
      .from('geoinsight_income_records')
      .select('*', { count: 'exact', head: true })
      .eq('fee_definition_id', feeId)
      .in('status', ['pending', 'overdue']);

    if (!error) {
      setPendingCount(count || 0);
    }
  };

  const handleOpenCreate = () => {
    setEditingFee(null);
    setFormData(initialFormData);
    setApplyToExisting(false);
    setPendingCount(0);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (fee: FeeDefinition) => {
    setEditingFee(fee);
    setFormData({
      code: fee.code,
      name: fee.name,
      description: fee.description || '',
      fee_type: fee.fee_type as 'percentage' | 'fixed',
      percentage_rate: fee.percentage_rate ? (fee.percentage_rate * 100).toString() : '',
      fixed_amount: fee.fixed_amount?.toString() || '',
      currency: fee.currency || 'TZS',
      is_active: fee.is_active,
    });
    setApplyToExisting(false);
    await fetchPendingCount(fee.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validate
    if (!formData.code || !formData.name) {
      toast.error('Code and Name are required');
      return;
    }

    if (formData.fee_type === 'percentage' && !formData.percentage_rate) {
      toast.error('Percentage rate is required for percentage fees');
      return;
    }

    if (formData.fee_type === 'fixed' && !formData.fixed_amount) {
      toast.error('Fixed amount is required for fixed fees');
      return;
    }

    // If editing and rate/amount changed, show confirmation
    if (editingFee && pendingCount > 0) {
      const oldRate = editingFee.percentage_rate;
      const oldAmount = editingFee.fixed_amount;
      const newRate = formData.fee_type === 'percentage' ? parseFloat(formData.percentage_rate) / 100 : null;
      const newAmount = formData.fee_type === 'fixed' ? parseFloat(formData.fixed_amount) : null;

      if (oldRate !== newRate || oldAmount !== newAmount) {
        setConfirmDialogOpen(true);
        return;
      }
    }

    await saveFee();
  };

  const saveFee = async () => {
    try {
      setSaving(true);

      const feeData = {
        code: formData.code.toUpperCase().replace(/\s+/g, '_'),
        name: formData.name,
        description: formData.description || null,
        fee_type: formData.fee_type,
        percentage_rate: formData.fee_type === 'percentage' 
          ? parseFloat(formData.percentage_rate) / 100 
          : null,
        fixed_amount: formData.fee_type === 'fixed' 
          ? parseFloat(formData.fixed_amount) 
          : null,
        currency: formData.currency,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingFee) {
        // Update existing
        const { error } = await supabase
          .from('geoinsight_fee_definitions')
          .update(feeData)
          .eq('id', editingFee.id);

        if (error) throw error;

        // If apply to existing pending records
        if (applyToExisting && pendingCount > 0) {
          await updatePendingRecords(editingFee.id, feeData);
        }

        toast.success('Fee definition updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('geoinsight_fee_definitions')
          .insert(feeData);

        if (error) throw error;
        toast.success('Fee definition created successfully');
      }

      setDialogOpen(false);
      setConfirmDialogOpen(false);
      fetchFees();
    } catch (error: any) {
      console.error('Error saving fee:', error);
      toast.error(error.message || 'Failed to save fee definition');
    } finally {
      setSaving(false);
    }
  };

  const updatePendingRecords = async (feeId: string, feeData: any) => {
    try {
      // Fetch all pending records for this fee
      const { data: records, error: fetchError } = await supabase
        .from('geoinsight_income_records')
        .select('id, related_listing_id')
        .eq('fee_definition_id', feeId)
        .in('status', ['pending', 'overdue']);

      if (fetchError) throw fetchError;

      if (!records || records.length === 0) return;

      // For percentage fees, we need to recalculate based on listing price
      if (feeData.fee_type === 'percentage' && feeData.percentage_rate) {
        // Fetch listings to get prices
        const listingIds = records
          .filter(r => r.related_listing_id)
          .map(r => r.related_listing_id);

        if (listingIds.length > 0) {
          const { data: listings } = await supabase
            .from('listings')
            .select('id, price')
            .in('id', listingIds);

          const listingPrices = new Map(listings?.map(l => [l.id, l.price]) || []);

          // Update each record with new amount
          for (const record of records) {
            const listingPrice = record.related_listing_id 
              ? listingPrices.get(record.related_listing_id) 
              : null;

            if (listingPrice) {
              const newAmount = listingPrice * feeData.percentage_rate;
              await supabase
                .from('geoinsight_income_records')
                .update({ 
                  amount_due: newAmount,
                  admin_notes: `Amount recalculated on ${new Date().toLocaleDateString()} due to fee rate change`,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', record.id);
            }
          }
        }
      } else if (feeData.fee_type === 'fixed' && feeData.fixed_amount) {
        // For fixed fees, update all records with new amount
        const { error: updateError } = await supabase
          .from('geoinsight_income_records')
          .update({ 
            amount_due: feeData.fixed_amount,
            admin_notes: `Amount updated on ${new Date().toLocaleDateString()} due to fee change`,
            updated_at: new Date().toISOString(),
          })
          .eq('fee_definition_id', feeId)
          .in('status', ['pending', 'overdue']);

        if (updateError) throw updateError;
      }

      toast.success(`Updated ${records.length} pending payment records`);
    } catch (error: any) {
      console.error('Error updating pending records:', error);
      toast.error('Failed to update some pending records');
    }
  };

  const syncPendingRecordsForFee = async (fee: FeeDefinition) => {
    setSaving(true);
    try {
      const feeData = {
        fee_type: fee.fee_type,
        percentage_rate: fee.percentage_rate,
        fixed_amount: fee.fixed_amount,
      };
      await updatePendingRecords(fee.id, feeData);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Fee Definitions</h3>
          <p className="text-sm text-muted-foreground">
            Manage all GeoInsight fees and commissions
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Fee
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rate/Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-mono text-sm">{fee.code}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{fee.name}</p>
                      {fee.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {fee.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={fee.fee_type === 'percentage' ? 'default' : 'secondary'}>
                      {fee.fee_type === 'percentage' ? (
                        <><Percent className="h-3 w-3 mr-1" /> Percentage</>
                      ) : (
                        <><DollarSign className="h-3 w-3 mr-1" /> Fixed</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {fee.fee_type === 'percentage'
                      ? `${((fee.percentage_rate || 0) * 100).toFixed(2)}%`
                      : formatCurrency(fee.fixed_amount || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={fee.is_active ? 'default' : 'outline'}>
                      {fee.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => handleOpenEdit(fee)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => syncPendingRecordsForFee(fee)}
                          disabled={saving}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Pending Records
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFee ? 'Edit Fee Definition' : 'Create Fee Definition'}
            </DialogTitle>
            <DialogDescription>
              {editingFee
                ? 'Update the fee configuration. Changes will apply to new records.'
                : 'Define a new fee type for GeoInsight income tracking.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., LISTING_FEE"
                  disabled={!!editingFee}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TZS">TZS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Listing Publication Fee"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when this fee is applied..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Fee Type *</Label>
              <Select
                value={formData.fee_type}
                onValueChange={(v: 'percentage' | 'fixed') =>
                  setFormData({ ...formData, fee_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Percentage of transaction
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Fixed amount
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.fee_type === 'percentage' ? (
              <div className="space-y-2">
                <Label htmlFor="percentage_rate">Percentage Rate (%) *</Label>
                <Input
                  id="percentage_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.percentage_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, percentage_rate: e.target.value })
                  }
                  placeholder="e.g., 2 for 2%"
                />
                <p className="text-xs text-muted-foreground">
                  Enter as percentage (e.g., 2 for 2%, 0.1 for 0.1%)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fixed_amount">Fixed Amount ({formData.currency}) *</Label>
                <Input
                  id="fixed_amount"
                  type="number"
                  min="0"
                  value={formData.fixed_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, fixed_amount: e.target.value })
                  }
                  placeholder="e.g., 50000"
                />
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive fees won't be used for new records
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            {editingFee && pendingCount > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-3 flex-1">
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          {pendingCount} pending payment(s) exist
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          You can choose to update their amounts with the new rate.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="applyToExisting"
                          checked={applyToExisting}
                          onCheckedChange={(checked) =>
                            setApplyToExisting(checked as boolean)
                          }
                        />
                        <Label
                          htmlFor="applyToExisting"
                          className="text-sm text-amber-800 dark:text-amber-200 cursor-pointer"
                        >
                          Update amounts for existing pending payments
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingFee ? 'Update Fee' : 'Create Fee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for updating existing records */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rate Change</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are changing the rate for this fee. There are{' '}
                <strong>{pendingCount} pending payments</strong> using this fee definition.
              </p>
              {applyToExisting ? (
                <p className="text-amber-600 dark:text-amber-400">
                  These pending payments will be recalculated with the new rate.
                </p>
              ) : (
                <p>
                  Existing pending payments will keep their current amounts. Only new
                  records will use the updated rate.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveFee} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm & Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
