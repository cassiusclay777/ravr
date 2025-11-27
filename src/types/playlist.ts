export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  url: string;
  coverArt?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  coverArt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaylistState extends Playlist {
  currentSongIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}
