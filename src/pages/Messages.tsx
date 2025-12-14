import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, Search, Paperclip, MoreVertical, 
  Phone, Video, Share2, Plus, ArrowLeft, CheckCheck
} from 'lucide-react';
import { Message } from '@/types/database';
import { format, isToday, isYesterday, differenceInMinutes, isSameDay } from 'date-fns';
import { usePresence } from '@/hooks/usePresence';
import { NewConversationDialog } from '@/components/messaging/NewConversationDialog';
import { ChatBubble } from '@/components/messaging/ChatBubble';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import { MessageDateSeparator } from '@/components/messaging/MessageDateSeparator';
import { EmojiPicker } from '@/components/messaging/EmojiPicker';
import { QuickReplies } from '@/components/messaging/QuickReplies';
import { useCall } from '@/contexts/CallContext';

export default function Messages() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { startCall, callStatus } = useCall();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listing');
  const sellerId = searchParams.get('seller');
  const userId = searchParams.get('user');
  
  const { isUserOnline, formatLastSeen, getLastSeen } = usePresence();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUserSeller, setIsUserSeller] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    fetchConversations();
    
    // Subscribe to all messages for real-time updates
    const channel = supabase
      .channel('all-user-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
            fetchConversations();
            
            if (selectedConversation) {
              const matchesConversation = 
                (newMessage.listing_id === selectedConversation.listing_id) &&
                (newMessage.sender_id === selectedConversation.other_user_id || 
                 newMessage.receiver_id === selectedConversation.other_user_id);
              
              if (matchesConversation) {
                setMessages((prev) => {
                  if (prev.some((msg) => msg.id === newMessage.id)) {
                    return prev;
                  }
                  return [...prev, newMessage];
                });
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          if (updatedMessage.receiver_id === user.id || updatedMessage.sender_id === user.id) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessage.id 
                  ? { ...msg, is_read: updatedMessage.is_read }
                  : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  // Handle direct navigation with URL params
  useEffect(() => {
    if (user && ((listingId && sellerId) || userId) && initialLoadDone) {
      if (userId) {
        const existingConv = conversations.find(c => c.other_user_id === userId);
        if (existingConv) {
          setSelectedConversation(existingConv);
        } else {
          initializeNewConversation();
        }
      } else if (listingId) {
        const existingConv = conversations.find(c => c.listing_id === listingId);
        if (existingConv) {
          setSelectedConversation(existingConv);
        } else {
          initializeNewConversation();
        }
      }
    }
  }, [user, listingId, sellerId, userId, initialLoadDone, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.listing_id, selectedConversation.other_user_id);
      checkIfUserIsSeller();
    }
  }, [selectedConversation]);

  const checkIfUserIsSeller = async () => {
    if (!selectedConversation?.listing_id || !user?.id) {
      setIsUserSeller(false);
      return;
    }

    try {
      const { data: listing } = await supabase
        .from('listings')
        .select('owner_id')
        .eq('id', selectedConversation.listing_id)
        .single();

      setIsUserSeller(listing?.owner_id === user.id);
    } catch (error) {
      console.error('Error checking seller status:', error);
      setIsUserSeller(false);
    }
  };

  const initializeNewConversation = async () => {
    if ((!listingId || !sellerId) && !userId) return;
    if (!user) return;
    
    try {
      if (userId) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', userId)
          .single();

        if (userData) {
          const newConversation = {
            listing_id: null,
            listing_title: 'Direct Message',
            other_user_id: userData.id,
            other_user_name: userData.full_name,
            last_message: 'Start your conversation',
            last_message_time: new Date().toISOString(),
            unread_count: 0,
          };
          
          setSelectedConversation(newConversation);
          setConversations(prev => {
            // Avoid duplicates
            if (prev.some(c => c.other_user_id === userData.id && !c.listing_id)) {
              return prev;
            }
            return [newConversation, ...prev];
          });
          
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      } else {
        const [{ data: listingData }, { data: sellerData }] = await Promise.all([
          supabase.from('listings').select('id, title').eq('id', listingId!).single(),
          supabase.from('profiles').select('id, full_name').eq('id', sellerId!).single(),
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
          setConversations(prev => [newConversation, ...prev]);
          
          setTimeout(() => inputRef.current?.focus(), 100);
        }
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
      if (!initialLoadDone) setLoading(true);
      
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
          if (!msg.sender || !msg.receiver) return;
          
          const isDirectMessage = msg.listing_id === null;
          const isReceiver = msg.receiver_id === user?.id;
          const otherUserId = isReceiver ? msg.sender_id : msg.receiver_id;
          const key = isDirectMessage 
            ? `direct-${otherUserId}`
            : `listing-${msg.listing_id}-${otherUserId}`;
          
          if (!groupedConversations[key]) {
            groupedConversations[key] = {
              listing_id: msg.listing_id,
              listing_title: isDirectMessage ? 'Direct Message' : msg.listing?.title,
              other_user_id: otherUserId,
              other_user_name: isReceiver ? msg.sender.full_name : msg.receiver.full_name,
              last_message: msg.content,
              last_message_time: msg.timestamp,
              unread_count: 0,
              last_message_is_mine: msg.sender_id === user?.id,
              last_message_is_read: msg.is_read,
            };
          }
          
          if (msg.receiver_id === user?.id && !msg.is_read) {
            groupedConversations[key].unread_count++;
          }
        });

        const conversationsList = Object.values(groupedConversations);
        setConversations(conversationsList);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      if (!initialLoadDone) {
        setLoading(false);
        setInitialLoadDone(true);
      }
    }
  };

  const fetchMessages = async (listingId: string | null, otherUserId: string) => {
    setMessagesLoading(true);
    try {
      let query = supabase.from('messages').select('*');

      if (listingId === null) {
        query = query.is('listing_id', null);
      } else {
        query = query.eq('listing_id', listingId);
      }

      const { data } = await query
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
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent, customMessage?: string) => {
    e.preventDefault();
    
    const messageToSend = customMessage || newMessage.trim();
    if (!messageToSend || !selectedConversation || !user) return;

    try {
      const messageData: any = {
        sender_id: user.id,
        receiver_id: selectedConversation.other_user_id,
        content: messageToSend,
      };

      if (selectedConversation.listing_id) {
        messageData.listing_id = selectedConversation.listing_id;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      const savedMessage = data as Message;

      setMessages((prev) => {
        if (prev.some((m) => m.id === savedMessage.id)) {
          return prev;
        }
        return [...prev, savedMessage];
      });

      if (!customMessage) {
        setNewMessage('');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleShareListing = async (e: React.MouseEvent) => {
    if (!user?.id) return;

    try {
      const { data: listings } = await supabase
        .from('listings')
        .select('id')
        .eq('owner_id', user.id)
        .eq('status', 'published');

      const listingsUrl = `${window.location.origin}/listings?owner=${user.id}`;
      const listingCount = listings?.length || 0;
      const shareMessage = `View all my ${listingCount} ${listingCount === 1 ? 'listing' : 'listings'}:\n${listingsUrl}`;
      
      await sendMessage(e as any, shareMessage);
      
      toast({
        title: 'Listings Shared',
        description: 'Your listings link has been sent',
      });
    } catch (error) {
      console.error('Error sharing listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to share listings',
        variant: 'destructive',
      });
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const shouldShowAvatar = (currentMsg: Message, nextMsg: Message | undefined) => {
    if (!nextMsg) return true;
    if (currentMsg.sender_id !== nextMsg.sender_id) return true;
    const timeDiff = differenceInMinutes(new Date(nextMsg.timestamp), new Date(currentMsg.timestamp));
    return timeDiff > 5;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.listing_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !initialLoadDone) {
    return (
      <MainLayout>
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
          <div className="hidden md:block px-4 md:px-6 py-3 md:py-4 border-b border-border/50">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Messages</h1>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-border/50 bg-card">
              <div className="p-3 md:p-4 border-b border-border/50">
                <div className="h-10 bg-muted/30 rounded-full animate-pulse"></div>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-border/50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 md:p-4 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted/30"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted/30 rounded w-32"></div>
                        <div className="h-3 bg-muted/30 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden md:flex flex-1 items-center justify-center bg-background">
              <div className="text-center space-y-3 p-8 animate-pulse">
                <div className="h-20 w-20 rounded-full bg-muted/30 mx-auto"></div>
                <div className="h-4 bg-muted/30 rounded w-48 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
        {/* Header */}
        <div className="hidden md:flex px-4 md:px-6 py-3 md:py-4 border-b border-border/50 items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Messages</h1>
          <Button 
            onClick={() => setShowNewConversation(true)}
            size="sm" 
            className="gap-2 rounded-full"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar */}
          <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-border/50 bg-card ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Search Bar */}
            <div className="p-3 md:p-4 border-b border-border/50">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="pl-9 rounded-full border-muted-foreground/20 bg-muted/30 focus-visible:ring-1"
                  />
                </div>
                <Button 
                  onClick={() => setShowNewConversation(true)}
                  size="icon" 
                  className="rounded-full md:hidden flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Conversations List */}
            <div className="overflow-y-auto flex-1">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">
                    {searchQuery ? 'No results found' : 'No conversations yet'}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
                  </p>
                  {!searchQuery && (
                    <Button 
                      onClick={() => setShowNewConversation(true)}
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Conversation
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredConversations.map((conv) => {
                    const online = isUserOnline(conv.other_user_id);
                    const lastSeen = getLastSeen(conv.other_user_id);
                    
                    return (
                      <div
                        key={`${conv.listing_id || 'direct'}-${conv.other_user_id}`}
                        onClick={() => setSelectedConversation(conv)}
                        className={`p-3 md:p-4 cursor-pointer transition-all duration-200 hover:bg-accent/50 active:scale-[0.99] ${
                          selectedConversation?.other_user_id === conv.other_user_id &&
                          selectedConversation?.listing_id === conv.listing_id
                            ? 'bg-accent/70'
                            : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-background">
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold text-base">
                                {conv.other_user_name?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                              online ? 'bg-success' : 'bg-muted-foreground/40'
                            }`}></div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <h3 className="font-semibold text-sm md:text-base truncate text-foreground">
                                {conv.other_user_name}
                              </h3>
                              <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                                {formatMessageTime(conv.last_message_time)}
                              </span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground font-medium mb-1 truncate">
                              {conv.listing_title}
                            </p>
                            
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {conv.last_message_is_mine && (
                                  <CheckCheck className={`h-3 w-3 flex-shrink-0 ${conv.last_message_is_read ? 'text-success' : 'text-muted-foreground'}`} />
                                )}
                                <p className={`text-xs truncate ${conv.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                  {conv.last_message}
                                </p>
                              </div>
                              {conv.unread_count > 0 && (
                                <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                  {conv.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className={`flex-1 flex flex-col bg-background ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-border/50 px-3 md:px-4 py-2 md:py-3 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-background">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold">
                            {selectedConversation.other_user_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                          isUserOnline(selectedConversation.other_user_id) ? 'bg-success' : 'bg-muted-foreground/40'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-sm md:text-base text-foreground truncate">
                          {selectedConversation.other_user_name}
                        </h2>
                        <p className={`text-[10px] md:text-xs font-medium ${
                          isUserOnline(selectedConversation.other_user_id) ? 'text-success' : 'text-muted-foreground'
                        }`}>
                          {isUserOnline(selectedConversation.other_user_id) 
                            ? 'Online' 
                            : formatLastSeen(getLastSeen(selectedConversation.other_user_id))
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9"
                        onClick={() => startCall(
                          selectedConversation.other_user_id,
                          selectedConversation.other_user_name
                        )}
                        disabled={callStatus !== 'idle'}
                        title="Start audio call"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex" disabled title="Video call coming soon">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Messages Container */}
                <div 
                  className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 bg-muted/10"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                  }}
                >
                  {messagesLoading ? (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}>
                          <div className={`max-w-[85%] md:max-w-[70%] ${i % 2 === 0 ? 'bg-primary/5' : 'bg-card/50'} rounded-2xl p-3 space-y-2 border border-border/30`}>
                            <div className="h-3 bg-muted/40 rounded w-32"></div>
                            <div className="h-3 bg-muted/40 rounded w-24"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-8">
                        <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                          <Send className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No messages yet</p>
                        <p className="text-xs text-muted-foreground">Send a message to start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const isSender = message.sender_id === user?.id;
                      const showAvatar = shouldShowAvatar(message, messages[index + 1]);
                      const isFirstInGroup = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                      const showDateSeparator = index === 0 || !isSameDay(new Date(messages[index - 1].timestamp), new Date(message.timestamp));
                      
                      return (
                        <div key={message.id}>
                          {showDateSeparator && (
                            <MessageDateSeparator date={new Date(message.timestamp)} />
                          )}
                          <ChatBubble
                            message={message}
                            isSender={isSender}
                            showAvatar={showAvatar}
                            senderName={selectedConversation.other_user_name}
                            isFirstInGroup={isFirstInGroup}
                            onReply={(msg) => {
                              setReplyingTo(msg);
                              inputRef.current?.focus();
                            }}
                          />
                        </div>
                      );
                    })
                  )}
                  
                  {isTyping && (
                    <TypingIndicator userName={selectedConversation.other_user_name} />
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm">
                  {/* Reply indicator */}
                  {replyingTo && (
                    <div className="px-3 md:px-4 pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Replying to: {replyingTo.content.substring(0, 50)}{replyingTo.content.length > 50 ? '...' : ''}</span>
                      <Button variant="ghost" size="sm" className="h-5 px-1" onClick={() => setReplyingTo(null)}>×</Button>
                    </div>
                  )}
                  
                  {/* Quick Replies */}
                  {messages.length === 0 && (
                    <div className="px-3 md:px-4 pt-2">
                      <QuickReplies 
                        onSelect={(reply) => {
                          setNewMessage(reply);
                          inputRef.current?.focus();
                        }}
                        isUserSeller={isUserSeller}
                      />
                    </div>
                  )}

                  <form onSubmit={sendMessage} className="p-3 md:p-4">
                    <div className="flex items-end gap-2">
                      <div className="hidden md:block">
                        <EmojiPicker onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)} />
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground hidden md:flex"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                      {isUserSeller && (
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon"
                          onClick={handleShareListing}
                          className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground"
                          title="Share all your listings"
                        >
                          <Share2 className="h-5 w-5" />
                        </Button>
                      )}
                      <div className="flex-1 relative">
                        <Input
                          ref={inputRef}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="pr-12 rounded-3xl border-border/50 bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/50"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage(e as any);
                            }
                          }}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        size="icon"
                        className="rounded-full h-10 w-10 md:h-11 md:w-11 flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
                        disabled={!newMessage.trim()}
                      >
                        <Send className="h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center hidden md:block">
                      Press Enter to send
                    </p>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div>
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-6">
                    <Send className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">Your Messages</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-6">
                    Select a conversation or start a new one to begin messaging
                  </p>
                  <Button 
                    onClick={() => setShowNewConversation(true)}
                    className="gap-2 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                    Start New Conversation
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog 
        open={showNewConversation} 
        onOpenChange={setShowNewConversation} 
      />
    </MainLayout>
  );
}
