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
import { Plus, Pencil, Trash2, DollarSign, Clock, Package } from 'lucide-react';

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
      const { data, error } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
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
        const { error } = await supabase
          .from('provider_services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Service updated successfully');
      } else {
        const { error } = await supabase
          .from('provider_services')
          .insert([serviceData]);

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
      const { error } = await supabase
        .from('provider_services')
        .delete()
        .eq('id', serviceId);

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
      const { error } = await supabase
        .from('provider_services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) throw error;
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            My Services
          </CardTitle>
          <CardDescription>Manage services you offer to clients</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Land Title Search"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
                  placeholder="Describe what this service includes..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (TZS)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_type">Price Type</Label>
                  <Select
                    value={formData.price_type}
                    onValueChange={(value) => setFormData({ ...formData, price_type: value })}
                  >
                    <SelectTrigger>
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
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                  placeholder="e.g., 2"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active (visible to clients)</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingService ? 'Update' : 'Add'} Service
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No services added yet</p>
            <p className="text-sm">Add your first service to start receiving bookings</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <Card key={service.id} className={`transition-opacity ${!service.is_active && 'opacity-60'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{service.name}</h3>
                        {!service.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="mt-1 capitalize">
                        {service.category?.replace('_', ' ')}
                      </Badge>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <DollarSign className="h-4 w-4" />
                          TZS {service.price?.toLocaleString() || 'N/A'}
                          <span className="text-muted-foreground font-normal">
                            ({getPriceLabel(service.price_type)})
                          </span>
                        </span>
                        {service.duration_hours && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {service.duration_hours}h
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(service)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(service)}
                      >
                        <Switch checked={service.is_active} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
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
        )}
      </CardContent>
    </Card>
  );
}
