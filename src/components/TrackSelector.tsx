import { useState } from 'react';
import Player from './Player';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

const tracks = [
  {
    name: 'SIMULACRA – SAS',
    file: '/audio/SAS_SIMULACRA.mp3',
  },
  {
    name: 'AnD – Preston',
    file: '/audio/AnD_Preston.mp3',
  },
  {
    name: 'Acid Test Podcast',
    file: '/audio/acid_test_podcast.mp3',
  },
];

export default function TrackSelector() {
  const [selected, setSelected] = useState(tracks[0]);
  const { loadAudio: originalLoadAudio } = useAudioPlayer();
  
  // Wrap loadAudio to match the expected return type
  const loadAudio = async (url: string | File, isBlob?: boolean): Promise<boolean> => {
    try {
      // Convert File to data URL if needed
      if (url instanceof File) {
        const fileUrl = URL.createObjectURL(url);
        await originalLoadAudio(fileUrl, true);
      } else {
        await originalLoadAudio(url, isBlob);
      }
      return true;
    } catch (error) {
      console.error('Error loading audio:', error);
      return false;
    }
  };

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-xl font-bold text-yellow-300">🎛️ Vyber skladbu</h2>
      <div className="flex justify-center gap-4 flex-wrap">
        {tracks.map((track) => (
          <button
            key={track.file}
            onClick={() => setSelected(track)}
            className={`px-4 py-2 rounded border ${
              selected.file === track.file
                ? 'bg-yellow-400 text-black'
                : 'bg-gray-800 text-white hover:bg-yellow-300 hover:text-black'
            }`}
          >
            {track.name}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <Player url={selected.file} loadAudio={loadAudio} />
      </div>
    </div>
  );
}