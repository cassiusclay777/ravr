import React, { useState, useEffect } from 'react';
import { RELATIVISTIC_PRESETS, RelativisticAudioProcessor } from '../../vr/RelativisticEffects';

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface RelativisticParams {
  velocity: Vector3D;
  acceleration: Vector3D;
  gravitationalField: number;
  spacetimeCurvature: number;
  referenceFrame: 'inertial' | 'accelerating' | 'rotating';
}

interface RelativisticEffectsPanelProps {
  audioContext: AudioContext;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onParamsChange: (params: RelativisticParams) => void;
}

type PresetKey = keyof typeof RELATIVISTIC_PRESETS;

const PRESET_INFO = {
  stationary: {
    name: 'Stationary',
    description: 'Normal audio - no relativistic effects',
    icon: '🛑',
    lorentzFactor: 1.0,
  },
  highSpeed: {
    name: 'High Speed',
    description: 'Traveling at 10% speed of light (30,000 km/s)',
    icon: '🚀',
    lorentzFactor: 1.005,
  },
  nearLightSpeed: {
    name: 'Near Light Speed',
    description: 'Traveling at 90% speed of light - extreme time dilation!',
    icon: '⚡',
    lorentzFactor: 2.29,
  },
  strongGravity: {
    name: 'Black Hole',
    description: 'Near a black hole event horizon - gravitational time dilation',
    icon: '🌀',
    lorentzFactor: 1.05,
  },
  accelerating: {
    name: 'Accelerating',
    description: 'Constant acceleration at 9.81 m/s² (1G)',
    icon: '📈',
    lorentzFactor: 1.0,
  },
};

export function RelativisticEffectsPanel({
  audioContext,
  enabled,
  onToggle,
  onParamsChange,
}: RelativisticEffectsPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('stationary');
  const [velocity, setVelocity] = useState(0); // Percentage of speed of light (0-99)
  const [acceleration, setAcceleration] = useState(0); // m/s²
  const [gravitationalField, setGravitationalField] = useState(0); // 0-1
  const [isJumping, setIsJumping] = useState(false);

  // Calculate relativistic factors
  const speedOfLight = 299792458; // m/s
  const v = velocity / 100; // Normalized velocity
  const lorentzFactor = velocity > 0 ? 1 / Math.sqrt(Math.max(0.0001, 1 - v * v)) : 1.0;
  const timeDilation = lorentzFactor;
  const dopplerFactor = velocity > 0 ? Math.sqrt((1 + v) / (1 - v)) : 1.0;

  // Apply preset
  useEffect(() => {
    const preset = RELATIVISTIC_PRESETS[selectedPreset];
    const params: RelativisticParams = {
      velocity: {
        x: preset.velocity.x,
        y: preset.velocity.y,
        z: preset.velocity.z * (velocity / 100),
      },
      acceleration: {
        x: preset.acceleration.x,
        y: preset.acceleration.y,
        z: acceleration,
      },
      gravitationalField: gravitationalField,
      spacetimeCurvature: gravitationalField * 0.5,
      referenceFrame: preset.referenceFrame,
    };

    onParamsChange(params);
  }, [selectedPreset, velocity, acceleration, gravitationalField, onParamsChange]);

  const handlePresetChange = (preset: PresetKey) => {
    setSelectedPreset(preset);

    // Set appropriate values for preset
    const presetData = RELATIVISTIC_PRESETS[preset];
    if (preset === 'highSpeed') {
      setVelocity(10);
      setAcceleration(0);
      setGravitationalField(0);
    } else if (preset === 'nearLightSpeed') {
      setVelocity(90);
      setAcceleration(0);
      setGravitationalField(0);
    } else if (preset === 'strongGravity') {
      setVelocity(0);
      setAcceleration(0);
      setGravitationalField(0.1);
    } else if (preset === 'accelerating') {
      setVelocity(0);
      setAcceleration(9.81);
      setGravitationalField(0);
    } else {
      setVelocity(0);
      setAcceleration(0);
      setGravitationalField(0);
    }
  };

  const jumpToLightSpeed = () => {
    setIsJumping(true);
    let currentVelocity = velocity;

    const jumpInterval = setInterval(() => {
      currentVelocity += 5;
      if (currentVelocity >= 90) {
        currentVelocity = 90;
        clearInterval(jumpInterval);
        setTimeout(() => setIsJumping(false), 500);
      }
      setVelocity(currentVelocity);
      setSelectedPreset('nearLightSpeed');
    }, 50);
  };

  return (
    <div className="relativistic-effects-panel bg-gray-900 rounded-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            ⚡ Relativistic Audio Effects
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Experience sound at near light speed - Einstein's relativity in audio!
          </p>
        </div>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="mr-2 w-5 h-5"
          />
          <span className="text-sm font-medium">Enable</span>
        </label>
      </div>

      {/* Preset Selector */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Presets</h3>
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(PRESET_INFO) as PresetKey[]).map((preset) => {
            const info = PRESET_INFO[preset];
            return (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPreset === preset
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
                title={info.description}
              >
                <div className="text-3xl mb-2">{info.icon}</div>
                <div className="text-xs font-semibold">{info.name}</div>
                <div className="text-[10px] text-gray-400 mt-1">
                  γ = {info.lorentzFactor.toFixed(2)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      {enabled && (
        <div className="space-y-6">
          {/* Velocity Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Velocity (% of light speed)</label>
              <span className="text-blue-400 font-mono text-sm">
                {velocity}% c = {(velocity * speedOfLight / 100 / 1000).toFixed(0)} km/s
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="99"
              step="1"
              value={velocity}
              onChange={(e) => setVelocity(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${velocity}%, #374151 ${velocity}%, #374151 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Stationary</span>
              <span>Near Light Speed</span>
            </div>
          </div>

          {/* Speedometer Visualization */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-center mb-2">
              <div className="text-4xl font-mono font-bold text-blue-400">
                {velocity}%
              </div>
              <div className="text-xs text-gray-400">of speed of light (c)</div>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  velocity > 70 ? 'bg-red-500' : velocity > 40 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${velocity}%` }}
              />
            </div>
          </div>

          {/* Acceleration Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Acceleration</label>
              <span className="text-blue-400 font-mono text-sm">
                {acceleration.toFixed(2)} m/s² ({(acceleration / 9.81).toFixed(2)}G)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="0.1"
              value={acceleration}
              onChange={(e) => setAcceleration(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Gravitational Field Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Gravitational Field</label>
              <span className="text-blue-400 font-mono text-sm">
                {gravitationalField.toFixed(3)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.001"
              value={gravitationalField}
              onChange={(e) => setGravitationalField(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Earth</span>
              <span>Black Hole</span>
            </div>
          </div>

          {/* Metrics Display */}
          <div className="bg-gray-800 rounded-lg p-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Lorentz Factor (γ)</div>
              <div className="text-xl font-mono font-bold text-blue-400">
                {lorentzFactor.toFixed(3)}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                γ = 1/√(1 - v²/c²)
              </div>
            </div>
            <div className="text-center border-x border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Time Dilation</div>
              <div className="text-xl font-mono font-bold text-purple-400">
                {timeDilation.toFixed(3)}x
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Δt' = γΔt
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Doppler Shift</div>
              <div className="text-xl font-mono font-bold text-green-400">
                {dopplerFactor.toFixed(3)}x
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                f' = f√((1+v)/(1-v))
              </div>
            </div>
          </div>

          {/* Jump to Light Speed Button */}
          <button
            onClick={jumpToLightSpeed}
            disabled={isJumping}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              isJumping
                ? 'bg-blue-600 scale-95'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105'
            }`}
          >
            {isJumping ? '🚀 JUMPING...' : '⚡ JUMP TO LIGHT SPEED'}
          </button>

          {/* Educational Info */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-300 mb-2">
              ℹ️ What You're Hearing:
            </h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>
                <strong>Time Dilation:</strong> At high speeds, time slows down. Audio plays slower and pitch drops.
              </li>
              <li>
                <strong>Doppler Effect:</strong> Moving towards a sound source increases frequency, away decreases it.
              </li>
              <li>
                <strong>Lorentz Factor:</strong> γ > 1 means significant relativistic effects. At 90% c, γ ≈ 2.29!
              </li>
              <li>
                <strong>Black Hole:</strong> Extreme gravity warps spacetime, affecting how sound propagates.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
