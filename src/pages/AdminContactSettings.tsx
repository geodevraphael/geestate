import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ContactSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_label: string | null;
  is_active: boolean;
  display_order: number;
}

export default function AdminContactSettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<ContactSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ContactSetting | null>(null);
  const [formData, setFormData] = useState({
    setting_key: "",
    setting_value: "",
    setting_label: "",
    is_active: true,
    display_order: 0,
  });

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_settings")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      toast.error("Failed to load contact settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSetting) {
        const { error } = await supabase
          .from("contact_settings")
          .update(formData)
          .eq("id", editingSetting.id);

        if (error) throw error;
        toast.success("Setting updated");
      } else {
        const { error } = await supabase
          .from("contact_settings")
          .insert([formData]);

        if (error) throw error;
        toast.success("Setting added");
      }

      setDialogOpen(false);
      setEditingSetting(null);
      resetForm();
      fetchSettings();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this setting?")) return;

    try {
      const { error } = await supabase
        .from("contact_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Setting deleted");
      fetchSettings();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleQuickUpdate = async (setting: ContactSetting, newValue: string) => {
    try {
      const { error } = await supabase
        .from("contact_settings")
        .update({ setting_value: newValue })
        .eq("id", setting.id);

      if (error) throw error;
      toast.success("Updated");
      fetchSettings();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      setting_key: "",
      setting_value: "",
      setting_label: "",
      is_active: true,
      display_order: settings.length,
    });
  };

  const openEditDialog = (setting: ContactSetting) => {
    setEditingSetting(setting);
    setFormData({
      setting_key: setting.setting_key,
      setting_value: setting.setting_value,
      setting_label: setting.setting_label || "",
      is_active: setting.is_active,
      display_order: setting.display_order,
    });
    setDialogOpen(true);
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Contact Page Settings</h1>
            <p className="text-muted-foreground">Manage contact information displayed on the Contact page</p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Setting
          </Button>
        </div>

        <div className="grid gap-4">
          {settings.map((setting) => (
            <Card key={setting.id} className="p-6">
              <div className="flex justify-between items-center">
                <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{setting.setting_label || setting.setting_key}</p>
                    <p className="font-medium">{setting.setting_key}</p>
                  </div>
                  <div className="col-span-2">
                    <Input
                      defaultValue={setting.setting_value}
                      onBlur={(e) => {
                        if (e.target.value !== setting.setting_value) {
                          handleQuickUpdate(setting, e.target.value);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(setting)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(setting.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSetting ? "Edit" : "Add"} Contact Setting</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="setting_key">Setting Key</Label>
                <Input
                  id="setting_key"
                  value={formData.setting_key}
                  onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
                  placeholder="e.g., email, phone, address"
                  required
                  disabled={!!editingSetting}
                />
              </div>
              <div>
                <Label htmlFor="setting_label">Display Label</Label>
                <Input
                  id="setting_label"
                  value={formData.setting_label}
                  onChange={(e) => setFormData({ ...formData, setting_label: e.target.value })}
                  placeholder="e.g., Email, Phone Number"
                />
              </div>
              <div>
                <Label htmlFor="setting_value">Value</Label>
                <Input
                  id="setting_value"
                  value={formData.setting_value}
                  onChange={(e) => setFormData({ ...formData, setting_value: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
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
    </div>
  );
}
