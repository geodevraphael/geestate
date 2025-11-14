import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { BuyerDashboard } from './dashboards/BuyerDashboard';
import { SellerDashboard } from './dashboards/SellerDashboard';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { VerificationDashboard } from './dashboards/VerificationDashboard';
import { ComplianceDashboard } from './dashboards/ComplianceDashboard';
import { SpatialDashboard } from './dashboards/SpatialDashboard';
import { CustomerSuccessDashboard } from './dashboards/CustomerSuccessDashboard';
import { Navigate } from 'react-router-dom';

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { primaryRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!primaryRole) {
    return <Navigate to="/onboarding" replace />;
  }

  let DashboardComponent;
  
  switch (primaryRole) {
    case 'buyer':
      DashboardComponent = BuyerDashboard;
      break;
    case 'seller':
    case 'broker':
      DashboardComponent = SellerDashboard;
      break;
    case 'admin':
      DashboardComponent = AdminDashboard;
      break;
    case 'verification_officer':
      DashboardComponent = VerificationDashboard;
      break;
    case 'compliance_officer':
      DashboardComponent = ComplianceDashboard;
      break;
    case 'spatial_analyst':
      DashboardComponent = SpatialDashboard;
      break;
    case 'customer_success':
      DashboardComponent = CustomerSuccessDashboard;
      break;
    case 'staff':
      // Default staff to a simple dashboard
      DashboardComponent = CustomerSuccessDashboard;
      break;
    default:
      return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <DashboardComponent />
      </div>
    </div>
  );
}
