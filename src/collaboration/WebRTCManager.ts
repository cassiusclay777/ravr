interface CollaborationSession {
  id: string;
  name: string;
  host: string;
  participants: Participant[];
  isHost: boolean;
  createdAt: Date;
  settings: {
    maxParticipants: number;
    allowGuestControl: boolean;
    audioQuality: 'low' | 'medium' | 'high';
    syncMode: 'realtime' | 'buffered';
  };
}

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  audioEnabled: boolean;
  micEnabled: boolean;
  latency: number;
  quality: number;
}

interface AudioMessage {
  type: 'audio-data' | 'sync-position' | 'dsp-change' | 'control-change';
  timestamp: number;
  data: any;
  participantId: string;
}

type CollaborationCallback = (event: string, data: any) => void;

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext;
  private mediaRecorder: MediaRecorder | null = null;
  
  private session: CollaborationSession | null = null;
  private isHost = false;
  private signalingSocket: WebSocket | null = null;
  
  // Audio processing nodes
  private audioMixer!: GainNode;
  private audioSplitter!: ChannelSplitterNode;
  private participants: Map<string, Participant> = new Map();
  
  // Callbacks
  private eventCallbacks: Map<string, CollaborationCallback[]> = new Map();
  
  // Configuration
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers for production
    ]
  };

  constructor(audioContext: AudioContext, signalingServerUrl: string = 'wss://ravr-signaling.com') {
    this.audioContext = audioContext;
    this.setupAudioNodes();
    this.connectSignalingServer(signalingServerUrl);
  }

  private setupAudioNodes(): void {
    this.audioMixer = this.audioContext.createGain();
    this.audioSplitter = this.audioContext.createChannelSplitter(8); // Support up to 8 participants
    
    // Connect to main audio output
    this.audioMixer.connect(this.audioContext.destination);
  }

  private async connectSignalingServer(url: string): Promise<void> {
    try {
      this.signalingSocket = new WebSocket(url);
      
      this.signalingSocket.onopen = () => {
        console.log('Connected to signaling server');
        this.emit('signaling-connected');
      };
      
      this.signalingSocket.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data));
      };
      
      this.signalingSocket.onclose = () => {
        console.log('Disconnected from signaling server');
        this.emit('signaling-disconnected');
        
        // Attempt reconnection
        setTimeout(() => {
          this.connectSignalingServer(url);
        }, 5000);
      };
      
      this.signalingSocket.onerror = (error) => {
        console.error('Signaling server error:', error);
        this.emit('signaling-error', error);
      };
      
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
      // Use fallback P2P discovery
      this.setupFallbackSignaling();
    }
  }

  private setupFallbackSignaling(): void {
    // Implement WebRTC signaling without server using QR codes or manual exchange
    console.log('Using fallback P2P signaling');
  }

  async createSession(sessionName: string, settings: Partial<CollaborationSession['settings']> = {}): Promise<string> {
    const sessionId = this.generateSessionId();
    
    this.session = {
      id: sessionId,
      name: sessionName,
      host: 'local-user',
      participants: [{
        id: 'local',
        name: 'Host',
        isHost: true,
        isConnected: true,
        audioEnabled: true,
        micEnabled: false,
        latency: 0,
        quality: 1
      }],
      isHost: true,
      createdAt: new Date(),
      settings: {
        maxParticipants: 8,
        allowGuestControl: false,
        audioQuality: 'high',
        syncMode: 'realtime',
        ...settings
      }
    };

    this.isHost = true;
    
    // Initialize audio capture
    await this.setupAudioCapture();
    
    // Notify signaling server
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.sendSignalingMessage({
        type: 'create-session',
        sessionId,
        sessionName,
        settings: this.session.settings
      });
    }

    this.emit('session-created', this.session);
    return sessionId;
  }

  async joinSession(sessionId: string, userName: string = 'Guest'): Promise<boolean> {
    try {
      // Request session info from signaling server
      if (this.signalingSocket?.readyState === WebSocket.OPEN) {
        this.sendSignalingMessage({
          type: 'join-session',
          sessionId,
          userName
        });
      }

      // Setup audio capture for participant
      await this.setupAudioCapture();
      
      return true;
    } catch (error) {
      console.error('Failed to join session:', error);
      return false;
    }
  }

  private async setupAudioCapture(): Promise<void> {
    try {
      // Get user media for microphone (optional)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Setup media recorder for audio streaming
      this.mediaRecorder = new MediaRecorder(this.localStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.broadcastAudioData(event.data);
        }
      };

      console.log('Audio capture setup complete');
    } catch (error) {
      console.warn('Microphone not available:', error);
      // Continue without microphone
    }
  }

  private async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(this.rtcConfig);
    
    // Add local stream if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming streams
    pc.ontrack = (event) => {
      this.handleRemoteStream(participantId, event.streams[0]);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          targetId: participantId
        });
      }
    };

    // Setup data channel for audio sync
    const dataChannel = pc.createDataChannel('audio-sync', {
      ordered: true
    });
    
    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${participantId}`);
      this.dataChannels.set(participantId, dataChannel);
    };
    
    dataChannel.onmessage = (event) => {
      this.handleDataChannelMessage(participantId, JSON.parse(event.data));
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (messageEvent) => {
        this.handleDataChannelMessage(participantId, JSON.parse(messageEvent.data));
      };
      this.dataChannels.set(participantId, channel);
    };

    this.peerConnections.set(participantId, pc);
    return pc;
  }

  private handleRemoteStream(participantId: string, stream: MediaStream): void {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    // Create audio source from remote stream
    const mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    const participantGain = this.audioContext.createGain();
    
    // Connect to mixer
    mediaStreamSource.connect(participantGain);
    participantGain.connect(this.audioMixer);
    
    // Store for later control
    const participant = this.participants.get(participantId);
    if (participant) {
      (participant as any).audioNode = participantGain;
    }

    this.emit('participant-audio-connected', { participantId, stream });
  }

  private handleSignalingMessage(message: any): void {
    switch (message.type) {
      case 'session-info':
        this.handleSessionInfo(message);
        break;
      case 'participant-joined':
        this.handleParticipantJoined(message);
        break;
      case 'participant-left':
        this.handleParticipantLeft(message);
        break;
      case 'offer':
        this.handleOffer(message);
        break;
      case 'answer':
        this.handleAnswer(message);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(message);
        break;
    }
  }

  private async handleSessionInfo(message: any): Promise<void> {
    this.session = {
      id: message.sessionId,
      name: message.sessionName,
      host: message.host,
      participants: message.participants,
      isHost: false,
      createdAt: new Date(message.createdAt),
      settings: message.settings
    };

    this.emit('session-joined', this.session);
  }

  private async handleParticipantJoined(message: any): Promise<void> {
    const participant: Participant = {
      id: message.participantId,
      name: message.userName,
      isHost: false,
      isConnected: false,
      audioEnabled: true,
      micEnabled: true,
      latency: 0,
      quality: 0
    };

    this.participants.set(participant.id, participant);
    
    if (this.session) {
      this.session.participants.push(participant);
    }

    // Create peer connection
    const pc = await this.createPeerConnection(participant.id);
    
    if (this.isHost) {
      // Host initiates connection
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      this.sendSignalingMessage({
        type: 'offer',
        offer,
        targetId: participant.id
      });
    }

    this.emit('participant-joined', participant);
  }

  private handleParticipantLeft(message: any): void {
    const participantId = message.participantId;
    
    // Clean up peer connection
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId);
    }

    // Clean up data channel
    this.dataChannels.delete(participantId);
    
    // Remove participant
    this.participants.delete(participantId);
    
    if (this.session) {
      this.session.participants = this.session.participants.filter(p => p.id !== participantId);
    }

    this.emit('participant-left', { participantId });
  }

  private async handleOffer(message: any): Promise<void> {
    const pc = await this.createPeerConnection(message.fromId);
    
    await pc.setRemoteDescription(message.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    this.sendSignalingMessage({
      type: 'answer',
      answer,
      targetId: message.fromId
    });
  }

  private async handleAnswer(message: any): Promise<void> {
    const pc = this.peerConnections.get(message.fromId);
    if (pc) {
      await pc.setRemoteDescription(message.answer);
    }
  }

  private async handleIceCandidate(message: any): Promise<void> {
    const pc = this.peerConnections.get(message.fromId);
    if (pc) {
      await pc.addIceCandidate(message.candidate);
    }
  }

  private handleDataChannelMessage(participantId: string, message: AudioMessage): void {
    switch (message.type) {
      case 'sync-position':
        this.handleSyncPosition(participantId, message);
        break;
      case 'dsp-change':
        this.handleDSPChange(participantId, message);
        break;
      case 'control-change':
        this.handleControlChange(participantId, message);
        break;
    }
  }

  private handleSyncPosition(participantId: string, message: AudioMessage): void {
    this.emit('sync-position', {
      participantId,
      position: message.data.position,
      timestamp: message.timestamp
    });
  }

  private handleDSPChange(participantId: string, message: AudioMessage): void {
    this.emit('dsp-change', {
      participantId,
      dspType: message.data.dspType,
      parameters: message.data.parameters
    });
  }

  private handleControlChange(participantId: string, message: AudioMessage): void {
    this.emit('control-change', {
      participantId,
      control: message.data.control,
      value: message.data.value
    });
  }

  // Public API methods
  broadcastAudioData(audioData: Blob): void {
    const message: AudioMessage = {
      type: 'audio-data',
      timestamp: Date.now(),
      data: audioData,
      participantId: 'local'
    };

    // Send via data channels
    for (const [participantId, channel] of this.dataChannels) {
      if (channel.readyState === 'open') {
        try {
          channel.send(JSON.stringify(message));
        } catch (error) {
          console.warn(`Failed to send audio data to ${participantId}:`, error);
        }
      }
    }
  }

  syncPlaybackPosition(position: number): void {
    const message: AudioMessage = {
      type: 'sync-position',
      timestamp: Date.now(),
      data: { position },
      participantId: 'local'
    };

    this.broadcastMessage(message);
  }

  broadcastDSPChange(dspType: string, parameters: any): void {
    const message: AudioMessage = {
      type: 'dsp-change',
      timestamp: Date.now(),
      data: { dspType, parameters },
      participantId: 'local'
    };

    this.broadcastMessage(message);
  }

  setParticipantVolume(participantId: string, volume: number): void {
    const participant = this.participants.get(participantId);
    if (participant && (participant as any).audioNode) {
      (participant as any).audioNode.gain.value = volume;
    }
  }

  muteParticipant(participantId: string, muted: boolean): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.audioEnabled = !muted;
      this.setParticipantVolume(participantId, muted ? 0 : 1);
    }
  }

  leaveSession(): void {
    // Close all peer connections
    for (const [id, pc] of this.peerConnections) {
      pc.close();
    }
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.participants.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Notify signaling server
    if (this.signalingSocket?.readyState === WebSocket.OPEN && this.session) {
      this.sendSignalingMessage({
        type: 'leave-session',
        sessionId: this.session.id
      });
    }

    this.session = null;
    this.isHost = false;

    this.emit('session-left');
  }

  // Utility methods
  private broadcastMessage(message: AudioMessage): void {
    for (const [participantId, channel] of this.dataChannels) {
      if (channel.readyState === 'open') {
        try {
          channel.send(JSON.stringify(message));
        } catch (error) {
          console.warn(`Failed to broadcast to ${participantId}:`, error);
        }
      }
    }
  }

  private sendSignalingMessage(message: any): void {
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    }
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Event system
  on(event: string, callback: CollaborationCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  off(event: string, callback: CollaborationCallback): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event, data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  // Getters
  getSession(): CollaborationSession | null {
    return this.session;
  }

  getParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  getConnectionStatus(): { connected: number; total: number } {
    const participants = Array.from(this.participants.values());
    const connected = participants.filter(p => p.isConnected).length;
    return { connected, total: participants.length };
  }

  dispose(): void {
    this.leaveSession();
    
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }

    this.eventCallbacks.clear();
  }
}
