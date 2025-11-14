import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Webhook, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import type { WebhookSubscription, WebhookEventType } from '@/types/webhooks';

export default function Integrations() {
  return (
    <ProtectedRoute requireRole={['seller', 'broker', 'admin']}>
      <IntegrationsContent />
    </ProtectedRoute>
  );
}

function IntegrationsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    target_url: '',
    event_type: '' as WebhookEventType,
    secret_token: '',
  });

  useEffect(() => {
    if (user) {
      fetchWebhooks();
    }
  }, [user]);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load webhooks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.target_url || !formData.event_type) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('webhook_subscriptions')
        .insert({
          owner_id: user!.id,
          target_url: formData.target_url,
          event_type: formData.event_type,
          secret_token: formData.secret_token || crypto.randomUUID(),
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: 'Webhook created successfully',
      });

      setIsDialogOpen(false);
      setFormData({ target_url: '', event_type: '' as WebhookEventType, secret_token: '' });
      fetchWebhooks();
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to create webhook',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      setWebhooks(webhooks.map(w => w.id === id ? { ...w, is_active: !isActive } : w));
      toast({
        title: t('common.success'),
        description: `Webhook ${!isActive ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to update webhook',
        variant: 'destructive',
      });
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWebhooks(webhooks.filter(w => w.id !== id));
      toast({
        title: t('common.success'),
        description: 'Webhook deleted',
      });
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to delete webhook',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('webhooks.title')}</h1>
            <p className="text-muted-foreground">Connect GeoEstate with external services</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('webhooks.addWebhook')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{t('webhooks.addWebhook')}</DialogTitle>
                  <DialogDescription>
                    Configure a webhook to receive notifications about events
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_url">{t('webhooks.targetUrl')}</Label>
                    <Input
                      id="target_url"
                      type="url"
                      placeholder="https://your-app.com/webhook"
                      value={formData.target_url}
                      onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event_type">{t('webhooks.eventType')}</Label>
                    <Select
                      value={formData.event_type}
                      onValueChange={(value) => setFormData({ ...formData, event_type: value as WebhookEventType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="listing_created">{t('webhooks.events.listing_created')}</SelectItem>
                        <SelectItem value="listing_closed">{t('webhooks.events.listing_closed')}</SelectItem>
                        <SelectItem value="payment_proof_submitted">{t('webhooks.events.payment_proof_submitted')}</SelectItem>
                        <SelectItem value="deal_closed">{t('webhooks.events.deal_closed')}</SelectItem>
                        <SelectItem value="dispute_opened">{t('webhooks.events.dispute_opened')}</SelectItem>
                        <SelectItem value="visit_requested">{t('webhooks.events.visit_requested')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secret_token">{t('webhooks.secretToken')} (Optional)</Label>
                    <Input
                      id="secret_token"
                      type="text"
                      placeholder="Auto-generated if left empty"
                      value={formData.secret_token}
                      onChange={(e) => setFormData({ ...formData, secret_token: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to verify webhook authenticity
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t('common.save')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {webhooks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first webhook to start receiving events
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('webhooks.addWebhook')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            webhooks.map(webhook => (
              <Card key={webhook.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Webhook className="h-4 w-4" />
                        {webhook.target_url}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {t(`webhooks.events.${webhook.event_type}` as any)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.is_active}
                        onCheckedChange={() => toggleWebhook(webhook.id, webhook.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteWebhook(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className="ml-2" variant={webhook.is_active ? 'default' : 'secondary'}>
                        {webhook.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {webhook.last_delivery_at && (
                      <div>
                        <span className="text-muted-foreground">Last Delivery:</span>
                        <div className="flex items-center gap-1 mt-1">
                          {webhook.last_delivery_status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-xs">
                            {new Date(webhook.last_delivery_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
