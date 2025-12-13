import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import CreateListing from "./pages/CreateListing";
import AdminVerification from "./pages/AdminVerification";
import MapBrowse from "./pages/MapBrowse";
import PaymentProofs from "./pages/PaymentProofs";
import AdminPayments from "./pages/AdminPayments";
import ComplianceFlags from "./pages/ComplianceFlags";
import Messages from "./pages/Messages";
import Reputation from "./pages/Reputation";
import FraudDetection from "./pages/FraudDetection";
import Subscriptions from "./pages/Subscriptions";
import AdminDashboard from "./pages/AdminDashboard";
import AuditLogs from "./pages/AuditLogs";
import InstitutionalSellers from "./pages/InstitutionalSellers";
import VisitRequests from './pages/VisitRequests';
import DataExport from './pages/DataExport';
import InstitutionalSellerApplication from './pages/InstitutionalSellerApplication';
import InstitutionLandingPage from './pages/InstitutionLandingPage';
import InstitutionalSellerDashboard from './pages/InstitutionalSellerDashboard';
import AdminAnalytics from './pages/AdminAnalytics';
import Disputes from './pages/Disputes';
import AboutUs from './pages/AboutUs';
import HowItWorks from './pages/HowItWorks';
import Contact from './pages/Contact';
import SetupStaff from './pages/SetupStaff';
import UserProfile from './pages/UserProfile';
import ManageUserRoles from './pages/ManageUserRoles';
import ManageUsers from './pages/ManageUsers';
import CRMDashboard from './pages/CRMDashboard';
import Integrations from './pages/Integrations';
import SystemStatus from './pages/SystemStatus';
import AdminServiceRequests from './pages/AdminServiceRequests';
import ServiceRequestDetail from './pages/ServiceRequestDetail';
import AdminPaymentSettings from './pages/AdminPaymentSettings';
import AdminSubscriptionPayments from './pages/AdminSubscriptionPayments';
import AdminGeoDataUpload from './pages/AdminGeoDataUpload';
import GeoinsightPayments from './pages/GeoinsightPayments';
import AdminIncomeManagement from './pages/AdminIncomeManagement';
import AdminApprovals from './pages/AdminApprovals';
import ApplyForRole from './pages/ApplyForRole';
import BrowseSellers from './pages/BrowseSellers';
import DraftListings from './pages/DraftListings';
import Deals from './pages/Deals';
import BuyingProcessDetail from './pages/BuyingProcessDetail';
import RevenueManagement from './pages/RevenueManagement';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import AdminListingRequests from './pages/AdminListingRequests';
import CreateListingFromRequest from './pages/CreateListingFromRequest';
import ServiceProviders from './pages/ServiceProviders';
import BecomeServiceProvider from './pages/BecomeServiceProvider';
import ServiceProviderDetail from './pages/ServiceProviderDetail';
import AdminServiceProviders from './pages/AdminServiceProviders';
import ServiceProviderDashboard from './pages/dashboards/ServiceProviderDashboard';
import MyBookings from './pages/MyBookings';
import MyServiceRequests from './pages/MyServiceRequests';
import Notifications from './pages/Notifications';
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/listings/:id" element={<ProtectedRoute><ListingDetail /></ProtectedRoute>} />
            <Route path="/listings/new" element={<CreateListing />} />
            <Route path="/listings/:id/edit" element={<CreateListing />} />
            <Route path="/admin/verification" element={<AdminVerification />} />
            <Route path="/map" element={<MapBrowse />} />
            <Route path="/payment-proofs" element={<PaymentProofs />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/compliance" element={<ComplianceFlags />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/reputation" element={<Reputation />} />
            <Route path="/fraud-detection" element={<FraudDetection />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/institutional-sellers" element={<InstitutionalSellers />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
            <Route path="/apply-for-role" element={<ApplyForRole />} />
            <Route path="/institution/:slug" element={<InstitutionLandingPage />} />
            <Route path="/institutional-seller/dashboard" element={<InstitutionalSellerDashboard />} />
            <Route path="/visit-requests" element={<VisitRequests />} />
            <Route path="/data-export" element={<DataExport />} />
            <Route path="/apply-institutional-seller" element={<InstitutionalSellerApplication />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/disputes" element={<Disputes />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/setup-staff" element={<SetupStaff />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/users/:userId/roles" element={<ManageUserRoles />} />
            <Route path="/crm" element={<CRMDashboard />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/admin/system-status" element={<SystemStatus />} />
            <Route path="/admin/service-requests" element={<AdminServiceRequests />} />
            <Route path="/admin/service-requests/:id" element={<ServiceRequestDetail />} />
            <Route path="/service-requests/:id" element={<ServiceRequestDetail />} />
            <Route path="/admin/payment-settings" element={<AdminPaymentSettings />} />
            <Route path="/admin/subscription-payments" element={<AdminSubscriptionPayments />} />
            <Route path="/admin/geodata-upload" element={<AdminGeoDataUpload />} />
            <Route path="/geoinsight-payments" element={<GeoinsightPayments />} />
            <Route path="/admin/income" element={<AdminIncomeManagement />} />
            <Route path="/admin/listing-requests" element={<ProtectedRoute requireRole={['admin', 'verification_officer']}><AdminListingRequests /></ProtectedRoute>} />
            <Route path="/admin/listing-requests/:requestId/create" element={<ProtectedRoute requireRole={['admin', 'verification_officer']}><CreateListingFromRequest /></ProtectedRoute>} />
            <Route path="/sellers" element={<BrowseSellers />} />
            <Route path="/drafts" element={<DraftListings />} />
            <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
            <Route path="/buying-process/:id" element={<ProtectedRoute><BuyingProcessDetail /></ProtectedRoute>} />
            <Route path="/revenue-management" element={<RevenueManagement />} />
            <Route path="/projects" element={<ProtectedRoute requireRole={['seller', 'broker', 'admin']}><Projects /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/service-providers" element={<ServiceProviders />} />
            <Route path="/service-providers/:id" element={<ServiceProviderDetail />} />
            <Route path="/become-service-provider" element={<BecomeServiceProvider />} />
            <Route path="/admin/service-providers" element={<AdminServiceProviders />} />
            <Route path="/service-provider/dashboard" element={<ProtectedRoute requireRole={['service_provider', 'admin']}><ServiceProviderDashboard /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/my-service-requests" element={<ProtectedRoute><MyServiceRequests /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
