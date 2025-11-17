import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, CheckCircle2, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logAuditAction } from '@/lib/auditLog';

export function InstitutionalSellerEnhancedForm() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    institution_type: '',
    institution_name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    about_company: '',
    mission_statement: '',
    website_url: '',
    year_established: '',
    total_employees: '',
    service_areas: '',
    certifications: '',
    facebook: '',
    twitter: '',
    linkedin: '',
    instagram: '',
    notes: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'logo') setLogoFile(file);
      else setCoverFile(file);
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('listing-media')
      .upload(path, file, { upsert: true });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('listing-media')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      toast({
        title: 'Error',
        description: 'You must be logged in to apply',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      let logoUrl = '';
      let coverUrl = '';

      // Upload files if provided
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, `institutions/${user.id}/logo-${Date.now()}`);
      }
      if (coverFile) {
        coverUrl = await uploadFile(coverFile, `institutions/${user.id}/cover-${Date.now()}`);
      }

      const { error } = await supabase
        .from('institutional_sellers')
        .insert({
          profile_id: user.id,
          institution_type: formData.institution_type as any,
          institution_name: formData.institution_name,
          contact_person: formData.contact_person,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          about_company: formData.about_company || null,
          mission_statement: formData.mission_statement || null,
          website_url: formData.website_url || null,
          year_established: formData.year_established ? parseInt(formData.year_established) : null,
          total_employees: formData.total_employees ? parseInt(formData.total_employees) : null,
          service_areas: formData.service_areas ? formData.service_areas.split(',').map(s => s.trim()) : null,
          certifications: formData.certifications ? formData.certifications.split(',').map(s => s.trim()) : null,
          social_media: {
            facebook: formData.facebook || undefined,
            twitter: formData.twitter || undefined,
            linkedin: formData.linkedin || undefined,
            instagram: formData.instagram || undefined,
          },
          logo_url: logoUrl || null,
          cover_image_url: coverUrl || null,
          notes: formData.notes || null,
          is_approved: false,
        });

      if (error) throw error;

      await logAuditAction(
        'APPLY_INSTITUTIONAL_SELLER',
        user.id,
        undefined,
        { institution_name: formData.institution_name, institution_type: formData.institution_type }
      );

      toast({
        title: 'Application Submitted',
        description: 'Your application is pending admin approval. You will have a custom landing page once approved.',
      });

      setHasApplied(true);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (hasApplied) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Application Submitted Successfully!</h3>
          <p className="text-muted-foreground mb-4">
            Your institutional seller profile is under review. Once approved, you'll get:
          </p>
          <ul className="text-sm text-left mx-auto max-w-md space-y-2">
            <li>✓ Custom landing page with your branding</li>
            <li>✓ Dedicated institutional dashboard</li>
            <li>✓ Enhanced listing management</li>
            <li>✓ Professional seller profile</li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Apply as Institutional Seller</CardTitle>
        </div>
        <CardDescription>
          Create your institutional profile with custom branding and company information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="institution_type">Institution Type *</Label>
                <Select
                  value={formData.institution_type}
                  onValueChange={(value) => setFormData({ ...formData, institution_type: value })}
                  required
                >
                  <SelectTrigger id="institution_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="government">Government Agency</SelectItem>
                    <SelectItem value="municipal">Municipality</SelectItem>
                    <SelectItem value="authority">Public Authority</SelectItem>
                    <SelectItem value="company">Private Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution_name">Institution Name *</Label>
                <Input
                  id="institution_name"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Branding & Media */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Branding & Media</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Institution Logo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'logo')}
                    className="flex-1"
                  />
                  {logoFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Recommended: Square image, 500x500px</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover">Cover Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cover"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'cover')}
                    className="flex-1"
                  />
                  {coverFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCoverFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Recommended: 1920x400px landscape</p>
              </div>
            </div>
          </div>

          {/* Company Culture */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Company Culture & Values</h3>
            
            <div className="space-y-2">
              <Label htmlFor="about_company">About Your Institution</Label>
              <Textarea
                id="about_company"
                value={formData.about_company}
                onChange={(e) => setFormData({ ...formData, about_company: e.target.value })}
                rows={4}
                placeholder="Describe your institution, its history, and what makes it unique..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mission_statement">Mission Statement</Label>
              <Textarea
                id="mission_statement"
                value={formData.mission_statement}
                onChange={(e) => setFormData({ ...formData, mission_statement: e.target.value })}
                rows={3}
                placeholder="Your institution's mission and core values..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year_established">Year Established</Label>
                <Input
                  id="year_established"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.year_established}
                  onChange={(e) => setFormData({ ...formData, year_established: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_employees">Total Employees</Label>
                <Input
                  id="total_employees"
                  type="number"
                  min="1"
                  value={formData.total_employees}
                  onChange={(e) => setFormData({ ...formData, total_employees: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_areas">Service Areas (comma-separated)</Label>
                <Input
                  id="service_areas"
                  value={formData.service_areas}
                  onChange={(e) => setFormData({ ...formData, service_areas: e.target.value })}
                  placeholder="Dar es Salaam, Arusha, Dodoma"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                <Input
                  id="certifications"
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  placeholder="ISO 9001, Licensed Broker, etc."
                />
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Social Media Presence</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  type="url"
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter/X</Label>
                <Input
                  id="twitter"
                  type="url"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  type="url"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional information you'd like to share..."
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}