import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { CallStatus } from '@/hooks/useWebRTCCall';

interface AudioCallUIProps {
  status: CallStatus;
  remoteUserName: string;
  formattedDuration: string;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

export function AudioCallUI({
  status,
  remoteUserName,
  formattedDuration,
  isMuted,
  isSpeakerOn,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
}: AudioCallUIProps) {
  // Play ringtone for incoming calls
  useEffect(() => {
    if (status === 'incoming') {
      // Create audio context for ringtone
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      let isPlaying = true;
      
      const playRing = () => {
        if (!isPlaying) return;
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          if (isPlaying) {
            const newOsc = audioContext.createOscillator();
            newOsc.connect(gainNode);
            newOsc.frequency.value = 440;
            newOsc.type = 'sine';
          }
        }, 500);
      };
      
      // Simple beep notification
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
      
      return () => {
        isPlaying = false;
        audioContext.close();
      };
    }
  }, [status]);

  if (status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 p-8 rounded-3xl bg-card border border-border shadow-2xl">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-3xl font-bold">
                {remoteUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {status === 'connected' && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-success border-4 border-card animate-pulse" />
            )}
          </div>
          
          <h2 className="text-xl font-bold text-foreground mb-1">{remoteUserName}</h2>
          
          <p className="text-sm text-muted-foreground">
            {status === 'calling' && 'Calling...'}
            {status === 'incoming' && 'Incoming call'}
            {status === 'connected' && formattedDuration}
          </p>
        </div>

        {/* Animated Pulse for Calling/Incoming */}
        {(status === 'calling' || status === 'incoming') && (
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/20 animate-ping absolute" />
              <div className="h-16 w-16 rounded-full bg-primary/30 animate-pulse" />
            </div>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex justify-center gap-4">
          {status === 'incoming' ? (
            <>
              <Button
                onClick={onReject}
                size="lg"
                className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <Button
                onClick={onAccept}
                size="lg"
                className="h-16 w-16 rounded-full bg-success hover:bg-success/90 text-white"
              >
                <Phone className="h-7 w-7" />
              </Button>
            </>
          ) : status === 'connected' ? (
            <>
              <Button
                onClick={onToggleMute}
                size="lg"
                variant={isMuted ? 'destructive' : 'secondary'}
                className="h-14 w-14 rounded-full"
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              <Button
                onClick={onEnd}
                size="lg"
                className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <Button
                onClick={onToggleSpeaker}
                size="lg"
                variant={!isSpeakerOn ? 'destructive' : 'secondary'}
                className="h-14 w-14 rounded-full"
              >
                {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
              </Button>
            </>
          ) : (
            <Button
              onClick={onEnd}
              size="lg"
              className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          )}
        </div>

        {/* Status Hints */}
        {status === 'connected' && (
          <div className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground">
            <span>{isMuted ? 'Muted' : 'Tap to mute'}</span>
            <span>{isSpeakerOn ? 'Speaker on' : 'Speaker off'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
