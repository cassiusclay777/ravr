/**
 * Type definitions for the RAVR Audio Engine Knowledge Graph Memory System
 */

export interface Entity {
  name: string;
  entityType: EntityType;
  observations: string[];
  properties?: Record<string, any>;
}

export type EntityType = 
  | 'AudioFile' 
  | 'Effect' 
  | 'Preset' 
  | 'ProcessingChain' 
  | 'Project' 
  | 'User' 
  | 'Tag';

export interface Relation {
  from: string;      // Source entity name
  to: string;        // Target entity name
  relationType: RelationType;
  properties?: Record<string, any>;
}

export type RelationType = 
  | 'processed_with' 
  | 'contains' 
  | 'uses_preset' 
  | 'part_of' 
  | 'tagged_with' 
  | 'created_by' 
  | 'modified_by';

export interface Observation {
  entityName: string;
  contents: string[];
  timestamp?: number;
}

// Example usage with audio-specific types
export interface AudioFileEntity extends Entity {
  entityType: 'AudioFile';
  properties: {
    path: string;
    format: string;
    duration: number;
    sampleRate: number;
    channels: number;
    bitDepth: number;
    createdAt: string;
    modifiedAt: string;
  };
}

export interface EffectEntity extends Entity {
  entityType: 'Effect';
  properties: {
    type: string;
    category: 'dynamics' | 'eq' | 'time' | 'spatial' | 'pitch' | 'other';
    isFavorite: boolean;
    lastUsed: string;
  };
}

// Helper functions for working with the knowledge graph
export const createAudioFileEntity = (name: string, props: Partial<AudioFileEntity['properties']>): AudioFileEntity => ({
  name,
  entityType: 'AudioFile',
  observations: [],
  properties: {
    path: '',
    format: '',
    duration: 0,
    sampleRate: 44100,
    channels: 2,
    bitDepth: 24,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    ...props
  }
});

export const createEffectEntity = (name: string, type: string, category: EffectEntity['properties']['category']): EffectEntity => ({
  name,
  entityType: 'Effect',
  observations: [],
  properties: {
    type,
    category,
    isFavorite: false,
    lastUsed: new Date().toISOString()
  }
});
