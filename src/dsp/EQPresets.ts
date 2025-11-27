export interface EQPreset {
  name: string;
  device: 'headphones' | 'speakers';
  genre: string;
  gains: number[]; // 10 values for 10 bands
  description: string;
}

export const EQ_PRESETS: Record<string, EQPreset[]> = {
  headphones: [
    {
      name: 'Classic Rock',
      device: 'headphones',
      genre: 'Classic',
      gains: [2, 1, 0, -1, 1, 3, 2, 1, 0, -1],
      description: 'Warm mids, punchy bass for classic rock on headphones'
    },
    {
      name: 'Dance/EDM',
      device: 'headphones',
      genre: 'Dance',
      gains: [4, 3, 1, -2, -1, 0, 2, 3, 4, 2],
      description: 'Deep bass, crisp highs for electronic dance music'
    },
    {
      name: 'Techno',
      device: 'headphones',
      genre: 'Techno',
      gains: [5, 4, 2, -1, -2, 1, 3, 4, 3, 1],
      description: 'Heavy bass, clear percussion for techno beats'
    },
    {
      name: 'Drum & Bass',
      device: 'headphones',
      genre: 'DNB',
      gains: [6, 5, 3, 0, -1, 2, 4, 5, 4, 2],
      description: 'Massive sub-bass, detailed highs for DNB'
    },
    {
      name: 'Vocal/Pop',
      device: 'headphones',
      genre: 'Pop',
      gains: [1, 0, -1, 2, 4, 3, 1, 0, -1, -2],
      description: 'Enhanced vocals, balanced for pop music'
    }
  ],
  speakers: [
    {
      name: 'Classic Rock',
      device: 'speakers',
      genre: 'Classic',
      gains: [3, 2, 1, 0, 2, 4, 3, 2, 1, 0],
      description: 'Room-compensated classic rock for speakers'
    },
    {
      name: 'Dance/EDM',
      device: 'speakers',
      genre: 'Dance',
      gains: [3, 2, 0, -1, 0, 1, 3, 4, 5, 3],
      description: 'Speaker-optimized EDM with controlled bass'
    },
    {
      name: 'Techno',
      device: 'speakers',
      genre: 'Techno',
      gains: [4, 3, 1, 0, -1, 2, 4, 5, 4, 2],
      description: 'Powerful techno sound for speaker systems'
    },
    {
      name: 'Drum & Bass',
      device: 'speakers',
      genre: 'DNB',
      gains: [5, 4, 2, 1, 0, 3, 5, 6, 5, 3],
      description: 'Full-range DNB optimized for speakers'
    },
    {
      name: 'Vocal/Pop',
      device: 'speakers',
      genre: 'Pop',
      gains: [2, 1, 0, 3, 5, 4, 2, 1, 0, -1],
      description: 'Clear vocals, balanced pop for room listening'
    }
  ]
};

export class EQPresetManager {
  public static getPresetsForDevice(device: 'headphones' | 'speakers'): EQPreset[] {
    return EQ_PRESETS[device] || [];
  }

  public static getPresetByName(device: 'headphones' | 'speakers', name: string): EQPreset | null {
    const presets = this.getPresetsForDevice(device);
    return presets.find(preset => preset.name === name) || null;
  }

  public static getAllGenres(): string[] {
    const allPresets = [...EQ_PRESETS.headphones, ...EQ_PRESETS.speakers];
    return [...new Set(allPresets.map(preset => preset.genre))];
  }

  public static getPresetByDeviceAndGenre(device: 'headphones' | 'speakers', genre: string): EQPreset | null {
    const presets = this.getPresetsForDevice(device);
    return presets.find(preset => preset.genre === genre) || null;
  }
}
