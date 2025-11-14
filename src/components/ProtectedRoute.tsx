import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: AppRole[];
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, profile, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!roles || roles.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  if (requireRole && !requireRole.some(role => roles.includes(role))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to view this page.
          </p>
          <a href="/dashboard" className="text-primary hover:underline">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
