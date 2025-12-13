import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User, Building2, Briefcase, MessageCircle, CheckCircle2 } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import { toast } from 'sonner';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ContactUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  profile_photo_url?: string | null;
  type: 'seller' | 'service_provider' | 'institution';
  subtitle?: string;
  is_verified?: boolean;
}

export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isUserOnline, formatLastSeen, getLastSeen } = usePresence();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('sellers');
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchContacts();
    }
  }, [open, activeTab]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      let results: ContactUser[] = [];

      if (activeTab === 'sellers') {
        // Fetch sellers and brokers
        const { data: sellerRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['seller', 'broker']);

        if (sellerRoles && sellerRoles.length > 0) {
          const userIds = sellerRoles.map(r => r.user_id).filter(id => id !== user?.id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, profile_photo_url')
            .in('id', userIds);

          results = (profiles || []).map(p => ({
            ...p,
            type: 'seller' as const,
            subtitle: 'Seller',
          }));
        }
      } else if (activeTab === 'providers') {
        // Fetch service providers
        const { data: providers } = await supabase
          .from('service_provider_profiles')
          .select('id, user_id, company_name, contact_email, contact_phone, logo_url, provider_type, is_verified')
          .eq('is_active', true)
          .neq('user_id', user?.id);

        results = (providers || []).map(p => ({
          id: p.user_id,
          full_name: p.company_name,
          email: p.contact_email,
          phone: p.contact_phone,
          profile_photo_url: p.logo_url,
          type: 'service_provider' as const,
          subtitle: p.provider_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          is_verified: p.is_verified,
        }));
      } else if (activeTab === 'institutions') {
        // Fetch institutions
        const { data: institutions } = await supabase
          .from('institutional_sellers')
          .select('id, profile_id, institution_name, contact_email, contact_phone, logo_url, institution_type, is_approved')
          .eq('is_approved', true);

        results = (institutions || [])
          .filter(i => i.profile_id !== user?.id)
          .map(i => ({
            id: i.profile_id,
            full_name: i.institution_name,
            email: i.contact_email,
            phone: i.contact_phone,
            profile_photo_url: i.logo_url,
            type: 'institution' as const,
            subtitle: i.institution_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            is_verified: i.is_approved,
          }));
      }

      setContacts(results);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = (contact: ContactUser) => {
    // Navigate to messages with the selected user
    navigate(`/messages?user=${contact.id}`);
    onOpenChange(false);
    toast.success(`Starting conversation with ${contact.full_name}`);
  };

  const filteredContacts = contacts.filter(c =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'seller': return User;
      case 'service_provider': return Briefcase;
      case 'institution': return Building2;
      default: return User;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg font-bold">New Conversation</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full bg-muted/50"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4">
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="sellers" className="text-xs gap-1">
                <User className="h-3.5 w-3.5" />
                Sellers
              </TabsTrigger>
              <TabsTrigger value="providers" className="text-xs gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                Providers
              </TabsTrigger>
              <TabsTrigger value="institutions" className="text-xs gap-1">
                <Building2 className="h-3.5 w-3.5" />
                Institutions
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-2">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">No contacts found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery ? 'Try a different search' : 'No one available in this category'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredContacts.map((contact) => {
                      const Icon = getIcon(contact.type);
                      const online = isUserOnline(contact.id);
                      const lastSeen = getLastSeen(contact.id);
                      
                      return (
                        <button
                          key={contact.id}
                          onClick={() => handleStartConversation(contact)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left group"
                        >
                          <div className="relative">
                            <Avatar className="h-12 w-12 ring-2 ring-background">
                              <AvatarImage src={contact.profile_photo_url || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                                {contact.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background ${
                              online ? 'bg-success' : 'bg-muted-foreground/50'
                            }`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{contact.full_name}</p>
                              {contact.is_verified && (
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] py-0 h-4 gap-1">
                                <Icon className="h-2.5 w-2.5" />
                                {contact.subtitle}
                              </Badge>
                              <span className={`text-[10px] ${online ? 'text-success' : 'text-muted-foreground'}`}>
                                {online ? 'Online' : formatLastSeen(lastSeen)}
                              </span>
                            </div>
                          </div>

                          <MessageCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
