import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X, 
  ChevronRight,
  FileCheck,
  DollarSign,
  Flag,
  MessageSquare,
  Building2,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TodoTask {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium';
  count: number;
  link: string;
  icon: any;
  category: string;
}

export function AdminTodoPopup() {
  const { hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasRole('admin') || hasRole('verification_officer') || hasRole('compliance_officer')) {
      fetchTasks();
      const interval = setInterval(fetchTasks, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [hasRole]);

  const fetchTasks = async () => {
    try {
      const taskPromises = [
        // Critical Priority
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('verification_status', 'pending'),
        
        supabase
          .from('payment_proofs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_admin_review'),
        
        supabase
          .from('deal_closures')
          .select('id', { count: 'exact', head: true })
          .eq('closure_status', 'pending_admin_validation'),
        
        supabase
          .from('disputes')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'in_review']),
        
        supabase
          .from('compliance_flags')
          .select('id', { count: 'exact', head: true })
          .eq('resolved', false),
        
        supabase
          .from('fraud_signals')
          .select('id', { count: 'exact', head: true }),
        
        // High Priority
        supabase
          .from('institutional_sellers')
          .select('id', { count: 'exact', head: true })
          .eq('is_approved', false),
        
        supabase
          .from('geoinsight_payment_proofs')
          .select('id', { count: 'exact', head: true })
          .in('status', ['submitted', 'under_review']),
        
        supabase
          .from('role_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        
        supabase
          .from('service_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ];

      const results = await Promise.all(taskPromises);

      const newTasks: TodoTask[] = [
        // Critical
        {
          id: 'listing-verification',
          title: 'Listing Verifications',
          description: 'Pending property verifications',
          priority: 'critical' as const,
          count: results[0].count || 0,
          link: '/admin/verify-listings',
          icon: FileCheck,
          category: 'Verification'
        },
        {
          id: 'payment-proofs',
          title: 'Payment Proofs',
          description: 'Awaiting admin review',
          priority: 'critical' as const,
          count: results[1].count || 0,
          link: '/admin/payment-proofs',
          icon: DollarSign,
          category: 'Payments'
        },
        {
          id: 'deal-closures',
          title: 'Deal Closures',
          description: 'Pending validation',
          priority: 'critical' as const,
          count: results[2].count || 0,
          link: '/admin/payments',
          icon: CheckCircle2,
          category: 'Transactions'
        },
        {
          id: 'disputes',
          title: 'Open Disputes',
          description: 'Require resolution',
          priority: 'critical' as const,
          count: results[3].count || 0,
          link: '/disputes',
          icon: AlertCircle,
          category: 'Support'
        },
        {
          id: 'compliance-flags',
          title: 'Compliance Flags',
          description: 'Unresolved issues',
          priority: 'critical' as const,
          count: results[4].count || 0,
          link: '/compliance-flags',
          icon: Flag,
          category: 'Compliance'
        },
        {
          id: 'fraud-signals',
          title: 'Fraud Signals',
          description: 'Requires investigation',
          priority: 'critical' as const,
          count: results[5].count || 0,
          link: '/fraud-detection',
          icon: AlertTriangle,
          category: 'Security'
        },
        // High Priority
        {
          id: 'institutional-sellers',
          title: 'Institution Applications',
          description: 'Pending approval',
          priority: 'high' as const,
          count: results[6].count || 0,
          link: '/admin/institutions',
          icon: Building2,
          category: 'Onboarding'
        },
        {
          id: 'geoinsight-payments',
          title: 'GeoInsight Payments',
          description: 'Payment proofs to review',
          priority: 'high' as const,
          count: results[7].count || 0,
          link: '/admin/income',
          icon: DollarSign,
          category: 'Revenue'
        },
        {
          id: 'role-requests',
          title: 'Role Requests',
          description: 'User role applications',
          priority: 'high' as const,
          count: results[8].count || 0,
          link: '/admin/approvals',
          icon: UserCheck,
          category: 'Access'
        },
        {
          id: 'service-requests',
          title: 'Service Requests',
          description: 'Awaiting assignment',
          priority: 'high' as const,
          count: results[9].count || 0,
          link: '/admin/service-requests',
          icon: MessageSquare,
          category: 'Services'
        },
      ].filter(task => task.count > 0); // Only show tasks with pending items

      setTasks(newTasks);
    } catch (error) {
      console.error('Error fetching admin tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTasks = tasks.reduce((sum, task) => sum + task.count, 0);
  const criticalTasks = tasks.filter(t => t.priority === 'critical').reduce((sum, t) => sum + t.count, 0);
  const highTasks = tasks.filter(t => t.priority === 'high').reduce((sum, t) => sum + t.count, 0);

  if (!hasRole('admin') && !hasRole('verification_officer') && !hasRole('compliance_officer')) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-all",
          totalTasks > 0 ? "animate-pulse" : ""
        )}
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <Clock className="h-6 w-6" />
            {totalTasks > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {totalTasks > 99 ? '99+' : totalTasks}
              </Badge>
            )}
          </div>
        )}
      </Button>

      {/* Popup Panel */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] shadow-2xl z-50 animate-in slide-in-from-bottom-5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Admin Tasks
              </span>
              <div className="flex gap-1">
                {criticalTasks > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalTasks} Critical
                  </Badge>
                )}
                {highTasks > 0 && (
                  <Badge variant="default" className="text-xs">
                    {highTasks} High
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 px-4 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No pending tasks at the moment.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {tasks.map((task) => {
                    const Icon = task.icon;
                    return (
                      <Link
                        key={task.id}
                        to={task.link}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "block p-3 rounded-lg border transition-colors hover:bg-accent group",
                          task.priority === 'critical' && "border-red-500/50 bg-red-50/5 dark:bg-red-950/10",
                          task.priority === 'high' && "border-orange-500/50 bg-orange-50/5 dark:bg-orange-950/10"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            task.priority === 'critical' && "bg-red-100 dark:bg-red-900/20",
                            task.priority === 'high' && "bg-orange-100 dark:bg-orange-900/20",
                            task.priority === 'medium' && "bg-blue-100 dark:bg-blue-900/20"
                          )}>
                            <Icon className={cn(
                              "h-4 w-4",
                              task.priority === 'critical' && "text-red-600 dark:text-red-400",
                              task.priority === 'high' && "text-orange-600 dark:text-orange-400",
                              task.priority === 'medium' && "text-blue-600 dark:text-blue-400"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{task.title}</p>
                              <Badge variant="secondary" className="shrink-0">
                                {task.count}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                            <p className="text-xs text-muted-foreground mt-1 opacity-70">{task.category}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
