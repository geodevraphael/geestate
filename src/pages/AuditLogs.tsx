import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AuditLog } from '@/types/database';
import { Search, FileText, X, Filter } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';

const ALLOWED_ROLES = ['admin', 'verification_officer', 'compliance_officer'];

// Action categories for filtering
const ACTION_CATEGORIES = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Create Actions' },
  { value: 'UPDATE', label: 'Update Actions' },
  { value: 'DELETE', label: 'Delete Actions' },
  { value: 'APPROVE', label: 'Approval Actions' },
  { value: 'REJECT', label: 'Rejection Actions' },
  { value: 'VERIFY', label: 'Verification Actions' },
  { value: 'PAYMENT', label: 'Payment Actions' },
  { value: 'LOGIN', label: 'Login Actions' },
  { value: 'BAN', label: 'Ban Actions' },
];

export default function AuditLogs() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionCategory, setActionCategory] = useState('all');
  const [specificAction, setSpecificAction] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);

  const hasAccess = roles?.some(role => ALLOWED_ROLES.includes(role));

  useEffect(() => {
    if (user && hasAccess) {
      fetchLogs();
    } else if (user && !hasAccess) {
      navigate('/dashboard');
    }
  }, [user, roles, hasAccess]);

  useEffect(() => {
    // Re-fetch when filters change
    if (user && hasAccess) {
      fetchLogs();
    }
  }, [actionCategory, specificAction, dateRange]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(500);

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      query = query.gte('created_at', startDate.toISOString());
    }

    // Apply specific action filter
    if (specificAction !== 'all') {
      query = query.eq('action_type', specificAction);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
    } else if (data) {
      // Extract unique action types for the dropdown
      const actions = [...new Set(data.map(log => log.action_type))].sort();
      setUniqueActions(actions);
      setLogs(data);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter((log) => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        log.action_type.toLowerCase().includes(searchLower) ||
        log.actor_id?.toLowerCase().includes(searchLower) ||
        log.listing_id?.toLowerCase().includes(searchLower) ||
        (log as any).profiles?.full_name?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Action category filter
    if (actionCategory !== 'all') {
      if (!log.action_type.includes(actionCategory)) return false;
    }

    return true;
  });

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes('CREATE')) return 'default';
    if (actionType.includes('UPDATE')) return 'secondary';
    if (actionType.includes('DELETE') || actionType.includes('REJECT')) return 'destructive';
    if (actionType.includes('APPROVE') || actionType.includes('VERIFY')) return 'default';
    if (actionType.includes('BAN')) return 'destructive';
    if (actionType.includes('PAYMENT')) return 'outline';
    return 'outline';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActionCategory('all');
    setSpecificAction('all');
    setDateRange('all');
  };

  const hasActiveFilters = searchTerm || actionCategory !== 'all' || specificAction !== 'all' || dateRange !== 'all';

  if (loading && logs.length === 0) {
    return (
      <MainLayout>
        <div className="w-full p-6">Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">Complete activity trail for compliance and security</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <CardDescription>Search and filter audit logs</CardDescription>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, actor name, or listing ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Category */}
              <div className="space-y-2">
                <Label>Action Category</Label>
                <Select value={actionCategory} onValueChange={setActionCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specific Action */}
              <div className="space-y-2">
                <Label>Specific Action</Label>
                <Select value={specificAction} onValueChange={setSpecificAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Refresh Button */}
              <div className="space-y-2">
                <Label className="invisible">Actions</Label>
                <Button onClick={fetchLogs} className="w-full" disabled={loading}>
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Log ({filteredLogs.length} entries)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No audit logs found</p>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant={getActionBadgeColor(log.action_type)}>
                          {log.action_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {log.actor_id && (
                          <p>
                            <span className="font-semibold">Actor:</span>{' '}
                            {(log as any).profiles?.full_name || log.actor_id}
                          </p>
                        )}
                        {log.listing_id && (
                          <p>
                            <span className="font-semibold">Listing:</span>{' '}
                            <button
                              onClick={() => navigate(`/listings/${log.listing_id}`)}
                              className="text-primary hover:underline"
                            >
                              {log.listing_id.slice(0, 8)}...
                            </button>
                          </p>
                        )}
                        {log.action_details && (
                          <p className="text-muted-foreground">
                            <span className="font-semibold">Details:</span>{' '}
                            {typeof log.action_details === 'string'
                              ? log.action_details.substring(0, 100)
                              : JSON.stringify(log.action_details).substring(0, 100)}
                          </p>
                        )}
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground">IP: {log.ip_address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
