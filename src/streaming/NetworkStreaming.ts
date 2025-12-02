/**
 * NetworkStreaming - Network Audio Streaming Module
 * Podpora pro SMB, SFTP, FTP, UPnP/DLNA, Chromecast
 * Open-source implementace bez proprietárních protokolů
 */

export interface NetworkSource {
  id: string;
  name: string;
  type: 'SMB' | 'SFTP' | 'FTP' | 'UPnP' | 'DLNA' | 'Chromecast' | 'HTTP';
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  metadata?: Record<string, any>;
}

export interface StreamConfig {
  bufferSize: number; // bytes
  chunkSize: number; // bytes
  maxRetries: number;
  timeout: number; // ms
}

export interface UPnPDevice {
  id: string;
  friendlyName: string;
  manufacturer: string;
  modelName: string;
  location: string;
  services: UPnPService[];
}

export interface UPnPService {
  serviceType: string;
  serviceId: string;
  controlURL: string;
  eventSubURL: string;
  SCPDURL: string;
}

/**
 * Network Streaming Manager
 */
export class NetworkStreaming {
  private sources: Map<string, NetworkSource> = new Map();
  private activeStreams: Map<string, MediaSource> = new Map();
  private config: StreamConfig;

  // UPnP/DLNA discovery
  private upnpDevices: Map<string, UPnPDevice> = new Map();
  private discoveryInterval: number | null = null;

  // Chromecast
  private castContext: any = null;
  private castSession: any = null;

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = {
      bufferSize: 1024 * 1024 * 10, // 10MB
      chunkSize: 1024 * 64, // 64KB chunks
      maxRetries: 3,
      timeout: 30000, // 30s
      ...config
    };
  }

  /**
   * Initialize network streaming
   */
  async initialize(): Promise<void> {
    console.log('[NetworkStreaming] Initializing...');

    // Start UPnP/DLNA discovery
    await this.startUPnPDiscovery();

    // Initialize Chromecast if available
    await this.initializeChromecast();

    console.log('[NetworkStreaming] Initialized');
  }

  /**
   * Add network source
   */
  addSource(source: Omit<NetworkSource, 'id' | 'status'>): string {
    const id = this.generateId();
    const networkSource: NetworkSource = {
      ...source,
      id,
      status: 'disconnected'
    };

    this.sources.set(id, networkSource);
    console.log(`[NetworkStreaming] Added source: ${source.name} (${source.type})`);

    return id;
  }

  /**
   * Remove network source
   */
  removeSource(id: string): boolean {
    const removed = this.sources.delete(id);
    if (removed) {
      this.activeStreams.delete(id);
      console.log(`[NetworkStreaming] Removed source: ${id}`);
    }
    return removed;
  }

  /**
   * Get all sources
   */
  getSources(): NetworkSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Stream from network source
   */
  async streamFromSource(sourceId: string): Promise<string> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    console.log(`[NetworkStreaming] Streaming from: ${source.name}`);

    switch (source.type) {
      case 'HTTP':
        return await this.streamHTTP(source);

      case 'FTP':
        return await this.streamFTP(source);

      case 'SFTP':
        return await this.streamSFTP(source);

      case 'SMB':
        return await this.streamSMB(source);

      case 'UPnP':
      case 'DLNA':
        return await this.streamUPnP(source);

      case 'Chromecast':
        return await this.streamChromecast(source);

      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Stream via HTTP
   */
  private async streamHTTP(source: NetworkSource): Promise<string> {
    try {
      // Direct HTTP streaming using fetch with range requests
      const response = await fetch(source.url, {
        method: 'GET',
        headers: {
          'Range': `bytes=0-${this.config.chunkSize}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      // For progressive streaming, return the URL directly
      // Browser can handle HTTP streaming natively
      source.status = 'connected';
      this.sources.set(source.id, source);

      return source.url;
    } catch (error) {
      source.status = 'error';
      this.sources.set(source.id, source);
      throw error;
    }
  }

  /**
   * Stream via FTP
   * Note: Browser limitations - FTP streaming requires proxy/gateway
   */
  private async streamFTP(source: NetworkSource): Promise<string> {
    console.warn('[NetworkStreaming] FTP direct streaming not supported in browser');
    console.warn('[NetworkStreaming] Using HTTP proxy fallback');

    // Convert FTP URL to HTTP proxy URL
    // In production, you'd have a server-side proxy that converts FTP to HTTP
    const proxyUrl = this.convertToProxyURL(source.url, 'ftp');

    source.status = 'connected';
    this.sources.set(source.id, source);

    return proxyUrl;
  }

  /**
   * Stream via SFTP
   * Note: Browser limitations - SFTP requires server-side proxy
   */
  private async streamSFTP(source: NetworkSource): Promise<string> {
    console.warn('[NetworkStreaming] SFTP direct streaming not supported in browser');
    console.warn('[NetworkStreaming] Using HTTP proxy fallback');

    // Convert SFTP URL to HTTP proxy URL
    const proxyUrl = this.convertToProxyURL(source.url, 'sftp');

    source.status = 'connected';
    this.sources.set(source.id, source);

    return proxyUrl;
  }

  /**
   * Stream via SMB
   * Note: Browser limitations - SMB requires server-side proxy
   */
  private async streamSMB(source: NetworkSource): Promise<string> {
    console.warn('[NetworkStreaming] SMB direct streaming not supported in browser');
    console.warn('[NetworkStreaming] Using HTTP proxy fallback');

    // Convert SMB URL to HTTP proxy URL
    const proxyUrl = this.convertToProxyURL(source.url, 'smb');

    source.status = 'connected';
    this.sources.set(source.id, source);

    return proxyUrl;
  }

  /**
   * Convert protocol URL to HTTP proxy URL
   */
  private convertToProxyURL(url: string, protocol: string): string {
    // In production, this would point to your proxy server
    // Example: https://your-proxy.com/stream?protocol=ftp&url=...
    const proxyBase = '/api/stream-proxy';
    const encodedUrl = encodeURIComponent(url);
    return `${proxyBase}?protocol=${protocol}&url=${encodedUrl}`;
  }

  /**
   * UPnP/DLNA Discovery
   */
  private async startUPnPDiscovery(): Promise<void> {
    console.log('[NetworkStreaming] Starting UPnP/DLNA discovery...');

    // Note: Browser limitations - SSDP multicast not directly available
    // This would typically use a WebSocket connection to a local discovery service
    // or use WebRTC for local network discovery

    // Placeholder for UPnP discovery via proxy/service
    const discoveryServiceUrl = '/api/upnp/discover';

    try {
      const response = await fetch(discoveryServiceUrl);
      if (response.ok) {
        const devices = await response.json();
        devices.forEach((device: UPnPDevice) => {
          this.upnpDevices.set(device.id, device);
          console.log(`[NetworkStreaming] Found UPnP device: ${device.friendlyName}`);
        });
      }
    } catch (error) {
      console.warn('[NetworkStreaming] UPnP discovery failed (requires backend service):', error);
    }

    // Start periodic discovery
    this.discoveryInterval = window.setInterval(() => {
      this.refreshUPnPDevices();
    }, 30000); // Every 30 seconds
  }

  /**
   * Refresh UPnP devices
   */
  private async refreshUPnPDevices(): Promise<void> {
    try {
      const response = await fetch('/api/upnp/discover');
      if (response.ok) {
        const devices = await response.json();

        // Update devices
        const newDeviceIds = new Set<string>();
        devices.forEach((device: UPnPDevice) => {
          newDeviceIds.add(device.id);
          this.upnpDevices.set(device.id, device);
        });

        // Remove disconnected devices
        for (const [id] of this.upnpDevices) {
          if (!newDeviceIds.has(id)) {
            this.upnpDevices.delete(id);
          }
        }
      }
    } catch (error) {
      console.warn('[NetworkStreaming] UPnP refresh failed:', error);
    }
  }

  /**
   * Get discovered UPnP/DLNA devices
   */
  getUPnPDevices(): UPnPDevice[] {
    return Array.from(this.upnpDevices.values());
  }

  /**
   * Stream from UPnP/DLNA device
   */
  private async streamUPnP(source: NetworkSource): Promise<string> {
    const device = this.upnpDevices.get(source.metadata?.deviceId);
    if (!device) {
      throw new Error('UPnP device not found');
    }

    // Get media URL from UPnP device
    const mediaUrl = await this.getUPnPMediaURL(device, source.metadata?.mediaId);

    source.status = 'connected';
    this.sources.set(source.id, source);

    return mediaUrl;
  }

  /**
   * Get media URL from UPnP device
   */
  private async getUPnPMediaURL(device: UPnPDevice, mediaId: string): Promise<string> {
    // This would use UPnP ContentDirectory service to browse/get media URLs
    // Implementation would use SOAP calls to UPnP services
    const controlUrl = device.services.find(s =>
      s.serviceType.includes('ContentDirectory')
    )?.controlURL;

    if (!controlUrl) {
      throw new Error('ContentDirectory service not found');
    }

    // Make SOAP request to get media URL
    const soapAction = 'urn:schemas-upnp-org:service:ContentDirectory:1#Browse';
    const soapBody = `
      <?xml version="1.0"?>
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
                  s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
        <s:Body>
          <u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
            <ObjectID>${mediaId}</ObjectID>
            <BrowseFlag>BrowseMetadata</BrowseFlag>
            <Filter>*</Filter>
            <StartingIndex>0</StartingIndex>
            <RequestedCount>1</RequestedCount>
            <SortCriteria></SortCriteria>
          </u:Browse>
        </s:Body>
      </s:Envelope>
    `;

    try {
      const response = await fetch(controlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset="utf-8"',
          'SOAPAction': `"${soapAction}"`
        },
        body: soapBody
      });

      if (!response.ok) {
        throw new Error(`SOAP request failed: ${response.status}`);
      }

      const xmlText = await response.text();
      // Parse XML and extract media URL
      // Simplified - real implementation would use XML parser
      const urlMatch = xmlText.match(/<res[^>]*>([^<]+)<\/res>/);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }

      throw new Error('Media URL not found in UPnP response');
    } catch (error) {
      console.error('[NetworkStreaming] UPnP media URL retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Chromecast
   */
  private async initializeChromecast(): Promise<void> {
    // Check if Chromecast SDK is loaded
    if (typeof window !== 'undefined' && (window as any).chrome?.cast) {
      console.log('[NetworkStreaming] Initializing Chromecast...');

      try {
        const cast = (window as any).chrome.cast;

        const sessionRequest = new cast.SessionRequest(cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
        const apiConfig = new cast.ApiConfig(
          sessionRequest,
          (session: any) => this.onCastSessionInitiated(session),
          (availability: string) => {
            console.log(`[NetworkStreaming] Chromecast availability: ${availability}`);
          }
        );

        await cast.initialize(apiConfig);
        this.castContext = cast;
        console.log('[NetworkStreaming] Chromecast initialized');
      } catch (error) {
        console.warn('[NetworkStreaming] Chromecast initialization failed:', error);
      }
    } else {
      console.warn('[NetworkStreaming] Chromecast SDK not available');
      console.warn('[NetworkStreaming] Add: <script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js"></script>');
    }
  }

  /**
   * Chromecast session initiated callback
   */
  private onCastSessionInitiated(session: any): void {
    this.castSession = session;
    console.log('[NetworkStreaming] Chromecast session initiated:', session.sessionId);
  }

  /**
   * Stream to Chromecast
   */
  private async streamChromecast(source: NetworkSource): Promise<string> {
    if (!this.castContext) {
      throw new Error('Chromecast not initialized');
    }

    try {
      // Request Chromecast session
      const cast = (window as any).chrome.cast;
      const session = this.castSession || await this.requestCastSession();

      // Create media info
      const mediaInfo = new cast.media.MediaInfo(source.url, 'audio/mpeg');
      mediaInfo.metadata = new cast.media.MusicTrackMediaMetadata();

      if (source.metadata) {
        mediaInfo.metadata.title = source.metadata.title || source.name;
        mediaInfo.metadata.artist = source.metadata.artist;
        mediaInfo.metadata.albumName = source.metadata.album;
      }

      // Load media
      const request = new cast.media.LoadRequest(mediaInfo);
      await session.loadMedia(request);

      source.status = 'connected';
      this.sources.set(source.id, source);

      return source.url;
    } catch (error) {
      source.status = 'error';
      this.sources.set(source.id, source);
      throw error;
    }
  }

  /**
   * Request Chromecast session
   */
  private async requestCastSession(): Promise<any> {
    return new Promise((resolve, reject) => {
      const cast = (window as any).chrome.cast;
      cast.requestSession(
        (session: any) => {
          this.castSession = session;
          resolve(session);
        },
        (error: any) => {
          reject(new Error(`Failed to start Chromecast session: ${error.description}`));
        }
      );
    });
  }

  /**
   * Check if Chromecast is available
   */
  isChromecastAvailable(): boolean {
    return this.castContext !== null;
  }

  /**
   * Get active Chromecast session
   */
  getChromecastSession(): any {
    return this.castSession;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `net-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    // Stop UPnP discovery
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    // Clear sources and streams
    this.sources.clear();
    this.activeStreams.clear();
    this.upnpDevices.clear();

    // Stop Chromecast session
    if (this.castSession) {
      try {
        this.castSession.stop(() => {
          console.log('[NetworkStreaming] Chromecast session stopped');
        }, (error: any) => {
          console.warn('[NetworkStreaming] Failed to stop Chromecast session:', error);
        });
      } catch (error) {
        console.warn('[NetworkStreaming] Chromecast cleanup error:', error);
      }
      this.castSession = null;
    }

    console.log('[NetworkStreaming] Disposed');
  }
}

// Export singleton instance
export const networkStreaming = new NetworkStreaming();
