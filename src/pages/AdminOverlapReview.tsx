import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  MapPin, 
  Layers, 
  Download, 
  Archive, 
  Trash2, 
  Eye,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  AlertCircle,
  FileText,
  Settings,
  User,
  Mail,
  Phone,
  Map as MapIcon,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import * as turf from '@turf/turf';
import { format } from 'date-fns';

interface OwnerInfo {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  profile_photo_url: string | null;
}

interface OverlapPair {
  id: string;
  listing1_id: string;
  listing1_title: string;
  listing1_status: string;
  listing1_owner: OwnerInfo;
  listing1_region: string | null;
  listing1_district: string | null;
  listing1_geojson: any;
  listing1_created_at: string;
  listing2_id: string;
  listing2_title: string;
  listing2_status: string;
  listing2_owner: OwnerInfo;
  listing2_region: string | null;
  listing2_district: string | null;
  listing2_geojson: any;
  listing2_created_at: string;
  overlap_percentage: number;
  overlap_area_m2: number;
  intersection_geojson: any;
  is_same_owner: boolean;
  created_at: Date;
}

interface ListingPolygon {
  listing_id: string;
  geojson: any;
  area_m2: number | null;
  listings: {
    id: string;
    title: string;
    status: string;
    owner_id: string;
    region: string | null;
    district: string | null;
    created_at: string;
    profiles: OwnerInfo;
  };
}

interface OverlapStats {
  total: number;
  critical: number;
  high: number;
  low: number;
  sameOwner: number;
  differentOwner: number;
}

interface AuditLogEntry {
  id: string;
  action_type: string;
  actor_id: string;
  action_details: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AdminOverlapReview() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [overlaps, setOverlaps] = useState<OverlapPair[]>([]);
  const [filteredOverlaps, setFilteredOverlaps] = useState<OverlapPair[]>([]);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const [selectedOverlaps, setSelectedOverlaps] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [actionDialog, setActionDialog] = useState<{open: boolean; type: 'archive' | 'delete' | null; listingId: string | null; listingTitle: string | null}>({
    open: false,
    type: null,
    listingId: null,
    listingTitle: null
  });
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [mapDialog, setMapDialog] = useState<{open: boolean; overlap: OverlapPair | null}>({
    open: false,
    overlap: null
  });

  const allowedRoles = ['admin', 'verification_officer', 'spatial_analyst'];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (roles && roles.length > 0 && !roles.some((r) => allowedRoles.includes(r))) {
      navigate('/dashboard');
      toast.error('You do not have permission to access this page');
      return;
    }
    setLoading(false);
    fetchAuditLogs();
  }, [user, roles, navigate]);

  // Filter overlaps when search/filters change
  useEffect(() => {
    let filtered = [...overlaps];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => 
        o.listing1_title.toLowerCase().includes(term) ||
        o.listing2_title.toLowerCase().includes(term) ||
        o.listing1_owner.full_name.toLowerCase().includes(term) ||
        o.listing2_owner.full_name.toLowerCase().includes(term) ||
        o.listing1_region?.toLowerCase().includes(term) ||
        o.listing2_region?.toLowerCase().includes(term)
      );
    }
    
    if (severityFilter !== 'all') {
      filtered = filtered.filter(o => {
        if (severityFilter === 'critical') return o.overlap_percentage >= 50;
        if (severityFilter === 'high') return o.overlap_percentage >= 20 && o.overlap_percentage < 50;
        if (severityFilter === 'low') return o.overlap_percentage < 20;
        return true;
      });
    }
    
    if (ownerFilter !== 'all') {
      filtered = filtered.filter(o => {
        if (ownerFilter === 'same') return o.is_same_owner;
        if (ownerFilter === 'different') return !o.is_same_owner;
        return true;
      });
    }
    
    setFilteredOverlaps(filtered);
  }, [overlaps, searchTerm, severityFilter, ownerFilter]);

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action_type,
          actor_id,
          action_details,
          created_at,
          profiles:actor_id (
            full_name,
            email
          )
        `)
        .in('action_type', ['AUTO_DELETE_OVERLAP', 'ARCHIVE_DUPLICATE_LISTING', 'DELETE_DUPLICATE_LISTING'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs((data || []) as unknown as AuditLogEntry[]);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const getStats = (): OverlapStats => {
    return {
      total: overlaps.length,
      critical: overlaps.filter(o => o.overlap_percentage >= 50).length,
      high: overlaps.filter(o => o.overlap_percentage >= 20 && o.overlap_percentage < 50).length,
      low: overlaps.filter(o => o.overlap_percentage < 20).length,
      sameOwner: overlaps.filter(o => o.is_same_owner).length,
      differentOwner: overlaps.filter(o => !o.is_same_owner).length,
    };
  };

  const analyzeOverlaps = async () => {
    setAnalyzing(true);
    try {
      const { data: polygons, error } = await supabase
        .from('listing_polygons')
        .select(`
          listing_id,
          geojson,
          area_m2,
          listings!inner (
            id,
            title,
            status,
            owner_id,
            region,
            district,
            created_at,
            profiles:owner_id (
              id,
              full_name,
              email,
              phone,
              profile_photo_url
            )
          )
        `)
        .not('listings.status', 'in', '("draft","archived")');

      if (error) throw error;

      const typedPolygons = polygons as unknown as ListingPolygon[];
      const detectedOverlaps: OverlapPair[] = [];
      const processedPairs = new Set<string>();

      for (let i = 0; i < typedPolygons.length; i++) {
        const poly1 = typedPolygons[i];
        if (!poly1.geojson?.coordinates) continue;

        let turfPoly1;
        try {
          turfPoly1 = turf.polygon(poly1.geojson.coordinates);
        } catch {
          continue;
        }

        const area1 = turf.area(turfPoly1);

        for (let j = i + 1; j < typedPolygons.length; j++) {
          const poly2 = typedPolygons[j];
          if (!poly2.geojson?.coordinates) continue;

          const pairKey = [poly1.listing_id, poly2.listing_id].sort().join('-');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          let turfPoly2;
          try {
            turfPoly2 = turf.polygon(poly2.geojson.coordinates);
          } catch {
            continue;
          }

          // Quick bounding box check
          const bbox1 = turf.bbox(turfPoly1);
          const bbox2 = turf.bbox(turfPoly2);
          
          if (bbox1[2] < bbox2[0] || bbox1[0] > bbox2[2] ||
              bbox1[3] < bbox2[1] || bbox1[1] > bbox2[3]) {
            continue;
          }

          try {
            const intersection = turf.intersect(turf.featureCollection([turfPoly1, turfPoly2]));
            
            if (intersection) {
              const intersectionArea = turf.area(intersection);
              const overlapPercentage = (intersectionArea / Math.min(area1, turf.area(turfPoly2))) * 100;

              if (overlapPercentage >= 10) {
                detectedOverlaps.push({
                  id: pairKey,
                  listing1_id: poly1.listing_id,
                  listing1_title: poly1.listings.title,
                  listing1_status: poly1.listings.status,
                  listing1_owner: poly1.listings.profiles,
                  listing1_region: poly1.listings.region,
                  listing1_district: poly1.listings.district,
                  listing1_geojson: poly1.geojson,
                  listing1_created_at: poly1.listings.created_at,
                  listing2_id: poly2.listing_id,
                  listing2_title: poly2.listings.title,
                  listing2_status: poly2.listings.status,
                  listing2_owner: poly2.listings.profiles,
                  listing2_region: poly2.listings.region,
                  listing2_district: poly2.listings.district,
                  listing2_geojson: poly2.geojson,
                  listing2_created_at: poly2.listings.created_at,
                  overlap_percentage: Math.round(overlapPercentage * 10) / 10,
                  overlap_area_m2: Math.round(intersectionArea),
                  intersection_geojson: intersection.geometry,
                  is_same_owner: poly1.listings.owner_id === poly2.listings.owner_id,
                  created_at: new Date(),
                });
              }
            }
          } catch (e) {
            console.error('Error calculating intersection:', e);
          }
        }
      }

      detectedOverlaps.sort((a, b) => b.overlap_percentage - a.overlap_percentage);
      setOverlaps(detectedOverlaps);
      setLastAnalyzed(new Date());
      toast.success(`Analysis complete: Found ${detectedOverlaps.length} overlapping pairs`);
    } catch (error) {
      console.error('Error analyzing overlaps:', error);
      toast.error('Failed to analyze overlaps');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleArchiveListing = async (listingId: string, listingTitle: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'archived' })
        .eq('id', listingId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        action_type: 'ARCHIVE_DUPLICATE_LISTING',
        actor_id: user?.id,
        listing_id: listingId,
        action_details: { 
          listing_title: listingTitle,
          reason: actionNotes || 'Duplicate polygon detected' 
        }
      });

      toast.success(`"${listingTitle}" archived successfully`);
      setActionDialog({ open: false, type: null, listingId: null, listingTitle: null });
      setActionNotes('');
      
      setOverlaps(prev => prev.filter(o => 
        o.listing1_id !== listingId && o.listing2_id !== listingId
      ));
      fetchAuditLogs();
    } catch (error) {
      console.error('Error archiving listing:', error);
      toast.error('Failed to archive listing');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteListing = async (listingId: string, listingTitle: string) => {
    setProcessing(true);
    try {
      await supabase.from('listing_polygons').delete().eq('listing_id', listingId);
      await supabase.from('listing_media').delete().eq('listing_id', listingId);
      
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        action_type: 'DELETE_DUPLICATE_LISTING',
        actor_id: user?.id,
        action_details: { 
          deleted_listing_id: listingId,
          deleted_listing_title: listingTitle,
          reason: actionNotes || 'Duplicate polygon detected' 
        }
      });

      toast.success(`"${listingTitle}" deleted permanently`);
      setActionDialog({ open: false, type: null, listingId: null, listingTitle: null });
      setActionNotes('');
      
      setOverlaps(prev => prev.filter(o => 
        o.listing1_id !== listingId && o.listing2_id !== listingId
      ));
      fetchAuditLogs();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    } finally {
      setProcessing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Severity', 'Property 1', 'Owner 1', 'Email 1', 'Region 1', 'Property 2', 'Owner 2', 'Email 2', 'Region 2', 'Overlap %', 'Overlap Area (m²)', 'Same Owner'];
    const rows = filteredOverlaps.map(o => [
      o.overlap_percentage >= 50 ? 'Critical' : o.overlap_percentage >= 20 ? 'High' : 'Low',
      o.listing1_title,
      o.listing1_owner.full_name,
      o.listing1_owner.email,
      o.listing1_region || '',
      o.listing2_title,
      o.listing2_owner.full_name,
      o.listing2_owner.email,
      o.listing2_region || '',
      o.overlap_percentage,
      o.overlap_area_m2,
      o.is_same_owner ? 'Yes' : 'No'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overlap-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Report exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedOverlaps.size === filteredOverlaps.length) {
      setSelectedOverlaps(new Set());
    } else {
      setSelectedOverlaps(new Set(filteredOverlaps.map(o => o.id)));
    }
  };

  const getSeverityBadge = (percentage: number) => {
    if (percentage >= 50) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Critical ({percentage}%)</Badge>;
    } else if (percentage >= 20) {
      return <Badge className="bg-orange-500 text-white gap-1"><AlertTriangle className="h-3 w-3" /> High ({percentage}%)</Badge>;
    } else {
      return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Low ({percentage}%)</Badge>;
    }
  };

  const formatArea = (area: number) => {
    if (area >= 10000) {
      return `${(area / 10000).toFixed(2)} ha`;
    }
    return `${area.toLocaleString()} m²`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderOwnerInfo = (owner: OwnerInfo, region?: string | null, district?: string | null) => (
    <div className="flex items-start gap-3">
      <Avatar className="h-10 w-10 border">
        <AvatarImage src={owner.profile_photo_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {getInitials(owner.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{owner.full_name}</p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {owner.email}
        </p>
        {owner.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {owner.phone}
          </p>
        )}
        {(region || district) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[district, region].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    </div>
  );

  const openMapVisualization = (overlap: OverlapPair) => {
    setMapDialog({ open: true, overlap });
  };

  const stats = getStats();

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Polygon Overlap Detection
            </h1>
            <p className="text-muted-foreground mt-1">
              Auto-detects overlaps, blocks &gt;20%, notifies users, and deletes duplicates
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={exportToCSV}
              disabled={overlaps.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              onClick={analyzeOverlaps} 
              disabled={analyzing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Overlaps</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Layers className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical (≥50%)</p>
                  <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High (20-50%)</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.high}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-muted-foreground">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Different Owners</p>
                  <p className="text-2xl font-bold">{stats.differentOwner}</p>
                </div>
                <User className="h-8 w-8 text-muted-foreground opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {lastAnalyzed && (
          <Alert variant={stats.critical > 0 ? 'destructive' : 'default'}>
            <Clock className="h-4 w-4" />
            <AlertTitle>Last Analysis: {lastAnalyzed.toLocaleString()}</AlertTitle>
            <AlertDescription>
              Found {overlaps.length} overlapping property pairs.
              {stats.critical > 0 && (
                <span className="font-medium ml-1">
                  {stats.critical} critical overlap(s) require immediate attention.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overlaps" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overlaps" className="gap-2">
              <Layers className="h-4 w-4" />
              Overlaps ({filteredOverlaps.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              Action Logs ({auditLogs.length})
            </TabsTrigger>
            <TabsTrigger value="policy" className="gap-2">
              <Settings className="h-4 w-4" />
              Policy Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overlaps" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by property name, owner, or region..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical (≥50%)</SelectItem>
                      <SelectItem value="high">High (20-50%)</SelectItem>
                      <SelectItem value="low">Low (&lt;20%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      <SelectItem value="same">Same Owner</SelectItem>
                      <SelectItem value="different">Different Owners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Overlaps List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Overlapping Property Pairs</CardTitle>
                    <CardDescription>
                      Properties with ≥10% overlap. Items ≥20% are auto-blocked and deleted on upload.
                    </CardDescription>
                  </div>
                  {selectedOverlaps.size > 0 && (
                    <Badge variant="outline">{selectedOverlaps.size} selected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredOverlaps.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {lastAnalyzed ? (
                      <>
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                        <p className="font-medium">No overlapping properties found</p>
                        <p className="text-sm mt-1">All property boundaries are clear</p>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No analysis performed yet</p>
                        <p className="text-sm mt-1">Click "Run Analysis" to detect overlapping properties</p>
                      </>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {filteredOverlaps.map((overlap) => (
                        <Card 
                          key={overlap.id} 
                          className={`border-l-4 ${
                            overlap.overlap_percentage >= 50 
                              ? 'border-l-destructive bg-destructive/5' 
                              : overlap.overlap_percentage >= 20 
                                ? 'border-l-orange-500 bg-orange-500/5' 
                                : 'border-l-muted'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row gap-4">
                              {/* Property 1 */}
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">Property 1</Badge>
                                  <Badge variant="secondary" className="text-xs">{overlap.listing1_status}</Badge>
                                </div>
                                <h4 className="font-semibold">{overlap.listing1_title}</h4>
                                {renderOwnerInfo(overlap.listing1_owner, overlap.listing1_region, overlap.listing1_district)}
                                <p className="text-xs text-muted-foreground">
                                  Created: {format(new Date(overlap.listing1_created_at), 'MMM d, yyyy')}
                                </p>
                              </div>

                              {/* Overlap Info */}
                              <div className="flex flex-col items-center justify-center px-4 py-2 bg-muted/50 rounded-lg min-w-[160px]">
                                <div className="text-center mb-2">
                                  {getSeverityBadge(overlap.overlap_percentage)}
                                </div>
                                <p className="text-lg font-bold">{formatArea(overlap.overlap_area_m2)}</p>
                                <p className="text-xs text-muted-foreground">overlap area</p>
                                <Badge variant={overlap.is_same_owner ? 'secondary' : 'outline'} className="mt-2">
                                  {overlap.is_same_owner ? 'Same Owner' : 'Different Owners'}
                                </Badge>
                              </div>

                              {/* Property 2 */}
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">Property 2</Badge>
                                  <Badge variant="secondary" className="text-xs">{overlap.listing2_status}</Badge>
                                </div>
                                <h4 className="font-semibold">{overlap.listing2_title}</h4>
                                {renderOwnerInfo(overlap.listing2_owner, overlap.listing2_region, overlap.listing2_district)}
                                <p className="text-xs text-muted-foreground">
                                  Created: {format(new Date(overlap.listing2_created_at), 'MMM d, yyyy')}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col gap-2 min-w-[120px]">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openMapVisualization(overlap)}
                                  className="gap-2 w-full"
                                >
                                  <MapIcon className="h-4 w-4" />
                                  View Map
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`/listings/${overlap.listing1_id}`, '_blank')}
                                  className="gap-2 w-full"
                                >
                                  <Eye className="h-4 w-4" />
                                  View #1
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`/listings/${overlap.listing2_id}`, '_blank')}
                                  className="gap-2 w-full"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View #2
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setActionDialog({ 
                                    open: true, 
                                    type: 'archive', 
                                    listingId: overlap.listing2_id,
                                    listingTitle: overlap.listing2_title
                                  })}
                                  className="gap-2 w-full text-orange-600 hover:text-orange-700"
                                >
                                  <Archive className="h-4 w-4" />
                                  Archive
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setActionDialog({ 
                                    open: true, 
                                    type: 'delete', 
                                    listingId: overlap.listing2_id,
                                    listingTitle: overlap.listing2_title
                                  })}
                                  className="gap-2 w-full text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overlap Resolution History</CardTitle>
                <CardDescription>
                  Recent actions taken on overlapping properties (auto-deletions, manual archives, deletions)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No actions recorded yet</p>
                    <p className="text-sm mt-1">Action logs will appear here after overlap resolutions</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {auditLogs.map((log) => (
                        <Card key={log.id} className={`border-l-4 ${
                          log.action_type === 'AUTO_DELETE_OVERLAP' 
                            ? 'border-l-destructive' 
                            : log.action_type === 'DELETE_DUPLICATE_LISTING'
                              ? 'border-l-orange-500'
                              : 'border-l-muted'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={
                                    log.action_type === 'AUTO_DELETE_OVERLAP' ? 'destructive' : 
                                    log.action_type === 'DELETE_DUPLICATE_LISTING' ? 'default' : 'secondary'
                                  }>
                                    {log.action_type === 'AUTO_DELETE_OVERLAP' ? 'Auto-Deleted' : 
                                     log.action_type === 'DELETE_DUPLICATE_LISTING' ? 'Manually Deleted' : 'Archived'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                                  </span>
                                </div>
                                
                                <p className="font-medium">
                                  {log.action_details?.deleted_listing_title || log.action_details?.listing_title || 'Unknown Listing'}
                                </p>
                                
                                {log.action_details?.overlap_percentage && (
                                  <p className="text-sm text-muted-foreground">
                                    {log.action_details.overlap_percentage.toFixed(1)}% overlap with "{log.action_details.overlapping_listing_title}"
                                  </p>
                                )}
                                
                                {log.action_details?.reason && (
                                  <p className="text-sm text-muted-foreground italic">
                                    Reason: {log.action_details.reason}
                                  </p>
                                )}
                                
                                {log.profiles && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    By: {log.profiles.full_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Automatic Overlap Detection Policy</CardTitle>
                <CardDescription>
                  How the system handles polygon overlaps during listing creation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-700 dark:text-green-400">Allowed (&lt;20%)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Minor overlaps allowed for adjacent properties. Users see a warning but can proceed.
                    </p>
                  </div>
                  <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <h4 className="font-medium text-orange-700 dark:text-orange-400">Warning (10-20%)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Users warned about overlap. Flagged for admin review after submission.
                    </p>
                  </div>
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <h4 className="font-medium text-red-700 dark:text-red-400">Blocked & Deleted (≥20%)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Listing automatically rejected and permanently deleted. User notified via email.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Automatic Actions for &gt;20% Overlap</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">1.</span>
                      New listing is <strong>permanently deleted</strong> from the database
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">2.</span>
                      Uploader receives an <strong>email notification</strong> explaining the rejection
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">3.</span>
                      Uploader receives an <strong>in-app notification</strong> with details
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">4.</span>
                      <strong>All admins are notified</strong> via in-app notification
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">5.</span>
                      An <strong>audit log entry</strong> is created for compliance tracking
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">How Overlap is Calculated</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Overlap = (Intersection Area / Smaller Polygon Area) × 100
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Using smaller polygon ensures duplicates are detected at ~100%
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Exact duplicate detection uses geometric equality before overlap calc
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.type === 'archive' ? 'Archive Listing' : 'Delete Listing'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.type === 'archive' 
                  ? `This will archive "${actionDialog.listingTitle}" and remove it from public view. It can be restored later.`
                  : `This will permanently delete "${actionDialog.listingTitle}" and all associated data. This action cannot be undone.`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason / Notes</label>
                <Textarea
                  placeholder="Enter reason for this action..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setActionDialog({ open: false, type: null, listingId: null, listingTitle: null })}
              >
                Cancel
              </Button>
              <Button
                variant={actionDialog.type === 'delete' ? 'destructive' : 'default'}
                onClick={() => {
                  if (actionDialog.listingId && actionDialog.listingTitle) {
                    if (actionDialog.type === 'archive') {
                      handleArchiveListing(actionDialog.listingId, actionDialog.listingTitle);
                    } else {
                      handleDeleteListing(actionDialog.listingId, actionDialog.listingTitle);
                    }
                  }
                }}
                disabled={processing}
              >
                {processing ? 'Processing...' : actionDialog.type === 'archive' ? 'Archive' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Map Visualization Dialog */}
        <Dialog open={mapDialog.open} onOpenChange={(open) => setMapDialog({ ...mapDialog, open })}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapIcon className="h-5 w-5" />
                Overlap Visualization
              </DialogTitle>
              <DialogDescription>
                {mapDialog.overlap && (
                  <>
                    {mapDialog.overlap.listing1_title} overlaps with {mapDialog.overlap.listing2_title} by {mapDialog.overlap.overlap_percentage}%
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-[400px] relative">
              {mapDialog.overlap && (
                <MapVisualization 
                  polygon1={mapDialog.overlap.listing1_geojson}
                  polygon2={mapDialog.overlap.listing2_geojson}
                  intersection={mapDialog.overlap.intersection_geojson}
                  title1={mapDialog.overlap.listing1_title}
                  title2={mapDialog.overlap.listing2_title}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// Simple SVG Map Visualization Component
function MapVisualization({ 
  polygon1, 
  polygon2, 
  intersection,
  title1,
  title2
}: { 
  polygon1: any; 
  polygon2: any; 
  intersection: any;
  title1: string;
  title2: string;
}) {
  if (!polygon1?.coordinates || !polygon2?.coordinates) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Unable to render map visualization</p>
      </div>
    );
  }

  // Calculate bounds
  const allCoords = [
    ...polygon1.coordinates[0],
    ...polygon2.coordinates[0]
  ];
  
  const minLng = Math.min(...allCoords.map((c: number[]) => c[0]));
  const maxLng = Math.max(...allCoords.map((c: number[]) => c[0]));
  const minLat = Math.min(...allCoords.map((c: number[]) => c[1]));
  const maxLat = Math.max(...allCoords.map((c: number[]) => c[1]));

  const padding = 0.1;
  const width = 100;
  const height = 100;
  const lngRange = (maxLng - minLng) * (1 + padding * 2);
  const latRange = (maxLat - minLat) * (1 + padding * 2);
  const scale = Math.min(width / lngRange, height / latRange);

  const toSvgCoord = (coord: number[]) => {
    const x = ((coord[0] - minLng) / lngRange + padding / (1 + padding * 2)) * width;
    const y = height - ((coord[1] - minLat) / latRange + padding / (1 + padding * 2)) * height;
    return [x, y];
  };

  const coordsToPath = (coords: number[][]) => {
    return coords.map((c, i) => {
      const [x, y] = toSvgCoord(c);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') + ' Z';
  };

  const path1 = coordsToPath(polygon1.coordinates[0]);
  const path2 = coordsToPath(polygon2.coordinates[0]);
  const intersectionPath = intersection?.coordinates?.[0] 
    ? coordsToPath(intersection.coordinates[0])
    : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative bg-muted/30 rounded-lg overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-muted-foreground/20" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Polygon 1 */}
          <path 
            d={path1} 
            fill="hsl(var(--primary))" 
            fillOpacity="0.3" 
            stroke="hsl(var(--primary))" 
            strokeWidth="0.5"
          />

          {/* Polygon 2 */}
          <path 
            d={path2} 
            fill="hsl(var(--secondary))" 
            fillOpacity="0.3" 
            stroke="hsl(var(--secondary-foreground))" 
            strokeWidth="0.5"
          />

          {/* Intersection (overlap area) */}
          {intersectionPath && (
            <path 
              d={intersectionPath} 
              fill="hsl(var(--destructive))" 
              fillOpacity="0.6" 
              stroke="hsl(var(--destructive))" 
              strokeWidth="0.8"
            />
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/30 border border-primary" />
          <span className="text-sm">{title1}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-secondary/30 border border-secondary-foreground" />
          <span className="text-sm">{title2}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive/60 border border-destructive" />
          <span className="text-sm">Overlap Area</span>
        </div>
      </div>
    </div>
  );
}
