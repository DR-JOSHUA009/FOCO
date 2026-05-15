"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, CloudRain, Coffee, Trees, Music, VolumeX } from "lucide-react";

export type AmbientSound = "none" | "lluvia" | "cafeteria" | "bosque" | "lofi";

interface SoundPlayerProps {
  isPlaying: boolean;
  currentAmbient: AmbientSound;
  onAmbientChange: (ambient: AmbientSound) => void;
}

export default function SoundPlayer({ isPlaying, currentAmbient, onAmbientChange }: SoundPlayerProps) {
  const [volume, setVolume] = useState(0.5);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Detener todos los sonidos y limpiar timers
  const stopSound = () => {
    nodesRef.current.forEach(node => {
      try {
        if ('stop' in node) (node as any).stop();
        node.disconnect();
      } catch (e) {}
    });
    nodesRef.current = [];
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  const createNoise = (ctx: AudioContext, type: 'white' | 'brown') => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
      } else {
        output[i] = white;
      }
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    return noise;
  };

  const playSound = (ambient: AmbientSound, ctx: AudioContext, gainNode: GainNode) => {
    stopSound();
    if (ambient === "none") return;

    if (ambient === "lluvia") {
      const noise = createNoise(ctx, 'white');
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800; // Sonido ahogado, tipo lluvia
      
      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      nodesRef.current.push(noise, filter);

      // Variación aleatoria para simular viento/ráfagas
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 400;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      nodesRef.current.push(lfo, lfoGain);
    } 
    else if (ambient === "cafeteria") {
      const noise = createNoise(ctx, 'brown');
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      
      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      nodesRef.current.push(noise, filter);
    }
    else if (ambient === "bosque") {
      // Osciladores de baja frecuencia
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 120;
      
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 200;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1; // Muy lento
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 50;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      osc.connect(filter);
      filter.connect(gainNode);
      osc.start();
      nodesRef.current.push(osc, filter, lfo, lfoGain);
    }
    else if (ambient === "lofi") {
      // Tonos procedimentales simples tipo piano sintetizado + delay/reverb casero
      const playNote = () => {
        if (!isPlaying || currentAmbient !== "lofi") return;
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        // Frecuencia aleatoria entre una escala (A3 a A4 aprox)
        const freqs = [220, 246.94, 277.18, 293.66, 329.63, 369.99, 415.30, 440];
        osc.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
        
        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0, ctx.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        
        osc.connect(noteGain);
        noteGain.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
        
        nodesRef.current.push(osc, noteGain);
        
        const tId = setTimeout(playNote, 1000 + Math.random() * 2000);
        timeoutRefs.current.push(tId);
      };
      playNote();
    }
  };

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass();
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.connect(audioCtxRef.current.destination);
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }

    if (isPlaying && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    if (isPlaying) {
      playSound(currentAmbient, audioCtxRef.current, gainNodeRef.current!);
    } else {
      stopSound();
    }

    return () => stopSound();
  }, [isPlaying, currentAmbient]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  const options = [
    { id: "none", icon: VolumeX, label: "Silencio" },
    { id: "lluvia", icon: CloudRain, label: "Lluvia" },
    { id: "cafeteria", icon: Coffee, label: "Cafetería" },
    { id: "bosque", icon: Trees, label: "Bosque" },
    { id: "lofi", icon: Music, label: "Lo-Fi" },
  ] as const;

  return (
    <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
      <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
        <Volume2 size={18} className="text-primary" /> Ambiente Sonoro
      </h3>
      
      <div className="grid grid-cols-5 gap-2 mb-4">
        {options.map(opt => {
          const Icon = opt.icon;
          const isActive = currentAmbient === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => {
                if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
                onAmbientChange(opt.id);
              }}
              className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all ${
                isActive 
                  ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" 
                  : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
              }`}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-[10px] uppercase font-bold tracking-wider">{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <VolumeX size={16} className="text-outline-variant" />
        <input 
          type="range" 
          min="0" max="1" step="0.01" 
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full accent-primary h-2 bg-surface-container rounded-lg appearance-none cursor-pointer"
        />
        <Volume2 size={16} className="text-outline-variant" />
      </div>
    </div>
  );
}
