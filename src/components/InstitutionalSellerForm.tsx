import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logAuditAction } from '@/lib/auditLog';

export function InstitutionalSellerForm() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [formData, setFormData] = useState({
    institution_type: '',
    institution_name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
  });

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
      const { error } = await supabase
        .from('institutional_sellers')
        .insert({
          profile_id: user.id,
          institution_type: formData.institution_type as any,
          institution_name: formData.institution_name,
          contact_person: formData.contact_person,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
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
        description: 'Your application is pending admin approval',
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
          <h3 className="text-lg font-semibold mb-2">Application Submitted</h3>
          <p className="text-muted-foreground">
            Your application is under review. An admin will contact you once it's approved.
          </p>
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
          Register your government agency, municipality, or company to list official properties
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="institution_type">Institution Type *</Label>
            <Select
              value={formData.institution_type}
              onValueChange={(value) => setFormData({ ...formData, institution_type: value })}
              required
            >
              <SelectTrigger id="institution_type">
                <SelectValue placeholder="Select institution type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="government">Government Agency</SelectItem>
                <SelectItem value="municipal">Municipal Authority</SelectItem>
                <SelectItem value="authority">Public Authority</SelectItem>
                <SelectItem value="company">Company/Corporation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution_name">Institution Name *</Label>
            <Input
              id="institution_name"
              placeholder="e.g., Dar es Salaam City Council"
              value={formData.institution_name}
              onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person *</Label>
            <Input
              id="contact_person"
              placeholder="Full name of authorized representative"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Official Email *</Label>
            <Input
              id="contact_email"
              type="email"
              placeholder="official@institution.go.tz"
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
              placeholder="+255..."
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Information</Label>
            <Textarea
              id="notes"
              placeholder="Provide any additional details about your institution..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
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
