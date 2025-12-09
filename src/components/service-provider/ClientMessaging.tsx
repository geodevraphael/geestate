import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MessageSquare, Send, User, Search, Clock, 
  CheckCheck, ArrowLeft, Phone, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ClientMessagingProps {
  providerId: string;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export function ClientMessaging({ providerId }: ClientMessagingProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch clients from service requests
  const { data: clients = [] } = useQuery({
    queryKey: ['provider-clients', providerId],
    queryFn: async () => {
      // Get unique clients from service requests
      const { data: requests, error } = await supabase
        .from('service_requests')
        .select('requester_id')
        .eq('service_provider_id', providerId);

      if (error) throw error;

      const uniqueClientIds = [...new Set(requests?.map(r => r.requester_id) || [])];
      
      if (uniqueClientIds.length === 0) return [];

      // Fetch client profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', uniqueClientIds);

      // Fetch last message for each client
      const clientsWithMessages = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, timestamp, is_read, sender_id')
            .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
            .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('sender_id', profile.id)
            .eq('receiver_id', user?.id)
            .eq('is_read', false);

          return {
            ...profile,
            lastMessage: lastMsg?.content,
            lastMessageTime: lastMsg?.timestamp,
            unreadCount: unreadCount || 0,
          };
        })
      );

      return clientsWithMessages.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });
    },
    enabled: !!providerId && !!user,
  });

  // Fetch messages with selected client
  const { data: messages = [] } = useQuery({
    queryKey: ['provider-messages', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient || !user) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedClient.id}),and(sender_id.eq.${selectedClient.id},receiver_id.eq.${user.id})`)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Mark messages as read
      if (data?.length) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('sender_id', selectedClient.id)
          .eq('receiver_id', user.id)
          .eq('is_read', false);
      }

      return data || [];
    },
    enabled: !!selectedClient && !!user,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !selectedClient) throw new Error('Missing user or client');

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedClient.id,
        content,
        message_type: 'text',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessageContent('');
      queryClient.invalidateQueries({ queryKey: ['provider-messages'] });
      queryClient.invalidateQueries({ queryKey: ['provider-clients'] });
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    },
  });

  const handleSend = () => {
    if (!messageContent.trim()) return;
    sendMutation.mutate(messageContent);
  };

  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = clients.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b shrink-0">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Client Messages
          {totalUnread > 0 && (
            <Badge className="bg-primary">{totalUnread}</Badge>
          )}
        </CardTitle>
        <CardDescription>Communicate with your clients</CardDescription>
      </CardHeader>

      <div className="flex flex-1 min-h-0">
        {/* Client List */}
        <div className="w-1/3 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filteredClients.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No clients yet</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`p-3 border-b cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedClient?.id === client.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {client.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{client.full_name}</p>
                        {client.unreadCount && client.unreadCount > 0 && (
                          <Badge className="h-5 w-5 p-0 justify-center bg-primary text-[10px]">
                            {client.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {client.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {client.lastMessage}
                        </p>
                      )}
                      {client.lastMessageTime && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(client.lastMessageTime), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedClient ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {selectedClient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{selectedClient.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {selectedClient.phone && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`tel:${selectedClient.phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={`mailto:${selectedClient.email}`}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg: any) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isMe 
                              ? 'bg-primary text-primary-foreground rounded-br-sm' 
                              : 'bg-muted rounded-bl-sm'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                              <span className={`text-[10px] ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {format(new Date(msg.timestamp), 'h:mm a')}
                              </span>
                              {isMe && msg.is_read && (
                                <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSend} 
                    disabled={!messageContent.trim() || sendMutation.isPending}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Select a client</p>
                <p className="text-sm">Choose a client to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
