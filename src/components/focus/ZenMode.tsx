"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Minimize2 } from "lucide-react";
import SvgTimer from "./SvgTimer";

interface ZenModeProps {
  timeText: string;
  progress: number;
  modeName: string;
  taskName: string | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExit: () => void;
}

export default function ZenMode({
  timeText,
  progress,
  modeName,
  taskName,
  isPlaying,
  onTogglePlay,
  onExit
}: ZenModeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === " ") {
        e.preventDefault();
        onTogglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onExit, onTogglePlay]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f0f1a] text-white overflow-hidden animate-fade-in">
      {/* CSS Particles */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-50 animate-pulse-soft"
            style={{
              width: Math.random() * 4 + 1 + "px",
              height: Math.random() * 4 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              animationDuration: Math.random() * 3 + 2 + "s",
              animationDelay: Math.random() * 2 + "s",
            }}
          ></div>
        ))}
      </div>

      <button
        onClick={onExit}
        className="absolute top-8 right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm z-10"
        title="Salir (Esc)"
      >
        <Minimize2 size={24} />
      </button>

      <div className="relative z-10 flex flex-col items-center">
        {taskName && (
          <div className="mb-8 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm font-medium tracking-wide">
            Enfocado en: <span className="font-bold text-primary-fixed-dim">{taskName}</span>
          </div>
        )}
        
        <div className="scale-125 cursor-pointer" onClick={onTogglePlay}>
          <SvgTimer 
            progress={progress} 
            timeText={timeText} 
            modeName={modeName} 
            size={400} 
            zenMode={true} 
          />
        </div>

        <p className="mt-12 text-white/40 text-sm tracking-widest uppercase">
          {isPlaying ? "Espacio para pausar" : "Espacio para reanudar"}
        </p>
      </div>
    </div>,
    document.body
  );
}
