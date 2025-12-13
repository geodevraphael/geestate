import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Building2, Smartphone, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SellerPaymentInfo {
  id: string;
  payment_type: string;
  provider_name: string | null;
  account_name: string;
  account_number: string;
  swift_code: string | null;
  is_primary: boolean;
  is_active: boolean;
}

export default function SellerPaymentSettings() {
  const { user } = useAuth();
  const [paymentInfo, setPaymentInfo] = useState<SellerPaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState<SellerPaymentInfo | null>(null);
  const [formData, setFormData] = useState({
    payment_type: "bank",
    provider_name: "",
    account_name: "",
    account_number: "",
    swift_code: "",
    is_primary: false,
    is_active: true,
  });

  useEffect(() => {
    if (user) {
      fetchPaymentInfo();
    }
  }, [user]);

  const fetchPaymentInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_payment_info")
        .select("*")
        .eq("seller_id", user!.id)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setPaymentInfo(data || []);
    } catch (error: any) {
      toast.error("Failed to load payment info");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      seller_id: user!.id,
    };

    try {
      if (editingInfo) {
        const { error } = await supabase
          .from("seller_payment_info")
          .update(submitData)
          .eq("id", editingInfo.id);

        if (error) throw error;
        toast.success("Payment info updated");
      } else {
        const { error } = await supabase
          .from("seller_payment_info")
          .insert([submitData]);

        if (error) throw error;
        toast.success("Payment info added");
      }

      setDialogOpen(false);
      setEditingInfo(null);
      resetForm();
      fetchPaymentInfo();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment info?")) return;

    try {
      const { error } = await supabase
        .from("seller_payment_info")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Payment info deleted");
      fetchPaymentInfo();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      // First, unset all as primary
      await supabase
        .from("seller_payment_info")
        .update({ is_primary: false })
        .eq("seller_id", user!.id);

      // Set selected as primary
      const { error } = await supabase
        .from("seller_payment_info")
        .update({ is_primary: true })
        .eq("id", id);

      if (error) throw error;
      toast.success("Primary payment method updated");
      fetchPaymentInfo();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      payment_type: "bank",
      provider_name: "",
      account_name: "",
      account_number: "",
      swift_code: "",
      is_primary: paymentInfo.length === 0,
      is_active: true,
    });
  };

  const openEditDialog = (info: SellerPaymentInfo) => {
    setEditingInfo(info);
    setFormData({
      payment_type: info.payment_type,
      provider_name: info.provider_name || "",
      account_name: info.account_name,
      account_number: info.account_number,
      swift_code: info.swift_code || "",
      is_primary: info.is_primary,
      is_active: info.is_active,
    });
    setDialogOpen(true);
  };

  const bankInfo = paymentInfo.filter(p => p.payment_type === "bank");
  const mobileInfo = paymentInfo.filter(p => p.payment_type === "mobile_money");

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Payment Information</h1>
            <p className="text-muted-foreground">
              Add your payment details so buyers can pay you directly
            </p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment Method
          </Button>
        </div>

        {paymentInfo.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No payment methods added yet. Add your bank account or mobile money details so buyers can pay you.
            </p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Method
            </Button>
          </Card>
        ) : (
          <Tabs defaultValue="bank" className="space-y-6">
            <TabsList>
              <TabsTrigger value="bank" className="gap-2">
                <Building2 className="h-4 w-4" />
                Bank Accounts ({bankInfo.length})
              </TabsTrigger>
              <TabsTrigger value="mobile" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Money ({mobileInfo.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bank" className="space-y-4">
              {bankInfo.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No bank accounts added
                </Card>
              ) : (
                bankInfo.map((info) => (
                  <Card key={info.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{info.provider_name}</h3>
                          {info.is_primary && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Primary
                            </span>
                          )}
                          {info.is_active && !info.is_primary && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Active</span>
                          )}
                        </div>
                        <p className="text-sm">{info.account_name}</p>
                        <p className="font-mono">{info.account_number}</p>
                        {info.swift_code && (
                          <p className="text-sm text-muted-foreground">SWIFT: {info.swift_code}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!info.is_primary && (
                          <Button variant="outline" size="sm" onClick={() => handleSetPrimary(info.id)}>
                            <Star className="h-4 w-4 mr-1" />
                            Set Primary
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(info)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(info.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="mobile" className="space-y-4">
              {mobileInfo.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No mobile money accounts added
                </Card>
              ) : (
                mobileInfo.map((info) => (
                  <Card key={info.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{info.provider_name}</h3>
                          {info.is_primary && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Primary
                            </span>
                          )}
                          {info.is_active && !info.is_primary && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Active</span>
                          )}
                        </div>
                        <p className="text-sm">{info.account_name}</p>
                        <p className="font-mono">{info.account_number}</p>
                      </div>
                      <div className="flex gap-2">
                        {!info.is_primary && (
                          <Button variant="outline" size="sm" onClick={() => handleSetPrimary(info.id)}>
                            <Star className="h-4 w-4 mr-1" />
                            Set Primary
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(info)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(info.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingInfo ? "Edit" : "Add"} Payment Method</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Payment Type</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData({ ...formData, payment_type: value, provider_name: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_type === "bank" ? (
                <>
                  <div>
                    <Label htmlFor="provider_name">Bank Name</Label>
                    <Input
                      id="provider_name"
                      value={formData.provider_name}
                      onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                      placeholder="e.g., CRDB Bank, NMB Bank"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_name">Account Holder Name</Label>
                    <Input
                      id="account_name"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="swift_code">SWIFT Code (Optional)</Label>
                    <Input
                      id="swift_code"
                      value={formData.swift_code}
                      onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Provider</Label>
                    <Select
                      value={formData.provider_name}
                      onValueChange={(value) => setFormData({ ...formData, provider_name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
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
                    <Label htmlFor="account_name">Registered Name</Label>
                    <Input
                      id="account_name"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_number">Phone Number</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="+255 XXX XXX XXX"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
