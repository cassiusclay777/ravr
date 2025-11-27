import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BsSliders } from 'react-icons/bs';
import { HiSparkles } from 'react-icons/hi';
import { FiZap, FiActivity, FiTarget } from 'react-icons/fi';
import Slider from 'rc-slider';
import { useAudioEngine } from '@/hooks/useAudioEngine';

interface DSPEffect {
  id: string;
  name: string;
  enabled: boolean;
  params: Record<string, number>;
  icon: React.ReactNode;
  color: string;
}

interface EffectParametersProps {
  effect: DSPEffect;
  onParamUpdate: (effectId: string, param: string, value: number) => void;
  getParameterUnit: (param: string) => string;
  getParameterRange: (param: string) => { min: number; max: number; step: number };
  getSliderTrackColor: (color: string) => string;
  formatParameterValue: (value: number) => string | number;
}

const EffectParameters: React.FC<EffectParametersProps> = ({
  effect,
  onParamUpdate,
  getParameterUnit,
  getParameterRange,
  getSliderTrackColor,
  formatParameterValue
}) => {
  return (
    <div className="space-y-4">
      {Object.entries(effect.params).map(([param, value]) => {
        const range = getParameterRange(param);
        const unit = getParameterUnit(param);
        const trackColor = getSliderTrackColor(effect.color);

        return (
          <div key={param} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70 capitalize">{param}</span>
              <span className="text-white/90 font-mono">
                {formatParameterValue(value)}{unit}
              </span>
            </div>
            <Slider
              min={range.min}
              max={range.max}
              step={range.step}
              value={value}
              onChange={(newValue) => onParamUpdate(effect.id, param, Array.isArray(newValue) ? newValue[0] : newValue)}
              disabled={!effect.enabled}
              styles={{
                track: {
                  height: 4,
                  backgroundColor: effect.enabled ? `rgb(${trackColor})` : '#6b7280',
                  borderRadius: 2
                },
                handle: {
                  borderColor: effect.enabled ? `rgb(${trackColor})` : '#6b7280',
                  backgroundColor: '#ffffff',
                  opacity: effect.enabled ? 1 : 0.5,
                  height: 16,
                  width: 16,
                  marginTop: -6,
                },
                rail: {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  height: 4,
                  borderRadius: 2
                },
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export const ProfessionalDSP: React.FC = () => {
  const { ctx, outputNode } = useAudioEngine();

  // Audio nodes
  const nodesRef = useRef<{
    reverb?: ConvolverNode;
    reverbWet?: GainNode;
    reverbDry?: GainNode;
    delay?: DelayNode;
    delayFeedback?: GainNode;
    delayWet?: GainNode;
    exciter?: WaveShaperNode;
    exciterDrive?: GainNode;
    exciterWet?: GainNode;
    enhancer?: BiquadFilterNode;
    enhancerGain?: GainNode;
    inputSplitter?: GainNode;
    outputMixer?: GainNode;
  }>({});

  const [effects, setEffects] = useState<DSPEffect[]>([
    {
      id: 'reverb',
      name: 'Hall Reverb',
      enabled: false,
      params: { roomSize: 0.5, decay: 0.3, wet: 0.2 },
      icon: <FiActivity />,
      color: 'cyan'
    },
    {
      id: 'delay',
      name: 'Stereo Delay',
      enabled: false,
      params: { time: 250, feedback: 0.3, wet: 0.15 },
      icon: <FiActivity />,
      color: 'blue'
    },
    {
      id: 'exciter',
      name: 'Harmonic Exciter',
      enabled: false,
      params: { drive: 0.4, harmonics: 0.3, output: 0.8 },
      icon: <FiZap />,
      color: 'purple'
    },
    {
      id: 'enhancer',
      name: 'Bass Enhancer',
      enabled: false,
      params: { frequency: 80, boost: 3, q: 0.7 },
      icon: <FiTarget />,
      color: 'green'
    }
  ]);

  // Initialize audio nodes
  useEffect(() => {
    if (!ctx || !outputNode) return;

    // Create input splitter and output mixer
    nodesRef.current.inputSplitter = ctx.createGain();
    nodesRef.current.outputMixer = ctx.createGain();

    // Connect to audio engine
    if (outputNode && nodesRef.current.inputSplitter && nodesRef.current.outputMixer) {
      try {
        // Insert our DSP chain between the existing audio engine
        outputNode.disconnect();
        outputNode.connect(nodesRef.current.inputSplitter);
        nodesRef.current.outputMixer.connect(ctx.destination);
      } catch (e) {
        console.warn('Could not insert DSP chain, using parallel routing:', e);
      }
    }

    // Initialize Reverb
    const reverb = ctx.createConvolver();
    const reverbWet = ctx.createGain();
    const reverbDry = ctx.createGain();
    reverbWet.gain.value = 0;
    reverbDry.gain.value = 1;

    // Create impulse response for reverb
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2; // 2 seconds
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.5));
      }
    }
    reverb.buffer = impulse;

    nodesRef.current.reverb = reverb;
    nodesRef.current.reverbWet = reverbWet;
    nodesRef.current.reverbDry = reverbDry;

    // Initialize Delay
    const delay = ctx.createDelay(5.0);
    const delayFeedback = ctx.createGain();
    const delayWet = ctx.createGain();
    delay.delayTime.value = 0.25;
    delayFeedback.gain.value = 0.3;
    delayWet.gain.value = 0;

    nodesRef.current.delay = delay;
    nodesRef.current.delayFeedback = delayFeedback;
    nodesRef.current.delayWet = delayWet;

    // Connect delay feedback loop
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);

    // Initialize Exciter (waveshaper for harmonic distortion)
    const exciter = ctx.createWaveShaper();
    const exciterDrive = ctx.createGain();
    const exciterWet = ctx.createGain();
    exciterDrive.gain.value = 1;
    exciterWet.gain.value = 0;

    // Create waveshaper curve for harmonic excitement
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i - 128) / 128;
      curve[i] = Math.tanh(x * 2) * 0.7;
    }
    exciter.curve = curve;

    nodesRef.current.exciter = exciter;
    nodesRef.current.exciterDrive = exciterDrive;
    nodesRef.current.exciterWet = exciterWet;

    // Initialize Bass Enhancer (low shelf filter)
    const enhancer = ctx.createBiquadFilter();
    const enhancerGain = ctx.createGain();
    enhancer.type = 'lowshelf';
    enhancer.frequency.value = 80;
    enhancer.gain.value = 0;
    enhancerGain.gain.value = 0;

    nodesRef.current.enhancer = enhancer;
    nodesRef.current.enhancerGain = enhancerGain;

    // Cleanup
    return () => {
      Object.values(nodesRef.current).forEach(node => {
        try {
          node?.disconnect();
        } catch (e) {
          // Ignore disconnection errors
        }
      });
    };
  }, [ctx, outputNode]);

  // Route audio through effects based on their enabled state
  const updateRouting = useCallback(() => {
    if (!ctx || !nodesRef.current.inputSplitter || !nodesRef.current.outputMixer) return;

    const { inputSplitter, outputMixer, reverb, reverbWet, reverbDry, delay, delayWet,
            exciter, exciterDrive, exciterWet, enhancer, enhancerGain } = nodesRef.current;

    try {
      // Disconnect everything
      inputSplitter.disconnect();
      outputMixer.disconnect();

      // Create chain based on enabled effects
      let currentNode: AudioNode = inputSplitter;

      // Reverb routing (parallel wet/dry)
      if (effects.find(e => e.id === 'reverb')?.enabled && reverb && reverbWet && reverbDry) {
        const reverbMixer = ctx.createGain();
        currentNode.connect(reverbDry);
        reverbDry.connect(reverbMixer);
        currentNode.connect(reverb);
        reverb.connect(reverbWet);
        reverbWet.connect(reverbMixer);
        currentNode = reverbMixer;
      }

      // Delay routing (parallel)
      if (effects.find(e => e.id === 'delay')?.enabled && delay && delayWet) {
        const delayMixer = ctx.createGain();
        const delayDry = ctx.createGain();
        delayDry.gain.value = 1;
        currentNode.connect(delayDry);
        delayDry.connect(delayMixer);
        currentNode.connect(delay);
        delay.connect(delayWet);
        delayWet.connect(delayMixer);
        currentNode = delayMixer;
      }

      // Exciter routing (parallel)
      if (effects.find(e => e.id === 'exciter')?.enabled && exciter && exciterDrive && exciterWet) {
        const exciterMixer = ctx.createGain();
        const exciterDry = ctx.createGain();
        exciterDry.gain.value = 1;
        currentNode.connect(exciterDry);
        exciterDry.connect(exciterMixer);
        currentNode.connect(exciterDrive);
        exciterDrive.connect(exciter);
        exciter.connect(exciterWet);
        exciterWet.connect(exciterMixer);
        currentNode = exciterMixer;
      }

      // Bass Enhancer routing (series)
      if (effects.find(e => e.id === 'enhancer')?.enabled && enhancer && enhancerGain) {
        currentNode.connect(enhancer);
        enhancer.connect(enhancerGain);
        currentNode = enhancerGain;
      }

      // Connect to output
      currentNode.connect(outputMixer);
      outputMixer.connect(ctx.destination);

    } catch (e) {
      console.warn('Error updating DSP routing:', e);
    }
  }, [ctx, effects]);

  // Update routing when effects change
  useEffect(() => {
    updateRouting();
  }, [effects.map(e => e.enabled).join(',')]); // Only when enabled states change

  const toggleEffect = (id: string) => {
    setEffects(prev => prev.map(effect =>
      effect.id === id ? { ...effect, enabled: !effect.enabled } : effect
    ));
  };

  const updateParam = useCallback((effectId: string, param: string, value: number) => {
    setEffects(prev => prev.map(effect =>
      effect.id === effectId
        ? { ...effect, params: { ...effect.params, [param]: value } }
        : effect
    ));

    // Apply parameter changes to audio nodes in real-time
    if (!ctx || !nodesRef.current) return;

    const effect = effects.find(e => e.id === effectId);
    if (!effect?.enabled) return;

    switch (effectId) {
      case 'reverb':
        if (param === 'wet' && nodesRef.current.reverbWet) {
          nodesRef.current.reverbWet.gain.setTargetAtTime(value, ctx.currentTime, 0.01);
          nodesRef.current.reverbDry!.gain.setTargetAtTime(1 - value, ctx.currentTime, 0.01);
        }
        // Note: roomSize and decay would require regenerating the impulse response
        break;

      case 'delay':
        if (param === 'time' && nodesRef.current.delay) {
          nodesRef.current.delay.delayTime.setTargetAtTime(value / 1000, ctx.currentTime, 0.01);
        } else if (param === 'feedback' && nodesRef.current.delayFeedback) {
          nodesRef.current.delayFeedback.gain.setTargetAtTime(value, ctx.currentTime, 0.01);
        } else if (param === 'wet' && nodesRef.current.delayWet) {
          nodesRef.current.delayWet.gain.setTargetAtTime(value, ctx.currentTime, 0.01);
        }
        break;

      case 'exciter':
        if (param === 'drive' && nodesRef.current.exciterDrive) {
          nodesRef.current.exciterDrive.gain.setTargetAtTime(1 + value * 3, ctx.currentTime, 0.01);
        } else if (param === 'output' && nodesRef.current.exciterWet) {
          nodesRef.current.exciterWet.gain.setTargetAtTime(value, ctx.currentTime, 0.01);
        }
        break;

      case 'enhancer':
        if (param === 'frequency' && nodesRef.current.enhancer) {
          nodesRef.current.enhancer.frequency.setTargetAtTime(value, ctx.currentTime, 0.01);
        } else if (param === 'boost' && nodesRef.current.enhancer) {
          nodesRef.current.enhancer.gain.setTargetAtTime(value, ctx.currentTime, 0.01);
        } else if (param === 'q' && nodesRef.current.enhancer) {
          nodesRef.current.enhancer.Q.setTargetAtTime(value, ctx.currentTime, 0.01);
        }
        if (nodesRef.current.enhancerGain) {
          nodesRef.current.enhancerGain.gain.setTargetAtTime(1, ctx.currentTime, 0.01);
        }
        break;
    }
  }, [ctx, effects]);

  const getColorClasses = (color: string, enabled: boolean) => {
    const disabledClass = 'from-gray-500/10 to-gray-600/5 border-gray-500/20 text-gray-400';

    if (!enabled) return disabledClass;

    const enabledColorMap = {
      cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
      blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
      purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
      green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
    };

    return enabledColorMap[color as keyof typeof enabledColorMap] || enabledColorMap.cyan;
  };

  const getParameterUnit = (param: string) => {
    if (param === 'time') return 'ms';
    if (param.includes('frequency')) return 'Hz';
    if (param === 'boost') return 'dB';
    return '';
  };

  const getParameterRange = (param: string) => {
    if (param === 'time') return { min: 50, max: 1000, step: 10 };
    if (param === 'frequency') return { min: 20, max: 200, step: 5 };
    if (param === 'boost') return { min: 0, max: 12, step: 0.5 };
    if (param === 'q') return { min: 0.1, max: 10, step: 0.1 };
    return { min: 0, max: 1, step: 0.01 };
  };

  const getSliderTrackColor = (color: string) => {
    const colorMap = {
      cyan: '34 197 94',
      blue: '59 130 246',
      purple: '147 51 234',
      green: '34 197 94'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.cyan;
  };

  const formatParameterValue = (value: number) => {
    return typeof value === 'number' && value < 1 ? value.toFixed(2) : value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BsSliders className="text-cyan-400 text-xl" />
        <h2 className="text-2xl font-bold text-white/90">Professional DSP Suite</h2>
        <HiSparkles className="text-yellow-400 text-lg" />
      </div>

      {!ctx && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
          ⚠️ Audio engine not initialized. Play some audio first!
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {effects.map((effect) => (
          <div
            key={effect.id}
            className={`rounded-2xl bg-gradient-to-br border backdrop-blur-sm p-6 transition-all duration-300 ${getColorClasses(effect.color, effect.enabled)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-black/20 ${effect.enabled ? 'text-current' : 'text-gray-400'}`}>
                  {effect.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white/90">{effect.name}</h3>
                  <p className="text-xs text-white/50">
                    {effect.enabled ? 'Active' : 'Bypassed'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleEffect(effect.id)}
                className={`w-12 h-6 rounded-full transition-all duration-300 relative ${
                  effect.enabled
                    ? `bg-${effect.color}-500`
                    : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                    effect.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <EffectParameters
              effect={effect}
              onParamUpdate={updateParam}
              getParameterUnit={getParameterUnit}
              getParameterRange={getParameterRange}
              getSliderTrackColor={getSliderTrackColor}
              formatParameterValue={formatParameterValue}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
