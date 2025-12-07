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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Plus, Pencil, Trash2, DollarSign, Clock, Package, 
  Sparkles, Eye, EyeOff, ArrowRight
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  price_type: 'fixed' | 'hourly' | 'per_sqm' | 'negotiable';
  duration_hours: number;
  is_active: boolean;
  category: string;
}

interface ServiceManagementProps {
  providerId: string;
  onUpdate: () => void;
}

const SERVICE_CATEGORIES = [
  { value: 'legal', label: 'Legal Services' },
  { value: 'valuation', label: 'Land Valuation' },
  { value: 'construction', label: 'Construction' },
  { value: 'materials', label: 'Building Materials' },
  { value: 'surveying', label: 'Land Surveying' },
  { value: 'architecture', label: 'Architecture & Design' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'inspection', label: 'Property Inspection' },
  { value: 'other', label: 'Other' },
];

const PRICE_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Per Hour' },
  { value: 'per_sqm', label: 'Per Square Meter' },
  { value: 'negotiable', label: 'Negotiable' },
];

export function ServiceManagement({ providerId, onUpdate }: ServiceManagementProps) {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    price_type: 'fixed',
    duration_hours: '',
    category: '',
    is_active: true,
  });

  useEffect(() => {
    fetchServices();
  }, [providerId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await (supabase
        .from('provider_services' as any)
        .select('*')
        .eq('provider_id', user?.id)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      setServices((data as Service[]) || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        provider_id: user?.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        price_type: formData.price_type,
        duration_hours: parseFloat(formData.duration_hours) || null,
        category: formData.category,
        is_active: formData.is_active,
      };

      if (editingService) {
        const { error } = await (supabase
          .from('provider_services' as any)
          .update(serviceData)
          .eq('id', editingService.id) as any);

        if (error) throw error;
        toast.success('Service updated successfully');
      } else {
        const { error } = await (supabase
          .from('provider_services' as any)
          .insert([serviceData]) as any);

        if (error) throw error;
        toast.success('Service added successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchServices();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save service');
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price?.toString() || '',
      price_type: service.price_type || 'fixed',
      duration_hours: service.duration_hours?.toString() || '',
      category: service.category || '',
      is_active: service.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const { error } = await (supabase
        .from('provider_services' as any)
        .delete()
        .eq('id', serviceId) as any);

      if (error) throw error;
      toast.success('Service deleted');
      fetchServices();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete service');
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      const { error } = await (supabase
        .from('provider_services' as any)
        .update({ is_active: !service.is_active })
        .eq('id', service.id) as any);

      if (error) throw error;
      toast.success(service.is_active ? 'Service hidden from public' : 'Service now visible');
      fetchServices();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update service');
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      price_type: 'fixed',
      duration_hours: '',
      category: '',
      is_active: true,
    });
  };

  const getPriceLabel = (priceType: string) => {
    const type = PRICE_TYPES.find(t => t.value === priceType);
    return type?.label || priceType;
  };

  const getCategoryLabel = (category: string) => {
    const cat = SERVICE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const activeServices = services.filter(s => s.is_active);
  const inactiveServices = services.filter(s => !s.is_active);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-primary" />
              My Services
            </CardTitle>
            <CardDescription>
              Create custom services with your own pricing. Clients can book directly.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {editingService ? 'Edit Service' : 'Create New Service'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Full Land Survey, Title Deed Verification"
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what's included in this service..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (TZS) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0"
                        className="h-11 pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_type">Price Type</Label>
                    <Select
                      value={formData.price_type}
                      onValueChange={(value) => setFormData({ ...formData, price_type: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration (hours)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                      placeholder="e.g., 2"
                      className="h-11 pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {formData.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <Label htmlFor="is_active" className="cursor-pointer">
                      {formData.is_active ? 'Visible to clients' : 'Hidden from public'}
                    </Label>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 gap-2">
                    {editingService ? 'Update' : 'Create'} Service
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No services yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first service to start receiving bookings from clients.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Service
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Services */}
            {activeServices.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Active Services ({activeServices.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeServices.map((service) => (
                    <Card 
                      key={service.id} 
                      className="group overflow-hidden hover:shadow-md transition-all duration-300 hover:border-primary/30"
                    >
                      <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{service.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {getCategoryLabel(service.category)}
                              </Badge>
                            </div>
                          </div>
                          
                          {service.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-1 text-primary font-bold">
                              <span>TZS {service.price?.toLocaleString()}</span>
                              <span className="text-xs font-normal text-muted-foreground">
                                / {getPriceLabel(service.price_type).toLowerCase()}
                              </span>
                            </div>
                            {service.duration_hours && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {service.duration_hours}h
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEdit(service)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={() => toggleActive(service)}
                            >
                              <EyeOff className="h-4 w-4 mr-1" />
                              Hide
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(service.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Services */}
            {inactiveServices.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  Hidden Services ({inactiveServices.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {inactiveServices.map((service) => (
                    <Card 
                      key={service.id} 
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <div className="h-1 bg-muted" />
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold">{service.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryLabel(service.category)}
                              </Badge>
                            </div>
                            <Badge variant="secondary">Hidden</Badge>
                          </div>
                          
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span>TZS {service.price?.toLocaleString()}</span>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => toggleActive(service)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Show
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(service.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}