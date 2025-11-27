import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import type { IconBaseProps } from 'react-icons';
import { FaBars, FaPause, FaPlay, FaTrash } from 'react-icons/fa';

const CustomIcon: React.FC<IconBaseProps> = (props) => <FaBars {...props} />;

type AudioFile = {
  id: string;
  file: File;
  name: string;
  duration: string;
  url: string;
  isPlaying?: boolean;
};

type PlaylistProps = {
  onTrackSelect: (file: File, url: string) => void;
  currentTrackUrl?: string;
  onPlayPause: (url: string) => void;
  onRemoveTrack: (id: string) => void;
  onReorderTracks: (tracks: AudioFile[]) => void;
};

export default function Playlist({
  onTrackSelect,
  currentTrackUrl,
  onPlayPause,
  onRemoveTrack,
  onReorderTracks,
}: PlaylistProps) {
  const [playlist, setPlaylist] = useState<AudioFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter((file) =>
      ['audio/mp3', 'audio/wav', 'audio/flac', 'audio/mpeg'].includes(file.type),
    );

    const audioFiles = await Promise.all(
      newFiles.map(async (file) => {
        const url = URL.createObjectURL(file);
        const audio = new Audio();

        return new Promise<AudioFile>((resolve) => {
          audio.onloadedmetadata = () => {
            resolve({
              id: URL.createObjectURL(file),
              file,
              name: file.name,
              duration: formatTime(audio.duration),
              url: URL.createObjectURL(file),
            });
          };
          audio.src = url;
        });
      }),
    );

    setPlaylist((prev) => [...prev, ...audioFiles]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFileChange(files);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTrackSelect = (file: AudioFile) => {
    onTrackSelect(file.file, file.url);
  };

  const handlePlayPause = (track: AudioFile) => {
    onPlayPause(track.url);
    setIsPlaying((prev) => ({
      ...prev,
      [track.url]: !prev[track.url],
    }));
  };

  const handleRemoveTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaylist((prev) => prev.filter((track) => track.id !== id));
    onRemoveTrack(id);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(playlist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPlaylist(items);
    onReorderTracks(items);
  };

  // Update isPlaying state when currentTrackUrl changes
  useEffect(() => {
    if (currentTrackUrl) {
      setPlaylist((prev) =>
        prev.map((track) => ({
          ...track,
          isPlaying: track.url === currentTrackUrl,
        })),
      );
    }
  }, [currentTrackUrl]);

  return (
    <div>
      <div
        className={`p-6 border-2 border-dashed rounded-lg transition-colors mb-4 ${
          isDragging ? 'border-gold-500 bg-gray-800' : 'border-gray-700'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-white">Drag and drop audio files</h3>
          <p className="mt-2 text-sm text-gray-400">or</p>
          <div className="mt-4 flex justify-center">
            <label className="cursor-pointer bg-gold-600 hover:bg-gold-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
              Browse files
              <input
                type="file"
                className="hidden"
                accept="audio/*"
                multiple
                onChange={handleFileInput}
                ref={fileInputRef}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-400 mt-2">MP3, WAV, FLAC up to 50MB</p>
        </div>
      </div>

      <div>
        {playlist.length > 0 && (
          <div className="bg-gray-800 p-4">
            <h3 className="text-lg font-medium text-white mb-4">Playlist</h3>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="playlist">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {playlist.map((file, index) => (
                      <Draggable key={file.id} draggableId={file.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                              currentTrackUrl === file.url ? 'bg-gray-700' : 'hover:bg-gray-700'
                            }`}
                            onClick={() => handleTrackSelect(file)}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="text-gray-400 hover:text-white p-2"
                            >
                              <CustomIcon />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayPause(file);
                              }}
                              className="text-gray-400 hover:text-white p-2"
                            >
                              {file.isPlaying ? <FaPause /> : <FaPlay />}
                            </button>
                            <span className="text-white truncate flex-1 ml-2">{file.name}</span>
                            <span className="text-gray-400 text-sm mr-2">{file.duration}</span>
                            <button
                              onClick={(e) => handleRemoveTrack(file.id, e)}
                              className="text-gray-400 hover:text-red-500 p-2"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
      </div>
    </div>
  );
}
