declare interface HTMLMediaElement {
  // Non-standard but supported by some browsers and Electron/WebView
  setSinkId?(sinkId: string): Promise<void>;
}
