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
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const ringtoneRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    remoteUserIdRef.current = remoteUserId;
  }, [remoteUserId]);

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

  // Helper functions (not hooks)
  const startRingtone = () => {
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
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneRef.current) {
      ringtoneRef.current.close().catch(() => {});
      ringtoneRef.current = null;
    }
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const cleanup = useCallback(() => {
    stopRingtone();
    stopCallTimer();
    toast.dismiss('incoming-call');
    
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    setCallStatus('idle');
    setRemoteUserId(null);
    setRemoteUserName('');
    setCallDuration(0);
    setIsMuted(false);
    pendingOfferRef.current = null;
  }, []);

  const sendSignal = useCallback(async (targetUserId: string, signal: Omit<CallSignal, 'from' | 'fromName' | 'to'>) => {
    if (!user?.id || !targetUserId) return;

    console.log('Sending signal:', signal.type, 'to:', targetUserId);
    
    const targetChannel = supabase.channel(`calls-${targetUserId}-${Date.now()}`);
    
    try {
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
      
      await targetChannel.send({
        type: 'broadcast',
        event: 'call-signal',
        payload: {
          ...signal,
          to: targetUserId,
          from: user.id,
          fromName: profile?.full_name || 'Unknown',
        },
      });

      console.log('Signal sent successfully');
    } catch (error) {
      console.error('Error sending signal:', error);
    } finally {
      setTimeout(() => {
        supabase.removeChannel(targetChannel);
      }, 500);
    }
  }, [user?.id, profile?.full_name]);

  const endCall = useCallback((sendEndSignal = true) => {
    const targetId = remoteUserIdRef.current;
    if (sendEndSignal && targetId) {
      sendSignal(targetId, { type: 'end-call', payload: {} });
    }
    cleanup();
  }, [sendSignal, cleanup]);

  const createPeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(targetUserId, {
          type: 'ice-candidate',
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
        cleanup();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [sendSignal, cleanup]);

  const startCall = useCallback(async (targetUserId: string, targetUserName: string) => {
    try {
      setRemoteUserId(targetUserId);
      setRemoteUserName(targetUserName);
      setCallStatus('calling');

      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const pc = createPeerConnection(targetUserId);

      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current!);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await sendSignal(targetUserId, {
        type: 'offer',
        payload: offer,
      });

      toast.info(`Calling ${targetUserName}...`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call. Please check microphone permissions.');
      cleanup();
    }
  }, [createPeerConnection, sendSignal, cleanup]);

  const acceptCall = useCallback(async () => {
    const targetUserId = remoteUserIdRef.current;
    if (!targetUserId) {
      console.error('No remote user ID');
      return;
    }
    
    const offer = pendingOfferRef.current;
    if (!offer || !offer.type || !offer.sdp) {
      console.error('No valid pending offer:', offer);
      toast.error('Call data not received properly. Please try again.');
      cleanup();
      return;
    }

    try {
      stopRingtone();
      toast.dismiss('incoming-call');
      
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const pc = createPeerConnection(targetUserId);

      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current!);
      });

      console.log('Setting remote description with offer:', offer);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignal(targetUserId, {
        type: 'answer',
        payload: answer,
      });

      pendingOfferRef.current = null;
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      cleanup();
    }
  }, [createPeerConnection, sendSignal, cleanup]);

  const rejectCall = useCallback(() => {
    const targetId = remoteUserIdRef.current;
    stopRingtone();
    toast.dismiss('incoming-call');
    
    if (targetId) {
      sendSignal(targetId, { type: 'end-call', payload: {} });
    }
    cleanup();
  }, [sendSignal, cleanup]);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
            // Handle incoming call
            setRemoteUserId(signal.from);
            setRemoteUserName(signal.fromName || 'Unknown');
            setCallStatus('incoming');
            pendingOfferRef.current = signal.payload;
            startRingtone();
            toast.info(`Incoming call from ${signal.fromName || 'Unknown'}`, {
              duration: 30000,
              id: 'incoming-call',
            });
            break;
          case 'answer':
            if (peerConnection.current) {
              try {
                await peerConnection.current.setRemoteDescription(
                  new RTCSessionDescription(signal.payload)
                );
              } catch (error) {
                console.error('Error handling answer:', error);
              }
            }
            break;
          case 'ice-candidate':
            if (peerConnection.current) {
              try {
                await peerConnection.current.addIceCandidate(
                  new RTCIceCandidate(signal.payload)
                );
              } catch (error) {
                console.error('Error adding ICE candidate:', error);
              }
            }
            break;
          case 'end-call':
            cleanup();
            break;
        }
      })
      .subscribe((status) => {
        console.log('Call channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, cleanup]);

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