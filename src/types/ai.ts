export type ProcessingProfile = 
  | 'NeutronAI' 
  | 'IndustrialBeast' 
  | 'AmbientSpace' 
  | 'VocalWarmth' 
  | 'Flat';

export interface EnhancementMetrics {
  clarity: number;
  warmth: number;
  dynamics: number;
  spatial: number;
}

export interface ExportOptions {
  profile: ProcessingProfile;
  quality: 'draft' | 'good' | 'high' | 'maximum';
  includeOriginal: boolean;
  onProgress?: (progress: number) => void;
}

export interface AiModelConfig {
  audioSrStrength: number;
  demucsEnabled: boolean;
  ddspHarmonics: number;
  genreAdaptive: boolean;
  relativisticEnabled: boolean;
}

export interface GenreDetectionResult {
  genre: string;
  confidence: number;
  subgenres?: string[];
  mood?: string[];
}

export interface SpatialProfile {
  width: number;
  depth: number;
  height: number;
  movement?: 'static' | 'linear' | 'circular' | 'random';
}

export interface RelativisticEffects {
  spatialEnabled: boolean;
  dopplerEnabled: boolean;
  timeDilationEnabled: boolean;
  gravityWellsEnabled: boolean;
  strength: number;
}

export interface ProcessingSettings {
  profile: ProcessingProfile;
  customSettings?: Partial<AiModelConfig>;
  relativisticEffects?: RelativisticEffects;
  spatialProfile?: SpatialProfile;
}
