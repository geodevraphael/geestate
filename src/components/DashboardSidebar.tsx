import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
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
    roles: ['seller', 'broker', 'admin'],
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

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => roles?.includes(role as any));
  });

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen p-4">
      <nav className="space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

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
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
