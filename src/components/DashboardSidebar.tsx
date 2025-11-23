import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import {
  LayoutDashboard,
  MapPin,
  List,
  MessageSquare,
  Star,
  Shield,
  FileText,
  CreditCard,
  Building,
  Users,
  FileCheck,
  BarChart3,
  Download,
  Webhook,
  Activity,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: any;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Browse Map',
    href: '/map',
    icon: MapPin,
  },
  {
    title: 'Listings',
    href: '/listings',
    icon: List,
  },
  {
    title: 'Messages',
    href: '/messages',
    icon: MessageSquare,
  },
  {
    title: 'CRM',
    href: '/crm',
    icon: Briefcase,
    roles: ['seller', 'broker', 'admin'],
  },
  {
    title: 'Revenue',
    href: '/revenue-management',
    icon: BarChart3,
    roles: ['seller', 'broker', 'admin'],
  },
  {
    title: 'Reputation',
    href: '/reputation',
    icon: Star,
  },
  {
    title: 'Disputes',
    href: '/disputes',
    icon: Shield,
  },
  {
    title: 'Visit Requests',
    href: '/visit-requests',
    icon: FileText,
  },
  {
    title: 'Payments',
    href: '/payment-proofs',
    icon: CreditCard,
    roles: ['seller', 'broker'],
  },
  {
    title: 'My GeoInsight Fees',
    href: '/geoinsight-payments',
    icon: CreditCard,
    roles: ['seller', 'broker'],
  },
  {
    title: 'Institution Dashboard',
    href: '/institutional-seller/dashboard',
    icon: Building,
    roles: ['seller', 'broker'],
  },
  {
    title: 'Admin Payments',
    href: '/admin/payments',
    icon: CreditCard,
    roles: ['admin', 'verification_officer', 'compliance_officer'],
  },
  {
    title: 'Income Management',
    href: '/admin/income',
    icon: CreditCard,
    roles: ['admin', 'compliance_officer'],
  },
  {
    title: 'Compliance',
    href: '/admin/compliance',
    icon: Shield,
    roles: ['admin', 'verification_officer', 'compliance_officer'],
  },
  {
    title: 'Verify Listings',
    href: '/admin/verification',
    icon: FileCheck,
    roles: ['admin', 'verification_officer', 'compliance_officer'],
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Institutions',
    href: '/institutional-sellers',
    icon: Building,
    roles: ['admin'],
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    roles: ['admin', 'verification_officer', 'compliance_officer'],
  },
  {
    title: 'Audit Logs',
    href: '/audit-logs',
    icon: FileText,
    roles: ['admin', 'verification_officer', 'compliance_officer'],
  },
  {
    title: 'Data Export',
    href: '/data-export',
    icon: Download,
    roles: ['admin', 'verification_officer', 'compliance_officer'],
  },
  {
    title: 'Integrations',
    href: '/integrations',
    icon: Webhook,
    roles: ['admin'],
  },
  {
    title: 'System Status',
    href: '/admin/system-status',
    icon: Activity,
    roles: ['admin'],
  },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { roles } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => roles?.includes(role as any));
  });

  return (
    <aside className={cn(
      "hidden md:block border-r border-border bg-card h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 space-y-2">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full transition-all",
            collapsed ? "px-0 justify-center" : "justify-end"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center justify-center px-3 py-2 rounded-md transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </TooltipProvider>
      </div>
    </aside>
  );
}
