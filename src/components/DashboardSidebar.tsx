import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Calendar,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShoppingCart,
  Settings,
  Home,
  Wrench,
  Layers,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: any;
  roles?: string[];
}

interface NavGroup {
  title: string;
  icon: any;
  items: NavItem[];
  roles?: string[];
}

// Grouped navigation structure
const navGroups: NavGroup[] = [
  {
    title: 'Main',
    icon: Home,
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Browse Map', href: '/map', icon: MapPin },
      { title: 'Listings', href: '/listings', icon: List },
      { title: 'Messages', href: '/messages', icon: MessageSquare },
    ],
  },
  {
    title: 'Seller Tools',
    icon: Briefcase,
    roles: ['seller', 'broker', 'admin'],
    items: [
      { title: 'Draft Listings', href: '/drafts', icon: FileText, roles: ['seller', 'broker', 'admin'] },
      { title: 'Projects', href: '/projects', icon: Building, roles: ['seller', 'broker', 'admin'] },
      { title: 'CRM', href: '/crm', icon: Briefcase, roles: ['seller', 'broker', 'admin'] },
      { title: 'Revenue', href: '/revenue-management', icon: BarChart3, roles: ['seller', 'broker', 'admin'] },
      { title: 'Payment Settings', href: '/seller-payment-settings', icon: CreditCard, roles: ['seller', 'broker'] },
      { title: 'Institution Dashboard', href: '/institutional-seller/dashboard', icon: Building, roles: ['seller', 'broker'] },
    ],
  },
  {
    title: 'My Activity',
    icon: Activity,
    items: [
      { title: 'Reputation', href: '/reputation', icon: Star },
      { title: 'Disputes', href: '/disputes', icon: Shield },
      { title: 'Visit Requests', href: '/visit-requests', icon: FileText },
      { title: 'My Service Requests', href: '/my-service-requests', icon: FileCheck },
      { title: 'My Bookings', href: '/my-bookings', icon: Calendar },
    ],
  },
  {
    title: 'Payments',
    icon: CreditCard,
    roles: ['seller', 'broker'],
    items: [
      { title: 'Payment Proofs', href: '/payment-proofs', icon: CreditCard, roles: ['seller', 'broker'] },
      { title: 'My GeoInsight Fees', href: '/geoinsight-payments', icon: CreditCard, roles: ['seller', 'broker'] },
    ],
  },
  {
    title: 'Service Provider',
    icon: Wrench,
    roles: ['service_provider', 'admin'],
    items: [
      { title: 'Provider Dashboard', href: '/service-provider/dashboard', icon: Briefcase, roles: ['service_provider', 'admin'] },
    ],
  },
  {
    title: 'Administration',
    icon: Settings,
    roles: ['admin', 'verification_officer', 'compliance_officer', 'spatial_analyst', 'customer_success'],
    items: [
      { title: 'Admin Payments', href: '/admin/payments', icon: CreditCard, roles: ['admin', 'verification_officer', 'compliance_officer'] },
      { title: 'Income Management', href: '/admin/income', icon: CreditCard, roles: ['admin', 'compliance_officer'] },
      { title: 'Compliance', href: '/admin/compliance', icon: Shield, roles: ['admin', 'verification_officer', 'compliance_officer'] },
      { title: 'Verify Listings', href: '/admin/verification', icon: FileCheck, roles: ['admin', 'verification_officer', 'compliance_officer'] },
      { title: 'Overlap Review', href: '/admin/overlap-review', icon: Layers, roles: ['admin', 'verification_officer', 'spatial_analyst'] },
      { title: 'Buying Processes', href: '/admin/buying-processes', icon: ShoppingCart, roles: ['admin', 'verification_officer', 'compliance_officer', 'spatial_analyst', 'customer_success'] },
    ],
  },
  {
    title: 'System',
    icon: Settings,
    roles: ['admin'],
    items: [
      { title: 'User Management', href: '/admin/users', icon: Users, roles: ['admin'] },
      { title: 'Institutions', href: '/institutional-sellers', icon: Building, roles: ['admin'] },
      { title: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['admin', 'verification_officer', 'compliance_officer'] },
      { title: 'Audit Logs', href: '/audit-logs', icon: FileText, roles: ['admin', 'verification_officer', 'compliance_officer'] },
      { title: 'Data Export', href: '/data-export', icon: Download, roles: ['admin', 'verification_officer', 'compliance_officer'] },
      { title: 'Integrations', href: '/integrations', icon: Webhook, roles: ['admin'] },
      { title: 'System Status', href: '/admin/system-status', icon: Activity, roles: ['admin'] },
    ],
  },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { roles } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['Main', 'My Activity']);

  const toggleGroup = (title: string) => {
    setOpenGroups(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const hasAccess = (itemRoles?: string[]) => {
    if (!itemRoles) return true;
    return itemRoles.some((role) => roles?.includes(role as any));
  };

  const getVisibleGroups = () => {
    return navGroups
      .filter(group => hasAccess(group.roles))
      .map(group => ({
        ...group,
        items: group.items.filter(item => hasAccess(item.roles)),
      }))
      .filter(group => group.items.length > 0);
  };

  const visibleGroups = getVisibleGroups();

  const isItemActive = (href: string) => {
    return location.pathname === href ||
      (href !== '/dashboard' && location.pathname.startsWith(href));
  };

  const isGroupActive = (items: NavItem[]) => {
    return items.some(item => isItemActive(item.href));
  };

  return (
    <aside className={cn(
      "hidden md:block border-r border-border bg-card h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-3 space-y-1">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full transition-all mb-2",
            collapsed ? "px-0 justify-center" : "justify-end"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Navigation Groups */}
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-1">
            {visibleGroups.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = openGroups.includes(group.title);
              const groupActive = isGroupActive(group.items);

              if (collapsed) {
                // Collapsed: show only first item of each group with tooltip
                return (
                  <div key={group.title} className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isItemActive(item.href);

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
                    })}
                  </div>
                );
              }

              // Expanded: show collapsible groups
              return (
                <Collapsible
                  key={group.title}
                  open={isOpen}
                  onOpenChange={() => toggleGroup(group.title)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-between px-3 py-2 h-auto font-medium",
                        groupActive && "text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <GroupIcon className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-wider">{group.title}</span>
                      </div>
                      <ChevronDown className={cn(
                        "h-3 w-3 transition-transform",
                        isOpen && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 space-y-0.5 mt-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isItemActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>
        </TooltipProvider>
      </div>
    </aside>
  );
}
