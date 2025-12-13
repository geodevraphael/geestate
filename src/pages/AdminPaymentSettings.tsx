import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Building2, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  swift_code: string | null;
  currency: string;
  instructions: string | null;
  is_active: boolean;
}

interface MobileMoneyAccount {
  id: string;
  provider_name: string;
  account_name: string;
  phone_number: string;
  business_number: string | null;
  is_active: boolean;
}

export default function AdminPaymentSettings() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [mobileAccounts, setMobileAccounts] = useState<MobileMoneyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Bank account dialog
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [bankFormData, setBankFormData] = useState({
    account_name: "",
    account_number: "",
    bank_name: "",
    swift_code: "",
    currency: "TZS",
    instructions: "",
    is_active: true,
  });

  // Mobile money dialog
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);
  const [editingMobile, setEditingMobile] = useState<MobileMoneyAccount | null>(null);
  const [mobileFormData, setMobileFormData] = useState({
    provider_name: "M-Pesa",
    account_name: "",
    phone_number: "",
    business_number: "",
    is_active: true,
  });

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchAccounts();
      fetchMobileAccounts();
    }
  }, [isAdmin]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_account_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  };

  const fetchMobileAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("mobile_money_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMobileAccounts(data || []);
    } catch (error: any) {
      toast.error("Failed to load mobile money accounts");
    }
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAccount) {
        const { error } = await supabase
          .from("payment_account_settings")
          .update(bankFormData)
          .eq("id", editingAccount.id);

        if (error) throw error;
        toast.success("Bank account updated");
      } else {
        const { error } = await supabase
          .from("payment_account_settings")
          .insert([bankFormData]);

        if (error) throw error;
        toast.success("Bank account added");
      }

      setBankDialogOpen(false);
      setEditingAccount(null);
      resetBankForm();
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingMobile) {
        const { error } = await supabase
          .from("mobile_money_accounts")
          .update(mobileFormData)
          .eq("id", editingMobile.id);

        if (error) throw error;
        toast.success("Mobile money account updated");
      } else {
        const { error } = await supabase
          .from("mobile_money_accounts")
          .insert([mobileFormData]);

        if (error) throw error;
        toast.success("Mobile money account added");
      }

      setMobileDialogOpen(false);
      setEditingMobile(null);
      resetMobileForm();
      fetchMobileAccounts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return;

    try {
      const { error } = await supabase
        .from("payment_account_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Bank account deleted");
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteMobile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this mobile money account?")) return;

    try {
      const { error } = await supabase
        .from("mobile_money_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Mobile money account deleted");
      fetchMobileAccounts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetBankForm = () => {
    setBankFormData({
      account_name: "",
      account_number: "",
      bank_name: "",
      swift_code: "",
      currency: "TZS",
      instructions: "",
      is_active: true,
    });
  };

  const resetMobileForm = () => {
    setMobileFormData({
      provider_name: "M-Pesa",
      account_name: "",
      phone_number: "",
      business_number: "",
      is_active: true,
    });
  };

  const openEditBankDialog = (account: PaymentAccount) => {
    setEditingAccount(account);
    setBankFormData({
      account_name: account.account_name,
      account_number: account.account_number,
      bank_name: account.bank_name,
      swift_code: account.swift_code || "",
      currency: account.currency,
      instructions: account.instructions || "",
      is_active: account.is_active,
    });
    setBankDialogOpen(true);
  };

  const openEditMobileDialog = (account: MobileMoneyAccount) => {
    setEditingMobile(account);
    setMobileFormData({
      provider_name: account.provider_name,
      account_name: account.account_name,
      phone_number: account.phone_number,
      business_number: account.business_number || "",
      is_active: account.is_active,
    });
    setMobileDialogOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Payment Account Settings</h1>
          <p className="text-muted-foreground">Manage payment accounts displayed to users</p>
        </div>

        <Tabs defaultValue="bank" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bank" className="gap-2">
              <Building2 className="h-4 w-4" />
              Bank Accounts
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Money
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bank" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { resetBankForm(); setBankDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Bank Account
              </Button>
            </div>

            <div className="grid gap-4">
              {accounts.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No bank accounts configured
                </Card>
              ) : (
                accounts.map((account) => (
                  <Card key={account.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{account.account_name}</h3>
                          {account.is_active && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Active</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                        <p className="font-mono">{account.account_number}</p>
                        {account.swift_code && (
                          <p className="text-sm">SWIFT: {account.swift_code}</p>
                        )}
                        <p className="text-sm font-medium">{account.currency}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditBankDialog(account)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteBank(account.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="mobile" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { resetMobileForm(); setMobileDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Mobile Money
              </Button>
            </div>

            <div className="grid gap-4">
              {mobileAccounts.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No mobile money accounts configured
                </Card>
              ) : (
                mobileAccounts.map((account) => (
                  <Card key={account.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{account.provider_name}</h3>
                          {account.is_active && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Active</span>
                          )}
                        </div>
                        <p className="text-sm">{account.account_name}</p>
                        <p className="font-mono">{account.phone_number}</p>
                        {account.business_number && (
                          <p className="text-sm text-muted-foreground">Lipa Number: {account.business_number}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditMobileDialog(account)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteMobile(account.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Bank Account Dialog */}
        <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Edit" : "Add"} Bank Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBankSubmit} className="space-y-4">
              <div>
                <Label htmlFor="account_name">Account Name</Label>
                <Input
                  id="account_name"
                  value={bankFormData.account_name}
                  onChange={(e) => setBankFormData({ ...bankFormData, account_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={bankFormData.bank_name}
                  onChange={(e) => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={bankFormData.account_number}
                  onChange={(e) => setBankFormData({ ...bankFormData, account_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="swift_code">SWIFT Code (Optional)</Label>
                <Input
                  id="swift_code"
                  value={bankFormData.swift_code}
                  onChange={(e) => setBankFormData({ ...bankFormData, swift_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={bankFormData.currency}
                  onChange={(e) => setBankFormData({ ...bankFormData, currency: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="instructions">Payment Instructions</Label>
                <Textarea
                  id="instructions"
                  value={bankFormData.instructions}
                  onChange={(e) => setBankFormData({ ...bankFormData, instructions: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={bankFormData.is_active}
                  onCheckedChange={(checked) => setBankFormData({ ...bankFormData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setBankDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Mobile Money Dialog */}
        <Dialog open={mobileDialogOpen} onOpenChange={setMobileDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMobile ? "Edit" : "Add"} Mobile Money Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleMobileSubmit} className="space-y-4">
              <div>
                <Label htmlFor="provider_name">Provider</Label>
                <Select
                  value={mobileFormData.provider_name}
                  onValueChange={(value) => setMobileFormData({ ...mobileFormData, provider_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M-Pesa">M-Pesa (Vodacom)</SelectItem>
                    <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                    <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                    <SelectItem value="Halopesa">Halopesa</SelectItem>
                    <SelectItem value="TTCL Pesa">TTCL Pesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mobile_account_name">Account/Business Name</Label>
                <Input
                  id="mobile_account_name"
                  value={mobileFormData.account_name}
                  onChange={(e) => setMobileFormData({ ...mobileFormData, account_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={mobileFormData.phone_number}
                  onChange={(e) => setMobileFormData({ ...mobileFormData, phone_number: e.target.value })}
                  placeholder="+255 XXX XXX XXX"
                  required
                />
              </div>
              <div>
                <Label htmlFor="business_number">Lipa/Paybill Number (Optional)</Label>
                <Input
                  id="business_number"
                  value={mobileFormData.business_number}
                  onChange={(e) => setMobileFormData({ ...mobileFormData, business_number: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={mobileFormData.is_active}
                  onCheckedChange={(checked) => setMobileFormData({ ...mobileFormData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setMobileDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
