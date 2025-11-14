import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AuditLog } from '@/types/database';
import { Search, FileText } from 'lucide-react';

export default function AuditLogs() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchLogs();
    } else if (user && profile?.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, profile]);

  const fetchLogs = async () => {
    let query = supabase
      .from('audit_logs')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (actionTypeFilter) {
      query = query.eq('action_type', actionTypeFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
    } else if (data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action_type.toLowerCase().includes(searchLower) ||
      log.actor_id?.toLowerCase().includes(searchLower) ||
      log.listing_id?.toLowerCase().includes(searchLower)
    );
  });

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes('CREATE')) return 'default';
    if (actionType.includes('UPDATE')) return 'secondary';
    if (actionType.includes('DELETE') || actionType.includes('REJECT')) return 'destructive';
    if (actionType.includes('APPROVE') || actionType.includes('VERIFY')) return 'default';
    return 'outline';
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground">Complete activity trail for compliance and security</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter audit logs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by action, actor ID, or listing ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={fetchLogs}>Refresh</Button>
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
                    <div className="flex items-center gap-2 mb-2">
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
  );
}
