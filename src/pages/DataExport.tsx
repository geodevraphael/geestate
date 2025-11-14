import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DataExport() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: 'No Data',
        description: 'No data available to export',
        variant: 'destructive',
      });
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        // Handle values that might contain commas
        const escaped = ('' + val).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    // Create blob and download
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportListings = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles(full_name, email), listing_polygons(area_m2)')
        .eq('status', 'published');

      if (error) throw error;

      if (data) {
        // Flatten data for CSV
        const flatData = data.map((listing) => ({
          id: listing.id,
          title: listing.title,
          listing_type: listing.listing_type,
          property_type: listing.property_type,
          price: listing.price,
          currency: listing.currency,
          location_label: listing.location_label,
          region: listing.region,
          district: listing.district,
          ward: listing.ward,
          area_m2: (listing as any).listing_polygons?.[0]?.area_m2 || 'N/A',
          owner_name: (listing as any).profiles?.full_name,
          verification_status: listing.verification_status,
          status: listing.status,
          created_at: listing.created_at,
        }));

        exportToCSV(flatData, `listings_export_${new Date().toISOString().split('T')[0]}.csv`);
        toast({
          title: 'Success',
          description: `Exported ${flatData.length} listings`,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export listings',
        variant: 'destructive',
      });
    }
    setExporting(false);
  };

  const exportValuations = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('valuation_estimates')
        .select('*, listings(title, location_label, price)');

      if (error) throw error;

      if (data) {
        const flatData = data.map((val) => ({
          listing_id: val.listing_id,
          listing_title: (val as any).listings?.title,
          location: (val as any).listings?.location_label,
          actual_price: (val as any).listings?.price,
          estimated_value: val.estimated_value,
          estimation_method: val.estimation_method,
          confidence_score: val.confidence_score,
          created_at: val.created_at,
        }));

        exportToCSV(flatData, `valuations_export_${new Date().toISOString().split('T')[0]}.csv`);
        toast({
          title: 'Success',
          description: `Exported ${flatData.length} valuation estimates`,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export valuations',
        variant: 'destructive',
      });
    }
    setExporting(false);
  };

  const exportSpatialRisk = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('spatial_risk_profiles')
        .select('*, listings(title, location_label)');

      if (error) throw error;

      if (data) {
        const flatData = data.map((risk) => ({
          listing_id: risk.listing_id,
          listing_title: (risk as any).listings?.title,
          location: (risk as any).listings?.location_label,
          flood_risk_level: risk.flood_risk_level,
          flood_risk_score: risk.flood_risk_score,
          near_river: risk.near_river,
          distance_to_river_m: risk.distance_to_river_m,
          elevation_m: risk.elevation_m,
          slope_percent: risk.slope_percent,
          calculated_at: risk.calculated_at,
        }));

        exportToCSV(flatData, `spatial_risk_export_${new Date().toISOString().split('T')[0]}.csv`);
        toast({
          title: 'Success',
          description: `Exported ${flatData.length} spatial risk profiles`,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export spatial risk data',
        variant: 'destructive',
      });
    }
    setExporting(false);
  };

  if (!user || profile?.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Download className="h-8 w-8" />
          Data Export
        </h1>
        <p className="text-muted-foreground">
          Export platform data for analysis and reporting
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Listings Export
            </CardTitle>
            <CardDescription>
              Export all published listings with property details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportListings} disabled={exporting} className="w-full">
              {exporting ? 'Exporting...' : 'Export Listings to CSV'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Valuation Estimates Export
            </CardTitle>
            <CardDescription>
              Export AI-generated property valuation estimates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportValuations} disabled={exporting} className="w-full">
              {exporting ? 'Exporting...' : 'Export Valuations to CSV'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Spatial Risk Profiles Export
            </CardTitle>
            <CardDescription>
              Export flood risk and environmental assessment data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportSpatialRisk} disabled={exporting} className="w-full">
              {exporting ? 'Exporting...' : 'Export Spatial Risk to CSV'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Access (Coming Soon)</CardTitle>
            <CardDescription>
              Read-only API endpoints for programmatic data access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              RESTful API endpoints will be available for:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>GET /api/public/listings</li>
              <li>GET /api/public/listings/[id]</li>
              <li>GET /api/public/listings/[id]/polygon</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
