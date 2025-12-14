import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'end-call';
  from: string;
  to: string;
  payload: any;
  fromName?: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useWebRTCCall() {
  const { user, profile } = useAuth();
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [remoteUserName, setRemoteUserName] = useState<string>('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize remote audio element
  useEffect(() => {
    remoteAudio.current = new Audio();
    remoteAudio.current.autoplay = true;
    return () => {
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = null;
      }
    };
  }, []);

  // Subscribe to call signals
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`calls-${user.id}`)
      .on('broadcast', { event: 'call-signal' }, async ({ payload }) => {
        const signal = payload as CallSignal;
        if (signal.to !== user.id) return;

        console.log('Received signal:', signal.type);

        switch (signal.type) {
          case 'offer':
            handleIncomingCall(signal);
            break;
          case 'answer':
            handleAnswer(signal);
            break;
          case 'ice-candidate':
            handleIceCandidate(signal);
            break;
          case 'end-call':
            endCall(false);
            break;
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const sendSignal = useCallback(async (signal: Omit<CallSignal, 'from' | 'fromName'>) => {
    if (!user?.id || !signal.to) return;

    const targetChannel = supabase.channel(`calls-${signal.to}`);
    
    // Wait for channel to be subscribed before sending
    await new Promise<void>((resolve) => {
      targetChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        }
      });
    });
    
    // Use httpSend for reliable delivery (new Supabase API)
    const result = await targetChannel.send({
      type: 'broadcast',
      event: 'call-signal',
      payload: {
        ...signal,
        from: user.id,
        fromName: profile?.full_name || 'Unknown',
      },
    });

    console.log('Signal sent:', signal.type, result);
    
    // Clean up channel after a short delay
    setTimeout(() => {
      supabase.removeChannel(targetChannel);
    }, 1000);
  }, [user?.id, profile?.full_name]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserId) {
        sendSignal({
          type: 'ice-candidate',
          to: remoteUserId,
          payload: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (remoteAudio.current && event.streams[0]) {
        remoteAudio.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
        startCallTimer();
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall(false);
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [remoteUserId, sendSignal]);

  const startCallTimer = useCallback(() => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  const startCall = useCallback(async (targetUserId: string, targetUserName: string) => {
    try {
      setRemoteUserId(targetUserId);
      setRemoteUserName(targetUserName);
      setCallStatus('calling');

      // Get local audio stream
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const pc = createPeerConnection();

      // Add local tracks
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current!);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await sendSignal({
        type: 'offer',
        to: targetUserId,
        payload: offer,
      });

      toast.info(`Calling ${targetUserName}...`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call. Please check microphone permissions.');
      endCall(false);
    }
  }, [createPeerConnection, sendSignal]);

  const handleIncomingCall = useCallback(async (signal: CallSignal) => {
    if (callStatus !== 'idle') {
      // Already in a call, reject
      sendSignal({ type: 'end-call', to: signal.from, payload: {} });
      return;
    }

    setRemoteUserId(signal.from);
    setRemoteUserName(signal.fromName || 'Unknown');
    setCallStatus('incoming');

    // Store the offer for when user accepts
    peerConnection.current = null;
    (window as any).__pendingOffer = signal.payload;
  }, [callStatus, sendSignal]);

  const acceptCall = useCallback(async () => {
    if (!remoteUserId) return;

    try {
      // Get local audio stream
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const pc = createPeerConnection();

      // Add local tracks
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current!);
      });

      // Set remote description from stored offer
      const offer = (window as any).__pendingOffer;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignal({
        type: 'answer',
        to: remoteUserId,
        payload: answer,
      });

      delete (window as any).__pendingOffer;
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      endCall(false);
    }
  }, [remoteUserId, createPeerConnection, sendSignal]);

  const handleAnswer = useCallback(async (signal: CallSignal) => {
    if (!peerConnection.current) return;

    try {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(signal.payload)
      );
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (signal: CallSignal) => {
    if (!peerConnection.current) return;

    try {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(signal.payload)
      );
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }, []);

  const rejectCall = useCallback(() => {
    if (remoteUserId) {
      sendSignal({ type: 'end-call', to: remoteUserId, payload: {} });
    }
    endCall(false);
  }, [remoteUserId, sendSignal]);

  const endCall = useCallback((sendEndSignal = true) => {
    if (sendEndSignal && remoteUserId) {
      sendSignal({ type: 'end-call', to: remoteUserId, payload: {} });
    }

    // Stop local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Reset state
    stopCallTimer();
    setCallStatus('idle');
    setRemoteUserId(null);
    setRemoteUserName('');
    setCallDuration(0);
    setIsMuted(false);
  }, [remoteUserId, sendSignal, stopCallTimer]);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    if (remoteAudio.current) {
      remoteAudio.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  }, [isSpeakerOn]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    callStatus,
    remoteUserName,
    callDuration,
    formattedDuration: formatDuration(callDuration),
    isMuted,
    isSpeakerOn,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  };
}
