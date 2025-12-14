import { useEffect, useState, useRef, useCallback } from 'react';
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
import { ScrollToBottom } from '@/components/messaging/ScrollToBottom';
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-background overflow-hidden">
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
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-background overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar */}
          <div className={`w-full md:w-[340px] lg:w-[380px] flex flex-col bg-background ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Modern Header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Chats</h1>
                <Button 
                  onClick={() => setShowNewConversation(true)}
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full hover:bg-muted"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="pl-10 h-10 rounded-xl border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="overflow-y-auto no-scrollbar flex-1 px-2">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">
                    {searchQuery ? 'No results' : 'No chats yet'}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    {searchQuery ? 'Try a different search' : 'Start a conversation'}
                  </p>
                  {!searchQuery && (
                    <Button 
                      onClick={() => setShowNewConversation(true)}
                      size="sm"
                      className="rounded-full"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      New Chat
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1 pb-4">
                  {filteredConversations.map((conv) => {
                    const online = isUserOnline(conv.other_user_id);
                    const isSelected = selectedConversation?.other_user_id === conv.other_user_id &&
                      selectedConversation?.listing_id === conv.listing_id;
                    
                    return (
                      <div
                        key={`${conv.listing_id || 'direct'}-${conv.other_user_id}`}
                        onClick={() => setSelectedConversation(conv)}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted/60 active:scale-[0.98]'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-14 w-14">
                            <AvatarFallback className={`text-lg font-semibold ${
                              isSelected 
                                ? 'bg-primary-foreground/20 text-primary-foreground' 
                                : 'bg-gradient-to-br from-accent/30 to-primary/20 text-foreground'
                            }`}>
                              {conv.other_user_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          {online && (
                            <div className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 ${
                              isSelected ? 'border-primary' : 'border-background'
                            } bg-success`} />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h3 className={`font-semibold truncate ${isSelected ? '' : 'text-foreground'}`}>
                              {conv.other_user_name}
                            </h3>
                            <span className={`text-[11px] whitespace-nowrap ${
                              isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {formatMessageTime(conv.last_message_time)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {conv.last_message_is_mine && (
                                <CheckCheck className={`h-3.5 w-3.5 flex-shrink-0 ${
                                  isSelected 
                                    ? 'text-primary-foreground/70' 
                                    : conv.last_message_is_read ? 'text-success' : 'text-muted-foreground'
                                }`} />
                              )}
                              <p className={`text-sm truncate ${
                                isSelected 
                                  ? 'text-primary-foreground/80' 
                                  : conv.unread_count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'
                              }`}>
                                {conv.last_message}
                              </p>
                            </div>
                            {conv.unread_count > 0 && !isSelected && (
                              <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                                {conv.unread_count}
                              </span>
                            )}
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
          <div className={`flex-1 flex flex-col bg-muted/20 overflow-hidden ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation ? (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Modern Chat Header */}
                <div className="fixed top-0 left-0 right-0 md:relative px-4 py-3 bg-background/95 backdrop-blur-xl border-b border-border/30 z-40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden h-9 w-9 rounded-full"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div className="relative">
                        <Avatar className="h-11 w-11">
                          <AvatarFallback className="bg-gradient-to-br from-accent/30 to-primary/20 text-foreground font-semibold">
                            {selectedConversation.other_user_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {isUserOnline(selectedConversation.other_user_id) && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-foreground truncate">
                          {selectedConversation.other_user_name}
                        </h2>
                        <p className={`text-xs ${
                          isUserOnline(selectedConversation.other_user_id) ? 'text-success' : 'text-muted-foreground'
                        }`}>
                          {isUserOnline(selectedConversation.other_user_id) 
                            ? 'Active now' 
                            : formatLastSeen(getLastSeen(selectedConversation.other_user_id))
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-full"
                        onClick={() => startCall(
                          selectedConversation.other_user_id,
                          selectedConversation.other_user_name
                        )}
                        disabled={callStatus !== 'idle'}
                      >
                        <Phone className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hidden md:flex" disabled>
                        <Video className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="relative flex-1 min-h-0">
                  <div 
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="absolute inset-0 overflow-y-auto no-scrollbar px-4 py-4"
                  >
                    {messagesLoading ? (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${i % 2 === 0 ? 'bg-primary/10' : 'bg-background'} rounded-3xl p-4 space-y-2 animate-pulse`}>
                              <div className="h-3 bg-muted rounded-full w-32"></div>
                              <div className="h-3 bg-muted rounded-full w-20"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8 animate-in fade-in zoom-in-95 duration-500">
                          <div className="h-20 w-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                            <Send className="h-10 w-10 text-muted-foreground/50" />
                          </div>
                          <p className="text-lg font-semibold text-foreground mb-1">Say hello 👋</p>
                          <p className="text-sm text-muted-foreground">
                            Start chatting with {selectedConversation.other_user_name}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {messages.map((message, index) => {
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
                        })}
                      </div>
                    )}
                    
                    {isTyping && (
                      <TypingIndicator userName={selectedConversation.other_user_name} />
                    )}
                    
                    <div ref={messagesEndRef} className="h-2" />
                  </div>
                  
                  <ScrollToBottom 
                    show={showScrollButton} 
                    onClick={scrollToBottom}
                  />
                </div>

                {/* Modern Input Area */}
                <div className="fixed bottom-20 md:bottom-0 left-0 right-0 md:relative md:flex-shrink-0 px-4 py-3 bg-background/95 backdrop-blur-xl border-t border-border/30 z-40">
                  {replyingTo && (
                    <div className="mb-2 px-3 py-2 rounded-xl bg-muted/50 flex items-center gap-2 text-sm">
                      <div className="w-1 h-8 bg-primary rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Replying to message</p>
                        <p className="text-sm truncate">{replyingTo.content}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setReplyingTo(null)}>
                        ×
                      </Button>
                    </div>
                  )}
                  
                  {messages.length === 0 && (
                    <div className="mb-3">
                      <QuickReplies 
                        onSelect={(reply) => {
                          setNewMessage(reply);
                          inputRef.current?.focus();
                        }}
                        isUserSeller={isUserSeller}
                      />
                    </div>
                  )}

                  <form onSubmit={sendMessage} className="flex items-end gap-2">
                    <div className="flex items-center gap-1">
                      <div className="hidden md:block">
                        <EmojiPicker onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)} />
                      </div>
                      {isUserSeller && (
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon"
                          onClick={handleShareListing}
                          className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
                        >
                          <Share2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Message..."
                        className="h-11 rounded-full border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/30 px-4"
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
                      className="h-11 w-11 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div className="animate-in fade-in zoom-in-95 duration-500">
                  <div className="h-20 w-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                    <Send className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Your Messages</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mb-6">
                    Select a chat or start a new conversation
                  </p>
                  <Button 
                    onClick={() => setShowNewConversation(true)}
                    className="rounded-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
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
