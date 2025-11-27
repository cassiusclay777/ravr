// Web MIDI API TypeScript definitions extending existing DOM types

/// <reference lib="dom" />

// Extend existing DOM interfaces if they exist
declare global {
  namespace WebMidi {
    interface MIDIAccess extends EventTarget {
      readonly inputs: MIDIInputMap;
      readonly outputs: MIDIOutputMap;
      readonly sysexEnabled: boolean;
      onstatechange: ((this: MIDIAccess, ev: MIDIConnectionEvent) => any) | null;
    }

    interface MIDIInputMap extends ReadonlyMap<string, MIDIInput> {}
    interface MIDIOutputMap extends ReadonlyMap<string, MIDIOutput> {}

    interface MIDIPort extends EventTarget {
      readonly id: string | null;
      readonly manufacturer: string | null;
      readonly name: string | null;
      readonly type: MIDIPortType;
      readonly version: string | null;
      readonly state: MIDIPortDeviceState;
      readonly connection: MIDIPortConnectionState;
      onstatechange: ((this: MIDIPort, ev: MIDIConnectionEvent) => any) | null;
      open(): Promise<MIDIPort>;
      close(): Promise<MIDIPort>;
    }

    interface MIDIInput extends MIDIPort {
      readonly type: "input";
      onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => any) | null;
    }

    interface MIDIOutput extends MIDIPort {
      readonly type: "output";
      send(data: Uint8Array, timestamp?: number): void;
      clear(): void;
    }

    type MIDIPortType = "input" | "output";
    type MIDIPortDeviceState = "disconnected" | "connected";
    type MIDIPortConnectionState = "open" | "closed" | "pending";

    interface MIDIConnectionEvent extends Event {
      readonly port: MIDIPort | null;
    }

    interface MIDIMessageEvent extends Event {
      readonly data: Uint8Array | null;
      readonly timeStamp: number;
    }

    interface MIDIOptions {
      sysex?: boolean;
      software?: boolean;
    }
  }

  interface Navigator {
    requestMIDIAccess(options?: WebMidi.MIDIOptions): Promise<WebMidi.MIDIAccess>;
  }
}

export {};
