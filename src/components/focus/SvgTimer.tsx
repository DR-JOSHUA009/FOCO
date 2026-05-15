"use client";

interface SvgTimerProps {
  progress: number;
  timeText: string;
  modeName: string;
  size?: number;
  zenMode?: boolean;
}

export default function SvgTimer({ progress, timeText, modeName, size = 280, zenMode = false }: SvgTimerProps) {
  const strokeWidth = zenMode ? 8 : 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // progress goes from 100 (full) to 0 (empty)
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform drop-shadow-sm">
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke="currentColor" strokeWidth={strokeWidth}
          className={`${zenMode ? 'text-white/10' : 'text-outline-variant/20'} fill-transparent`}
        />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke="currentColor" strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${zenMode ? 'text-primary-fixed-dim' : 'text-primary'} fill-transparent transition-all duration-1000 ease-linear`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-mono font-bold tracking-tighter ${zenMode ? 'text-7xl text-white' : 'text-6xl text-on-surface'}`}>
          {timeText}
        </span>
        <span className={`text-sm font-bold uppercase tracking-widest mt-2 ${zenMode ? 'text-primary-fixed-dim' : 'text-primary'}`}>
          {modeName}
        </span>
      </div>
    </div>
  );
}
