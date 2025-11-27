import { useEffect, useState } from 'react';
import styled from 'styled-components';

const SelectContainer = styled.div`
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: #e2e8f0;
  margin-bottom: 0.25rem;
`;

const Select = styled.select`
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #4a5568;
  background-color: #2d3748;
  color: #e2e8f0;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover, &:focus {
    border-color: #63b3ed;
    outline: none;
    box-shadow: 0 0 0 1px #63b3ed;
  }
`;

interface AudioDevice {
  deviceId: string;
  kind: string;
  label: string;
  groupId: string;
}

interface AudioOutputSelectorProps {
  onDeviceSelect: (deviceId: string) => void;
  currentDeviceId?: string;
}

export const AudioOutputSelector: React.FC<AudioOutputSelectorProps> = ({
  onDeviceSelect,
  currentDeviceId = 'default',
}) => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get available audio output devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission to access media devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get all audio output devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(
          (device) => device.kind === 'audiooutput' && device.deviceId !== ''
        ) as AudioDevice[];
        
        // Add a default option
        const defaultDevice: AudioDevice = {
          deviceId: 'default',
          kind: 'audiooutput',
          label: 'Default Output',
          groupId: 'default',
        };
        
        setDevices([defaultDevice, ...audioOutputs]);
      } catch (err) {
        console.error('Error getting audio devices:', err);
        setError('Could not access audio devices. Make sure you have granted microphone permissions.');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial load
    getDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      getDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  // Handle device selection
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    onDeviceSelect(deviceId);
  };

  if (isLoading) {
    return <div>Loading audio devices...</div>;
  }

  if (error) {
    return <div style={{ color: '#f56565' }}>{error}</div>;
  }

  return (
    <SelectContainer>
      <Label htmlFor="audio-output">Audio Output:</Label>
      <Select
        id="audio-output"
        value={currentDeviceId}
        onChange={handleDeviceChange}
        disabled={isLoading}
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Device ${device.deviceId}`}
          </option>
        ))}
      </Select>
    </SelectContainer>
  );
};
