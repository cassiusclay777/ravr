import React, { useState, useEffect } from 'react';

interface OutputDevice {
  deviceId: string;
  label: string;
  kind: 'audiooutput' | 'audioinput' | 'videoinput';
}

interface OutputDeviceSelectorProps {
  onDeviceChange: (deviceId: string) => void;
  className?: string;
}

export const OutputDeviceSelector: React.FC<OutputDeviceSelectorProps> = ({ 
  onDeviceChange, 
  className = '' 
}) => {
  const [devices, setDevices] = useState<OutputDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = deviceList.filter(d => d.kind === 'audiooutput');
        setDevices(audioOutputs as OutputDevice[]);
        
        // Watch for device changes
        navigator.mediaDevices.addEventListener('devicechange', loadDevices);
      } catch (err) {
        console.warn('Failed to enumerate devices:', err);
      }
    };
    
    loadDevices();
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedDevice(deviceId);
    onDeviceChange(deviceId);
  };

  if (!hasPermission) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Audio permissions required for device selection
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-200">Output:</label>
      <select
        value={selectedDevice}
        onChange={handleChange}
        className="bg-gray-800 text-gray-200 px-3 py-1 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none text-sm"
      >
        <option value="default">System Default</option>
        {devices.map(device => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Device ${device.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
    </div>
  );
};
