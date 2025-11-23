import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Percent, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TaxSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    tra_rate: 18, // Tanzania VAT rate
    tra_tin: '',
    other_deductions: 0,
    other_deductions_description: '',
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('social_links')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      const taxSettings = data?.social_links as any;
      if (taxSettings) {
        setSettings({
          tra_rate: taxSettings.tra_rate || 18,
          tra_tin: taxSettings.tra_tin || '',
          other_deductions: taxSettings.other_deductions || 0,
          other_deductions_description: taxSettings.other_deductions_description || '',
        });
      }
    } catch (error) {
      console.error('Error fetching tax settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          social_links: settings,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Tax settings saved successfully');
    } catch (error: any) {
      console.error('Error saving tax settings:', error);
      toast.error('Failed to save tax settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading tax settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure your tax obligations and deductions. These settings will be used to calculate your net revenue.
          The standard VAT rate in Tanzania is 18%, but you can adjust it based on your specific tax situation.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>TRA (Tanzania Revenue Authority) Settings</CardTitle>
          <CardDescription>Configure your tax rate and TIN number</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tra_rate">Tax Rate (%)</Label>
              <div className="relative">
                <Input
                  id="tra_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.tra_rate}
                  onChange={(e) => setSettings({ ...settings, tra_rate: parseFloat(e.target.value) || 0 })}
                  className="pr-8"
                />
                <Percent className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Standard VAT rate in Tanzania is 18%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tra_tin">TIN Number</Label>
              <Input
                id="tra_tin"
                placeholder="e.g., 123-456-789"
                value={settings.tra_tin}
                onChange={(e) => setSettings({ ...settings, tra_tin: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Your Tax Identification Number
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other Deductions</CardTitle>
          <CardDescription>Additional deductions from your revenue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="other_deductions">Deduction Percentage (%)</Label>
              <div className="relative">
                <Input
                  id="other_deductions"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.other_deductions}
                  onChange={(e) => setSettings({ ...settings, other_deductions: parseFloat(e.target.value) || 0 })}
                  className="pr-8"
                />
                <Percent className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductions_desc">Description</Label>
              <Input
                id="deductions_desc"
                placeholder="e.g., Legal fees, Admin costs"
                value={settings.other_deductions_description}
                onChange={(e) => setSettings({ ...settings, other_deductions_description: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Changes will be applied to future revenue calculations
        </p>
      </div>
    </div>
  );
}
