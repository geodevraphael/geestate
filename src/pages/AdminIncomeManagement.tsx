import { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminIncomeOverview } from '@/components/admin/AdminIncomeOverview';
import { AdminIncomeRecords } from '@/components/admin/AdminIncomeRecords';
import { AdminPaymentProofs } from '@/components/admin/AdminPaymentProofs';
import { AdminInvoices } from '@/components/admin/AdminInvoices';
import { BackfillListingFeesButton } from '@/components/admin/BackfillListingFeesButton';

function AdminIncomeManagementContent() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Income Management</h1>
            <p className="text-muted-foreground">Manage GeoInsight revenue and commissions</p>
          </div>
          <BackfillListingFeesButton />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="records">Income Records</TabsTrigger>
            <TabsTrigger value="proofs">Payment Proofs</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminIncomeOverview />
          </TabsContent>

          <TabsContent value="records">
            <AdminIncomeRecords />
          </TabsContent>

          <TabsContent value="proofs">
            <AdminPaymentProofs />
          </TabsContent>

          <TabsContent value="invoices">
            <AdminInvoices />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function AdminIncomeManagement() {
  return (
    <ProtectedRoute requireRole={['admin']}>
      <AdminIncomeManagementContent />
    </ProtectedRoute>
  );
}
