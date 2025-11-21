import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Send, CheckCheck, Check } from 'lucide-react';
import { Message } from '@/types/database';
import { format } from 'date-fns';

export default function Messages() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listing');
  const sellerId = searchParams.get('seller');
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.listing_id, selectedConversation.other_user_id);
      subscribeToMessages(selectedConversation.listing_id);
    }
  }, [selectedConversation]);

  const initializeNewConversation = async () => {
    if (!listingId || !sellerId || !user) return;
    
    try {
      const [{ data: listingData }, { data: sellerData }] = await Promise.all([
        supabase.from('listings').select('id, title').eq('id', listingId).single(),
        supabase.from('profiles').select('id, full_name').eq('id', sellerId).single(),
      ]);

      if (listingData && sellerData) {
        const newConversation = {
          listing_id: listingData.id,
          listing_title: listingData.title,
          other_user_id: sellerData.id,
          other_user_name: sellerData.full_name,
          last_message: 'Start your conversation',
          last_message_time: new Date().toISOString(),
          unread_count: 0,
        };
        
        setSelectedConversation(newConversation);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          *,
          listing:listings(id, title),
          sender:profiles!messages_sender_id_fkey(id, full_name),
          receiver:profiles!messages_receiver_id_fkey(id, full_name)
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('timestamp', { ascending: false });

      if (messagesData) {
        const groupedConversations: any = {};
        
        messagesData.forEach((msg: any) => {
          const key = `${msg.listing_id}`;
          if (!groupedConversations[key]) {
            const isReceiver = msg.receiver_id === user?.id;
            groupedConversations[key] = {
              listing_id: msg.listing_id,
              listing_title: msg.listing.title,
              other_user_id: isReceiver ? msg.sender_id : msg.receiver_id,
              other_user_name: isReceiver ? msg.sender.full_name : msg.receiver.full_name,
              last_message: msg.content,
              last_message_time: msg.timestamp,
              unread_count: 0,
            };
          }
          
          if (msg.receiver_id === user?.id && !msg.is_read) {
            groupedConversations[key].unread_count++;
          }
        });

        const conversationsList = Object.values(groupedConversations);
        setConversations(conversationsList);

        // Check if we need to open a specific conversation from URL params
        if (listingId) {
          const targetConversation = conversationsList.find(
            (c: any) => c.listing_id === listingId
          );
          if (targetConversation) {
            setSelectedConversation(targetConversation);
          } else if (sellerId) {
            // No existing conversation, create a new one
            initializeNewConversation();
          }
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (listingId: string, otherUserId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('listing_id', listingId)
      .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`)
      .order('timestamp', { ascending: true });

    if (data) {
      setMessages(data);
      
      const unreadMessages = data.filter(
        (m: Message) => m.receiver_id === user?.id && !m.is_read
      );
      
      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(m => m.id));
      }
    }
  };

  const subscribeToMessages = (listingId: string) => {
    const channel = supabase
      .channel(`messages-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          // Update message read status in real-time
          setMessages(prev => 
            prev.map(msg => 
              msg.id === payload.new.id 
                ? { ...msg, is_read: (payload.new as Message).is_read }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          listing_id: selectedConversation.listing_id,
          sender_id: user.id,
          receiver_id: selectedConversation.other_user_id,
          content: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-4 md:py-8 h-[calc(100vh-4rem)]">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 h-[calc(100%-5rem)]">
          {/* Conversations List */}
          <Card className="md:col-span-1 flex flex-col overflow-hidden">
            <div className="border-b px-4 py-3 bg-muted/30">
              <h2 className="font-semibold text-foreground">Conversations</h2>
            </div>
            <div className="overflow-y-auto flex-1">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-muted-foreground mb-2">No conversations yet</div>
                  <p className="text-xs text-muted-foreground">
                    Start a conversation by messaging a seller
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <div
                      key={`${conv.listing_id}-${conv.other_user_id}`}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-3 md:p-4 cursor-pointer transition-all hover:bg-accent/50 ${
                        selectedConversation?.listing_id === conv.listing_id
                          ? 'bg-accent border-l-4 border-primary'
                          : 'border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {conv.other_user_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate text-foreground">
                              {conv.listing_title}
                            </h3>
                            {conv.unread_count > 0 && (
                              <div className="flex-shrink-0">
                                <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                                  {conv.unread_count}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground font-medium mb-1">
                            {conv.other_user_name}
                          </p>
                          
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground truncate flex-1">
                              {conv.last_message}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(conv.last_message_time), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Messages Area */}
          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                <div className="border-b px-4 py-3 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {selectedConversation.other_user_name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold text-sm text-foreground">
                        {selectedConversation.listing_title}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.other_user_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <p className="mb-1">No messages yet</p>
                        <p className="text-xs">Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isSender = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isSender ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                          <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%]`}>
                            {!isSender && (
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                  {selectedConversation.other_user_name?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div
                              className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                                isSender
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-card border border-border rounded-bl-md'
                              }`}
                            >
                              <p className="text-sm leading-relaxed break-words">{message.content}</p>
                              <div
                                className={`flex items-center gap-1 justify-end text-[10px] mt-1 ${
                                  isSender ? 'text-primary-foreground/60' : 'text-muted-foreground'
                                }`}
                              >
                                <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
                                {isSender && (
                                  <span className="ml-0.5">
                                    {message.is_read ? (
                                      <CheckCheck className="h-3.5 w-3.5" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="border-t p-3 md:p-4 bg-background">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-full border-muted-foreground/20 focus-visible:ring-primary"
                    />
                    <Button 
                      type="submit" 
                      size="icon"
                      className="rounded-full h-10 w-10 flex-shrink-0"
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div>
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Send className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">No conversation selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
