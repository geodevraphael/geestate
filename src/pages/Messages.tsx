import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Send, CheckCheck, Check, Search, Smile, Paperclip, MoreVertical, Phone, Video, Share2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Message } from '@/types/database';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';

export default function Messages() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listing');
  const sellerId = searchParams.get('seller');
  const userId = searchParams.get('user');
  
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Subscribe to all messages for real-time updates to conversations list
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
            const newMessage = payload.new as any;
            // Only refresh if this message involves the current user
            if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
              fetchConversations();
              
              // If the message is for the currently selected conversation, add it to messages
              if (selectedConversation) {
                const matchesConversation = 
                  (newMessage.listing_id === selectedConversation.listing_id) &&
                  (newMessage.sender_id === selectedConversation.other_user_id || 
                   newMessage.receiver_id === selectedConversation.other_user_id);
                
                if (matchesConversation) {
                  setMessages(prev => [...prev, newMessage as Message]);
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
            const updatedMessage = payload.new as any;
            // Update read status in real-time
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
    }
  }, [user]);

  // Separate effect to handle direct navigation with URL params
  useEffect(() => {
    if (user && ((listingId && sellerId) || userId) && conversations.length === 0) {
      // Wait a bit for conversations to load, then check if we need to initialize
      const timer = setTimeout(() => {
        if (userId) {
          // For direct messages, check if any conversation exists with this user
          const existingConv = conversations.find(c => c.other_user_id === userId);
          if (!existingConv) {
            initializeNewConversation();
          }
        } else if (listingId) {
          const existingConv = conversations.find(c => c.listing_id === listingId);
          if (!existingConv) {
            initializeNewConversation();
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, listingId, sellerId, userId, conversations]);

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
        // Staff-initiated direct message
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', userId)
          .single();

        if (userData) {
          const newConversation = {
            listing_id: null, // Direct message, no listing
            listing_title: 'Direct Message',
            other_user_id: userData.id,
            other_user_name: userData.full_name,
            last_message: 'Start your conversation',
            last_message_time: new Date().toISOString(),
            unread_count: 0,
          };
          
          setSelectedConversation(newConversation);
          setConversations(prev => [newConversation, ...prev]);
          
          toast({
            title: 'Conversation Ready',
            description: `You can now message ${userData.full_name}`,
          });
          
          // Auto-focus the input
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      } else {
        // Listing-based conversation
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
          
          // Auto-focus the input
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
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
      // Only show loading spinner on initial load, not on refreshes
      if (!initialLoadDone) {
        setLoading(true);
      }
      
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
          // Skip messages with null profiles (these should never happen)
          if (!msg.sender || !msg.receiver) {
            console.warn('Skipping message due to null profile:', msg.id);
            return;
          }
          
          // For direct messages, msg.listing will be null - that's valid
          const isDirectMessage = msg.listing_id === null;
          
          // Create unique key for each conversation
          // For direct messages: "direct-{other_user_id}"
          // For listing messages: "listing-{listing_id}-{other_user_id}"
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
            };
          }
          
          if (msg.receiver_id === user?.id && !msg.is_read) {
            groupedConversations[key].unread_count++;
          }
        });

        const conversationsList = Object.values(groupedConversations);
        setConversations(conversationsList);

        // Check if we need to open a specific conversation from URL params
        if (listingId && !initialLoadDone) {
          const targetConversation = conversationsList.find(
            (c: any) => c.listing_id === listingId
          );
          if (targetConversation) {
            setSelectedConversation(targetConversation);
          } else if (sellerId && conversationsList.length === 0) {
            // No existing conversation, create a new one
            await initializeNewConversation();
          }
        } else if (userId && !initialLoadDone) {
          // Find conversations with this user
          const userConversations = conversationsList.filter(
            (c: any) => c.other_user_id === userId
          );
          
          if (userConversations.length === 1) {
            // Auto-select if there's only one conversation
            setSelectedConversation(userConversations[0]);
            toast({
              title: 'Conversation Found',
              description: 'Selected existing conversation',
            });
          } else if (userConversations.length > 1) {
            // Show a toast to let them know there are multiple conversations
            toast({
              title: 'Multiple Conversations',
              description: 'This user has multiple conversations. Select one to continue.',
            });
          } else {
            // No conversations found
            toast({
              title: 'No Conversations',
              description: 'No existing conversations with this user. They need to message you about a listing first.',
              variant: 'destructive',
            });
          }
        }
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
      let query = supabase
        .from('messages')
        .select('*');

      // Handle null listing_id (direct messages) vs actual listing_id
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

  // Note: Real-time subscription is now handled in the main useEffect above
  // This function is kept for reference but no longer used
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

      // Only include listing_id if it exists (null for direct messages)
      if (selectedConversation.listing_id) {
        messageData.listing_id = selectedConversation.listing_id;
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;

      if (!customMessage) {
        setNewMessage('');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
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

  if (loading && !initialLoadDone) {
    return (
      <MainLayout>
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
          {/* Header */}
          <div className="hidden md:block px-4 md:px-6 py-3 md:py-4 border-b border-border/50">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Messages</h1>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Conversations Sidebar Skeleton */}
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
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-muted/30 rounded w-32"></div>
                          <div className="h-3 bg-muted/30 rounded w-12"></div>
                        </div>
                        <div className="h-3 bg-muted/30 rounded w-24"></div>
                        <div className="h-3 bg-muted/30 rounded w-40"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages Area Skeleton */}
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

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const shouldShowAvatar = (currentMsg: Message, nextMsg: Message | undefined) => {
    if (!nextMsg) return true;
    if (currentMsg.sender_id !== nextMsg.sender_id) return true;
    const timeDiff = differenceInMinutes(new Date(nextMsg.timestamp), new Date(currentMsg.timestamp));
    return timeDiff > 5;
  };

  const parseMessageContent = (content: string) => {
    // Check if message contains a listings URL
    const listingsUrlRegex = /View all my (\d+) listings?:\n(https?:\/\/[^\s]+\/listings\?owner=[^\s]+)/;
    const match = content.match(listingsUrlRegex);
    
    if (match) {
      const [, count, url] = match;
      return {
        type: 'listings-share' as const,
        count: parseInt(count),
        url: url,
      };
    }

    // Check if message contains a single listing URL
    const singleListingRegex = /Check out this property: ([^\n]+)\n(https?:\/\/[^\s]+\/listing\/[^\s]+)/;
    const singleMatch = content.match(singleListingRegex);
    
    if (singleMatch) {
      const [, title, url] = singleMatch;
      return {
        type: 'listing-share' as const,
        title: title,
        url: url,
      };
    }

    return {
      type: 'text' as const,
      content: content,
    };
  };

  const filteredConversations = conversations.filter(conv =>
    conv.listing_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
        {/* Header - Hidden on mobile for more space */}
        <div className="hidden md:block px-4 md:px-6 py-3 md:py-4 border-b border-border/50">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Messages</h1>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar */}
          <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-border/50 bg-card ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Search Bar */}
            <div className="p-3 md:p-4 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-9 rounded-full border-muted-foreground/20 bg-muted/30 focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="overflow-y-auto flex-1">
              {loading && !initialLoadDone ? (
                // Skeleton loader for conversations
                <div className="divide-y divide-border/50">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-3 md:p-4 animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted/30"></div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="h-4 bg-muted/30 rounded w-32"></div>
                            <div className="h-3 bg-muted/30 rounded w-12"></div>
                          </div>
                          <div className="h-3 bg-muted/30 rounded w-24"></div>
                          <div className="h-3 bg-muted/30 rounded w-40"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">
                    {searchQuery ? 'No results found' : 'No conversations yet'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? 'Try a different search term' : 'Start a conversation by messaging a seller'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredConversations.map((conv) => (
                    <div
                      key={`${conv.listing_id}-${conv.other_user_id}`}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-3 md:p-4 cursor-pointer transition-all duration-200 hover:bg-accent/50 active:scale-[0.99] ${
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
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card"></div>
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
                            <p className={`text-xs truncate flex-1 ${conv.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {conv.last_message}
                            </p>
                            {conv.unread_count > 0 && (
                              <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </Button>
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-background">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold">
                            {selectedConversation.other_user_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-sm md:text-base text-foreground truncate">
                          {selectedConversation.other_user_name}
                        </h2>
                        <p className="text-[10px] md:text-xs text-success font-medium">
                          Online
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 bg-muted/10"
                     style={{
                       backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)',
                       backgroundSize: '40px 40px'
                     }}>
                  {messagesLoading ? (
                    // Skeleton loader for messages
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
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isSender ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}
                        >
                          <div className={`flex items-end gap-1.5 max-w-[85%] md:max-w-[70%] animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                            {!isSender && (
                              <div className="w-7 flex-shrink-0">
                                {showAvatar ? (
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-accent/10 text-primary text-xs font-semibold">
                                      {selectedConversation.other_user_name?.charAt(0).toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : null}
                              </div>
                            )}
                            
                            <div
                              className={`rounded-2xl px-3 md:px-4 py-2 md:py-2.5 shadow-sm transition-all hover:shadow-md ${
                                isSender
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-card border border-border/50 rounded-bl-sm'
                              }`}
                            >
                              {(() => {
                                const parsed = parseMessageContent(message.content);
                                
                                if (parsed.type === 'listings-share') {
                                  return (
                                    <div className="space-y-2">
                                      <p className="text-[13px] md:text-sm">
                                        View all my {parsed.count} {parsed.count === 1 ? 'listing' : 'listings'}
                                      </p>
                                      <Link 
                                        to={parsed.url.replace(window.location.origin, '')}
                                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background/10 hover:bg-background/20 transition-colors text-[13px] font-medium"
                                      >
                                        <span>Browse Listings</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </Link>
                                    </div>
                                  );
                                } else if (parsed.type === 'listing-share') {
                                  return (
                                    <div className="space-y-2">
                                      <p className="text-[13px] md:text-sm">Check out this property:</p>
                                      <p className="text-[13px] font-medium">{parsed.title}</p>
                                      <Link 
                                        to={parsed.url.replace(window.location.origin, '')}
                                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background/10 hover:bg-background/20 transition-colors text-[13px] font-medium"
                                      >
                                        <span>View Property</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </Link>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <p className="text-[13px] md:text-sm leading-relaxed break-words whitespace-pre-wrap">
                                    {parsed.content}
                                  </p>
                                );
                              })()}
                              <div
                                className={`flex items-center gap-1 justify-end text-[9px] md:text-[10px] mt-1 ${
                                  isSender ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}
                              >
                                <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
                                {isSender && (
                                  <span className="ml-0.5">
                                    {message.is_read ? (
                                      <CheckCheck className="h-3 w-3 text-success" />
                                    ) : (
                                      <Check className="h-3 w-3" />
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
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start mt-2">
                      <div className="flex items-end gap-1.5 max-w-[85%]">
                        <div className="w-7 flex-shrink-0">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-accent/10 text-primary text-xs font-semibold">
                              {selectedConversation.other_user_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="border-t border-border/50 p-3 md:p-4 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-end gap-2">
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground hidden md:flex"
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
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
                        className="pr-12 rounded-3xl border-border/50 bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
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
                    Press Enter to send, Shift + Enter for new line
                  </p>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div>
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-6">
                    <Send className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">Your Messages</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Select a conversation from the sidebar to view messages and start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
