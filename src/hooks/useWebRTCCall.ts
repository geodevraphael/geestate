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
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const ringtoneRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Play ringtone for incoming calls
  const startRingtone = useCallback(() => {
    try {
      ringtoneRef.current = new AudioContext();
      
      const playBeep = () => {
        if (!ringtoneRef.current || ringtoneRef.current.state === 'closed') return;
        
        const oscillator = ringtoneRef.current.createOscillator();
        const gainNode = ringtoneRef.current.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ringtoneRef.current.destination);
        
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        oscillator.stop(ringtoneRef.current.currentTime + 0.2);
        
        // Second beep
        setTimeout(() => {
          if (!ringtoneRef.current || ringtoneRef.current.state === 'closed') return;
          const osc2 = ringtoneRef.current.createOscillator();
          const gain2 = ringtoneRef.current.createGain();
          osc2.connect(gain2);
          gain2.connect(ringtoneRef.current.destination);
          osc2.frequency.value = 520;
          osc2.type = 'sine';
          gain2.gain.value = 0.3;
          osc2.start();
          osc2.stop(ringtoneRef.current.currentTime + 0.2);
        }, 250);
      };
      
      playBeep();
      ringtoneIntervalRef.current = setInterval(playBeep, 2000);
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneRef.current) {
      ringtoneRef.current.close();
      ringtoneRef.current = null;
    }
  }, []);

  // Subscribe to call signals
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up call channel for user:', user.id);
    
    const channel = supabase.channel(`calls-${user.id}`)
      .on('broadcast', { event: 'call-signal' }, async ({ payload }) => {
        const signal = payload as CallSignal;
        if (signal.to !== user.id) return;

        console.log('Received signal:', signal.type, 'from:', signal.from);

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
      .subscribe((status) => {
        console.log('Call channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const sendSignal = useCallback(async (signal: Omit<CallSignal, 'from' | 'fromName'>) => {
    if (!user?.id || !signal.to) return;

    console.log('Sending signal:', signal.type, 'to:', signal.to);
    
    const targetChannel = supabase.channel(`calls-${signal.to}`);
    
    // Wait for channel to be subscribed before sending
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Channel subscription timeout'));
      }, 5000);
      
      targetChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    
    const result = await targetChannel.send({
      type: 'broadcast',
      event: 'call-signal',
      payload: {
        ...signal,
        from: user.id,
        fromName: profile?.full_name || 'Unknown',
      },
    });

    console.log('Signal sent result:', result);
    
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
        stopRingtone();
        startCallTimer();
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall(false);
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [remoteUserId, sendSignal, stopRingtone]);

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

  const handleIncomingCall = useCallback((signal: CallSignal) => {
    if (callStatus !== 'idle') {
      // Already in a call, reject
      sendSignal({ type: 'end-call', to: signal.from, payload: {} });
      return;
    }

    console.log('Incoming call from:', signal.fromName, 'payload:', signal.payload);
    
    setRemoteUserId(signal.from);
    setRemoteUserName(signal.fromName || 'Unknown');
    setCallStatus('incoming');
    
    // Store the offer in ref (not window)
    pendingOfferRef.current = signal.payload;
    
    // Start ringtone
    startRingtone();
    
    // Show toast notification
    toast.info(`Incoming call from ${signal.fromName || 'Unknown'}`, {
      duration: 30000,
      id: 'incoming-call',
    });
  }, [callStatus, sendSignal, startRingtone]);

  const acceptCall = useCallback(async () => {
    if (!remoteUserId) {
      console.error('No remote user ID');
      return;
    }
    
    const offer = pendingOfferRef.current;
    if (!offer || !offer.type || !offer.sdp) {
      console.error('No valid pending offer:', offer);
      toast.error('Call data not received properly. Please try again.');
      endCall(false);
      return;
    }

    try {
      stopRingtone();
      toast.dismiss('incoming-call');
      
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
      console.log('Setting remote description with offer:', offer);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignal({
        type: 'answer',
        to: remoteUserId,
        payload: answer,
      });

      pendingOfferRef.current = null;
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      endCall(false);
    }
  }, [remoteUserId, createPeerConnection, sendSignal, stopRingtone]);

  const handleAnswer = useCallback(async (signal: CallSignal) => {
    if (!peerConnection.current) return;

    try {
      console.log('Setting remote description with answer:', signal.payload);
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
    stopRingtone();
    toast.dismiss('incoming-call');
    
    if (remoteUserId) {
      sendSignal({ type: 'end-call', to: remoteUserId, payload: {} });
    }
    endCall(false);
  }, [remoteUserId, sendSignal, stopRingtone]);

  const endCall = useCallback((sendEndSignal = true) => {
    stopRingtone();
    toast.dismiss('incoming-call');
    
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
    pendingOfferRef.current = null;
  }, [remoteUserId, sendSignal, stopCallTimer, stopRingtone]);

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