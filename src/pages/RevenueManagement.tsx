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
      <div className="w-full p-6 space-y-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold">Revenue Management</h1>
          <p className="text-muted-foreground">Comprehensive revenue tracking, tax management, and payment monitoring</p>
        </div>

        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="geoinsight" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                GeoInsight Fees
              </TabsTrigger>
              <TabsTrigger value="tax" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Tax Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <RevenueOverview />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <RevenueAnalytics />
            </TabsContent>

            <TabsContent value="transactions" className="mt-6">
              <TransactionHistory />
            </TabsContent>

            <TabsContent value="geoinsight" className="mt-6">
              <GeoInsightPayments />
            </TabsContent>

            <TabsContent value="tax" className="mt-6">
              <TaxSettings />
            </TabsContent>
          </Tabs>
        </div>
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
