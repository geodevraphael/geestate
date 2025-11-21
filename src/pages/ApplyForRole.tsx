import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Building, Briefcase } from 'lucide-react';

export default function ApplyForRole() {
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    requested_role: location.state?.preselectedRole || '',
    business_name: '',
    license_number: '',
    experience_years: '',
    portfolio_url: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('role_requests').insert({
        user_id: user.id,
        requested_role: formData.requested_role as any,
        business_name: formData.business_name || null,
        license_number: formData.license_number || null,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        portfolio_url: formData.portfolio_url || null,
        reason: formData.reason || null,
      } as any);

      if (error) throw error;

      toast({
        title: 'Application Submitted',
        description: 'Your role request has been submitted for admin review.',
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error submitting role request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit role request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 md:p-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UserCheck className="h-6 w-6" />
              Apply for Seller/Broker Role
            </CardTitle>
            <CardDescription>
              Submit your application to become a verified seller or broker on our platform.
              Admin will review and approve your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Requested Role *</Label>
                <Select
                  value={formData.requested_role}
                  onValueChange={(value) => setFormData({ ...formData, requested_role: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Seller
                      </div>
                    </SelectItem>
                    <SelectItem value="broker">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Broker
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name (Optional)</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Your business or company name"
                />
              </div>

              {/* License Number */}
              <div className="space-y-2">
                <Label htmlFor="license_number">License Number (Optional)</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  placeholder="Professional license number"
                />
              </div>

              {/* Experience Years */}
              <div className="space-y-2">
                <Label htmlFor="experience_years">Years of Experience (Optional)</Label>
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                  placeholder="Years in real estate"
                />
              </div>

              {/* Portfolio URL */}
              <div className="space-y-2">
                <Label htmlFor="portfolio_url">Portfolio/Website URL (Optional)</Label>
                <Input
                  id="portfolio_url"
                  type="url"
                  value={formData.portfolio_url}
                  onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Why do you want this role? (Optional)</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Tell us about your background and why you'd like to become a seller/broker..."
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !formData.requested_role} className="flex-1">
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
