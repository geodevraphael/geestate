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
import { Send } from 'lucide-react';
import { Message } from '@/types/database';
import { format } from 'date-fns';

export default function Messages() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listing');
  
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

        if (listingId) {
          const targetConversation = conversationsList.find(
            (c: any) => c.listing_id === listingId
          );
          if (targetConversation) {
            setSelectedConversation(targetConversation);
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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-16rem)]">
          {/* Conversations List */}
          <Card className="md:col-span-1">
            <CardContent className="p-0">
              <div className="border-b p-4">
                <h2 className="font-semibold">Conversations</h2>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={`${conv.listing_id}-${conv.other_user_id}`}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition ${
                        selectedConversation?.listing_id === conv.listing_id
                          ? 'bg-muted'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {conv.listing_title}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.other_user_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conv.last_message}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <div className="ml-2 flex-shrink-0">
                            <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                              {conv.unread_count}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(conv.last_message_time), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="md:col-span-2">
            <CardContent className="p-0 flex flex-col h-full">
              {selectedConversation ? (
                <>
                  <div className="border-b p-4">
                    <h2 className="font-semibold">{selectedConversation.listing_title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.other_user_name}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => {
                      const isSender = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isSender
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isSender ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}
                            >
                              {format(new Date(message.timestamp), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="border-t p-4 flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a conversation to start messaging
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
