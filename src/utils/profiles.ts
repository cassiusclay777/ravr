export interface DspPreferences {
  sweetenerTargetLUFS?: number;
  stereoWidth?: number;
  eqTiltDbPerDecade?: number;
  limiter?: {
    threshold: number;
    release: number;
    ratio: number;
  };
  monoBelowHz?: number;
}

export interface DeviceProfile {
  id: string;
  name: string;
  dsp?: DspPreferences;
}

export const DEFAULT_DSP_PREFERENCES: DspPreferences = {
  sweetenerTargetLUFS: -14,
  stereoWidth: 1,
  eqTiltDbPerDecade: 0,
  limiter: {
    threshold: -1,
    release: 0.2,
    ratio: 20
  },
  monoBelowHz: 90
};

export const DEFAULT_PROFILE: DeviceProfile = {
  id: "default",
  name: "Default",
  dsp: DEFAULT_DSP_PREFERENCES
};

export const KNOWN_PROFILES: DeviceProfile[] = [DEFAULT_PROFILE];

export function matchProfileByLabel(label: string): DeviceProfile | undefined {
  if (!label) return undefined;
  
  // Try exact match first
  const exactMatch = KNOWN_PROFILES.find(profile => 
    profile.name.toLowerCase() === label.toLowerCase()
  );
  
  if (exactMatch) return exactMatch;
  
  // Try partial match
  return KNOWN_PROFILES.find(profile => 
    label.toLowerCase().includes(profile.name.toLowerCase())
  );
}