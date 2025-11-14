import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Building2, Users, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/database';

const roles: { value: AppRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'buyer',
    label: 'Buyer',
    description: 'I want to purchase land or property',
    icon: <ShoppingBag className="h-6 w-6" />,
  },
  {
    value: 'seller',
    label: 'Seller',
    description: 'I want to list and sell my property',
    icon: <Building2 className="h-6 w-6" />,
  },
  {
    value: 'broker',
    label: 'Broker/Agent',
    description: 'I represent buyers and sellers',
    icon: <Users className="h-6 w-6" />,
  },
];

export default function Onboarding() {
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile, roles: userRoles } = useAuth();
  const navigate = useNavigate();

  // Redirect if user already has a role
  useEffect(() => {
    if (userRoles && userRoles.length > 0) {
      navigate('/dashboard');
    }
  }, [userRoles, navigate]);

  const handleRoleSelection = async () => {
    if (!selectedRole || !user) return;

    setLoading(true);

    try {
      // Insert role into user_roles table
      const { error } = await (supabase as any)
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: selectedRole,
          assigned_by: user.id, // Self-assigned during onboarding
        });

      if (error) throw error;

      await refreshProfile();
      toast.success('Welcome to GeoEstate Tanzania!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              GeoEstate Tanzania
            </h1>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Welcome!</h2>
          <p className="text-muted-foreground">
            Let's get started by selecting your role
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose Your Role</CardTitle>
            <CardDescription>
              Select the role that best describes how you'll use GeoEstate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`
                    p-6 rounded-lg border-2 transition-all text-left
                    ${
                      selectedRole === role.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <div className="flex flex-col items-start gap-3">
                    <div className={`
                      p-3 rounded-lg
                      ${selectedRole === role.value ? 'bg-primary text-primary-foreground' : 'bg-secondary'}
                    `}>
                      {role.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{role.label}</h3>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={handleRoleSelection}
              disabled={!selectedRole || loading}
              className="w-full mt-6"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
