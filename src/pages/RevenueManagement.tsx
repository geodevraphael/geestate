import { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RevenueOverview } from '@/components/revenue/RevenueOverview';
import { RevenueAnalytics } from '@/components/revenue/RevenueAnalytics';
import { TaxSettings } from '@/components/revenue/TaxSettings';
import { TransactionHistory } from '@/components/revenue/TransactionHistory';
import { GeoInsightPayments } from '@/components/revenue/GeoInsightPayments';

function RevenueManagementContent() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Revenue Management</h1>
          <p className="text-muted-foreground">Manage your revenue, taxes, and payments</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="geoinsight">GeoInsight Fees</TabsTrigger>
            <TabsTrigger value="tax">Tax Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <RevenueOverview />
          </TabsContent>

          <TabsContent value="analytics">
            <RevenueAnalytics />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionHistory />
          </TabsContent>

          <TabsContent value="geoinsight">
            <GeoInsightPayments />
          </TabsContent>

          <TabsContent value="tax">
            <TaxSettings />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function RevenueManagement() {
  return (
    <ProtectedRoute requireRole={['seller', 'broker', 'admin']}>
      <RevenueManagementContent />
    </ProtectedRoute>
  );
}
