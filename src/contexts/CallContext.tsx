import React, { createContext, useContext, ReactNode } from 'react';
import { useWebRTCCall, CallStatus } from '@/hooks/useWebRTCCall';
import { AudioCallUI } from '@/components/messaging/AudioCallUI';

interface CallContextType {
  callStatus: CallStatus;
  startCall: (targetUserId: string, targetUserName: string) => Promise<void>;
  endCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const {
    callStatus,
    remoteUserName,
    formattedDuration,
    isMuted,
    isSpeakerOn,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  } = useWebRTCCall();

  return (
    <CallContext.Provider value={{ callStatus, startCall, endCall }}>
      {children}
      
      {/* Global Call UI */}
      <AudioCallUI
        status={callStatus}
        remoteUserName={remoteUserName}
        formattedDuration={formattedDuration}
        isMuted={isMuted}
        isSpeakerOn={isSpeakerOn}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={() => endCall(true)}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
      />
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
