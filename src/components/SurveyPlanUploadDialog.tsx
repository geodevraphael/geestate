import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Upload, MapPin, Phone, FileText, Loader2 } from 'lucide-react';

interface SurveyPlanUploadDialogProps {
  trigger?: React.ReactNode;
}

export function SurveyPlanUploadDialog({ trigger }: SurveyPlanUploadDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    locationDescription: '',
    contactPhone: '',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image (JPG, PNG, WebP) or PDF file.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 10MB.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to submit a listing request.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please upload your survey plan image.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('survey-plans')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('survey-plans')
        .getPublicUrl(fileName);

      // Create listing request record
      const { error: insertError } = await (supabase as any)
        .from('listing_requests')
        .insert({
          user_id: user.id,
          survey_plan_url: publicUrl,
          location_description: formData.locationDescription,
          contact_phone: formData.contactPhone,
          notes: formData.notes,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Request submitted!',
        description: 'Your listing request has been submitted. Our team will review your survey plan and contact you soon.',
      });

      // Reset form
      setFormData({ locationDescription: '', contactPhone: '', notes: '' });
      setSelectedFile(null);
      setPreviewUrl(null);
      setOpen(false);
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileUp className="h-4 w-4" />
            Request Listing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Request Property Listing
          </DialogTitle>
          <DialogDescription>
            Upload your survey plan and we'll help you list your property. Our team will review and contact you.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="survey-plan">Survey Plan Image *</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              <input
                id="survey-plan"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="survey-plan" className="cursor-pointer">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Survey plan preview" 
                    className="max-h-32 mx-auto rounded-lg object-contain"
                  />
                ) : selectedFile ? (
                  <div className="py-4">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                  </div>
                ) : (
                  <div className="py-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload survey plan
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, WebP or PDF (max 10MB)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Location Description */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Property Location
            </Label>
            <Textarea
              id="location"
              placeholder="e.g., Kinondoni, Dar es Salaam near ABC School"
              value={formData.locationDescription}
              onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })}
              rows={2}
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+255 XXX XXX XXX"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about your property..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={uploading || !selectedFile}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}