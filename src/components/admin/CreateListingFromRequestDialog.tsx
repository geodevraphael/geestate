import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, MapPin, Phone, FileText, Building2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ListingRequest {
  id: string;
  user_id: string;
  survey_plan_url: string;
  location_description: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  applicant?: {
    full_name: string;
    email: string;
  };
}

interface CreateListingFromRequestDialogProps {
  request: ListingRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateListingFromRequestDialog({
  request,
  open,
  onOpenChange,
  onSuccess,
}: CreateListingFromRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    listing_type: 'sale' as 'sale' | 'rent',
    property_type: 'land' as 'land' | 'house' | 'apartment' | 'commercial' | 'other',
    price: '',
    currency: 'TZS',
    location_label: '',
    region: '',
    district: '',
    ward: '',
    block_number: '',
    plot_number: '',
    street_name: '',
    planned_use: '',
    has_title: false,
    has_electricity: false,
    has_water: false,
  });

  // Pre-fill form when request changes
  useEffect(() => {
    if (request) {
      setFormData(prev => ({
        ...prev,
        location_label: request.location_description || '',
        description: request.notes || '',
        title: `Property in ${request.location_description?.split(',')[0] || 'Tanzania'}`,
      }));
      setAdminNotes('');
    }
  }, [request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !user) return;

    // Validation
    if (!formData.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    if (!formData.location_label.trim()) {
      toast({ title: 'Location required', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      // 1. Create the listing for the user who submitted the request
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          owner_id: request.user_id,
          title: formData.title,
          description: formData.description || null,
          listing_type: formData.listing_type,
          property_type: formData.property_type,
          price: formData.price ? parseFloat(formData.price) : null,
          currency: formData.currency,
          location_label: formData.location_label,
          region: formData.region || null,
          district: formData.district || null,
          ward: formData.ward || null,
          block_number: formData.block_number || null,
          plot_number: formData.plot_number || null,
          street_name: formData.street_name || null,
          planned_use: formData.planned_use || null,
          has_title: formData.has_title,
          has_electricity: formData.has_electricity,
          has_water: formData.has_water,
          status: 'draft', // Created as draft, owner can publish later
          verification_status: 'pending',
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // 2. Add the survey plan as listing media
      if (listing) {
        await supabase.from('listing_media').insert({
          listing_id: listing.id,
          file_url: request.survey_plan_url,
          media_type: 'document',
          caption: 'Survey Plan',
        });
      }

      // 3. Update the request status to approved
      const { error: updateError } = await (supabase as any)
        .from('listing_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // 4. Create notification for the user
      await supabase.from('notifications').insert([{
        user_id: request.user_id,
        type: 'listing_verified' as const,
        title: 'Listing Created!',
        message: `Your listing request has been approved and a draft listing "${formData.title}" has been created. You can now edit and publish it.`,
        link_url: `/listings/${listing?.id}`,
      }]);

      toast({
        title: 'Listing Created',
        description: 'The listing has been created and the user has been notified.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create listing',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Listing from Request
          </DialogTitle>
          <DialogDescription>
            Review the request and create a listing for {request.applicant?.full_name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
            {/* Request Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Request Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{request.applicant?.full_name}</span>
                </div>
                {request.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{request.contact_phone}</span>
                  </div>
                )}
                {request.location_description && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{request.location_description}</span>
                  </div>
                )}
              </div>
              {/* Survey Plan Preview */}
              <div className="mt-3">
                <img
                  src={request.survey_plan_url}
                  alt="Survey Plan"
                  className="w-full max-h-40 object-contain rounded-lg border"
                />
              </div>
            </div>

            <Separator />

            {/* Listing Form */}
            <div className="space-y-4">
              <h4 className="font-medium">Listing Information</h4>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Prime Plot in Kinondoni"
                  required
                />
              </div>

              {/* Type selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Listing Type</Label>
                  <Select
                    value={formData.listing_type}
                    onValueChange={(v) => setFormData({ ...formData, listing_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">For Sale</SelectItem>
                      <SelectItem value="rent">For Rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(v) => setFormData({ ...formData, property_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="land">Land</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g., 50000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
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

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location_label}
                  onChange={(e) => setFormData({ ...formData, location_label: e.target.value })}
                  placeholder="e.g., Kinondoni, Dar es Salaam"
                  required
                />
              </div>

              {/* Region/District/Ward */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g., Dar es Salaam"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="e.g., Kinondoni"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ward">Ward</Label>
                  <Input
                    id="ward"
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    placeholder="e.g., Msasani"
                  />
                </div>
              </div>

              {/* Block/Plot/Street */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="block">Block Number</Label>
                  <Input
                    id="block"
                    value={formData.block_number}
                    onChange={(e) => setFormData({ ...formData, block_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plot">Plot Number</Label>
                  <Input
                    id="plot"
                    value={formData.plot_number}
                    onChange={(e) => setFormData({ ...formData, plot_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">Street Name</Label>
                  <Input
                    id="street"
                    value={formData.street_name}
                    onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Property description..."
                  rows={3}
                />
              </div>

              {/* Amenities */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasTitle"
                    checked={formData.has_title}
                    onCheckedChange={(c) => setFormData({ ...formData, has_title: !!c })}
                  />
                  <Label htmlFor="hasTitle" className="cursor-pointer">Has Title Deed</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasElectricity"
                    checked={formData.has_electricity}
                    onCheckedChange={(c) => setFormData({ ...formData, has_electricity: !!c })}
                  />
                  <Label htmlFor="hasElectricity" className="cursor-pointer">Has Electricity</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasWater"
                    checked={formData.has_water}
                    onCheckedChange={(c) => setFormData({ ...formData, has_water: !!c })}
                  />
                  <Label htmlFor="hasWater" className="cursor-pointer">Has Water</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Admin Notes */}
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Admin Notes (Internal)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notes about this request (not visible to user)..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Approve & Create Listing
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
