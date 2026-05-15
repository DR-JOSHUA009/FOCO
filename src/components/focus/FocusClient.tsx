"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { Task, UserStats } from "@/types";
import toast from "react-hot-toast";
import { Play, Pause, RotateCcw, Flame, Settings, Lightbulb, Target } from "lucide-react";
import SoundPlayer, { AmbientSound } from "./SoundPlayer";
import ZenMode from "./ZenMode";
import SvgTimer from "./SvgTimer";

interface FocusClientProps {
  pendingTasks: Task[];
  stats: any;
}

const MODES = {
  profundo: { label: "Foco Profundo", defaultMin: 25, xp: 50 },
  descanso: { label: "Descanso Corto", defaultMin: 5, xp: 10 },
  larga: { label: "Pausa Larga", defaultMin: 15, xp: 0 },
};

const TIPS = [
  "Cierra las pestañas del navegador que no necesites.",
  "Bebe agua durante tus descansos.",
  "Respira profundo antes de iniciar un Pomodoro.",
  "Si te distraes, anota el pensamiento y vuelve al foco.",
  "La constancia vence a la intensidad.",
  "Un escritorio limpio es una mente clara.",
  "Estirar el cuerpo renueva la mente.",
  "Enfócate en la tarea, no en el tiempo restante.",
  "Tus logros de hoy son los cimientos del mañana.",
  "Desactiva las notificaciones de tu teléfono."
];

export default function FocusClient({ pendingTasks, stats }: FocusClientProps) {
  const [currentMode, setCurrentMode] = useState<keyof typeof MODES>("profundo");
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [ambient, setAmbient] = useState<AmbientSound>("none");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(0);
  const [randomTip, setRandomTip] = useState(TIPS[0]);

  // Settings
  const [durations, setDurations] = useState({ profundo: 25, descanso: 5, larga: 15 });
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const supabase = createClient();
  const { user, setUserStats, userStats } = useAppStore();

  useEffect(() => {
    setRandomTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    
    // Recuperar de sessionStorage
    const savedState = sessionStorage.getItem("foco_state");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setCurrentMode(parsed.currentMode);
        setAmbient(parsed.ambient);
        setSelectedTaskId(parsed.selectedTaskId);
        setDurations(parsed.durations);
        if (parsed.isPlaying && parsed.endTimeRef) {
          const remaining = Math.round((parsed.endTimeRef - Date.now()) / 1000);
          if (remaining > 0) {
            setTimeRemaining(remaining);
            setIsPlaying(true);
            endTimeRef.current = parsed.endTimeRef;
          } else {
            handleComplete(parsed.currentMode);
          }
        } else {
          setTimeRemaining(parsed.timeRemaining);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("foco_state", JSON.stringify({
      currentMode,
      timeRemaining,
      isPlaying,
      ambient,
      selectedTaskId,
      durations,
      endTimeRef: endTimeRef.current
    }));
  }, [currentMode, timeRemaining, isPlaying, ambient, selectedTaskId, durations]);

  const handleComplete = useCallback(async (mode: keyof typeof MODES) => {
    setIsPlaying(false);
    endTimeRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);

    // Beep final
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      osc.frequency.value = 880;
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}

    const xpGained = MODES[mode].xp;
    const durationMins = durations[mode];

    toast.success(`¡${MODES[mode].label} terminado! ${xpGained ? `+${xpGained} XP` : ''}`);

    if (mode === "profundo") setSessionsCompletedToday(prev => prev + 1);

    if (user) {
      await supabase.from("focus_sessions").insert({
        user_id: user.id,
        duracion_minutos: durationMins,
        tipo: mode === 'profundo' ? 'profundo' : 'descanso',
        task_id: selectedTaskId || null
      });

      if (userStats) {
        setUserStats({
          ...userStats,
          xp_total: userStats.xp_total + xpGained,
          minutos_foco_total: userStats.minutos_foco_total + durationMins
        });
      }
    }

    if (mode === "profundo") {
      const nextMode = (sessionsCompletedToday + 1) % 4 === 0 ? "larga" : "descanso";
      setCurrentMode(nextMode);
      setTimeRemaining(durations[nextMode] * 60);
    } else {
      setCurrentMode("profundo");
      setTimeRemaining(durations["profundo"] * 60);
    }
  }, [durations, sessionsCompletedToday, user, supabase, userStats, setUserStats, selectedTaskId]);

  useEffect(() => {
    if (isPlaying) {
      if (!endTimeRef.current) endTimeRef.current = Date.now() + timeRemaining * 1000;
      
      timerRef.current = setInterval(() => {
        const remaining = Math.round((endTimeRef.current! - Date.now()) / 1000);
        if (remaining <= 0) {
          handleComplete(currentMode);
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      endTimeRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentMode, handleComplete]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const resetTimer = () => {
    setIsPlaying(false);
    endTimeRef.current = null;
    setTimeRemaining(durations[currentMode] * 60);
  };
  
  const switchMode = (mode: keyof typeof MODES) => {
    setIsPlaying(false);
    setCurrentMode(mode);
    setTimeRemaining(durations[mode] * 60);
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSettings(false);
    if (!isPlaying) setTimeRemaining(durations[currentMode] * 60);
  };

  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const timeText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const progress = (timeRemaining / (durations[currentMode] * 60)) * 100;
  const selectedTask = pendingTasks.find(t => t.id === selectedTaskId);

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 animate-fade-in">
      {/* Principal (Timer) */}
      <div className="flex-[2] flex flex-col items-center">
        
        {/* Modos */}
        <div className="flex bg-surface-container rounded-full p-1.5 mb-12 shadow-sm">
          {(Object.keys(MODES) as Array<keyof typeof MODES>).map(mode => (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                currentMode === mode 
                  ? "bg-white text-primary shadow-sm scale-105" 
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {MODES[mode].label}
            </button>
          ))}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 text-on-surface-variant hover:text-primary transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <form onSubmit={saveSettings} className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-md mb-8 flex gap-4 animate-slide-up">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Profundo (m)</label>
              <input type="number" min="1" max="120" value={durations.profundo} onChange={(e) => setDurations({...durations, profundo: parseInt(e.target.value) || 25})} className="w-20 p-2 bg-surface rounded-lg border border-outline-variant/30 text-center"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Descanso (m)</label>
              <input type="number" min="1" max="30" value={durations.descanso} onChange={(e) => setDurations({...durations, descanso: parseInt(e.target.value) || 5})} className="w-20 p-2 bg-surface rounded-lg border border-outline-variant/30 text-center"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Larga (m)</label>
              <input type="number" min="1" max="60" value={durations.larga} onChange={(e) => setDurations({...durations, larga: parseInt(e.target.value) || 15})} className="w-20 p-2 bg-surface rounded-lg border border-outline-variant/30 text-center"/>
            </div>
            <button type="submit" className="self-end bg-primary text-white font-bold px-4 py-2 rounded-lg hover:bg-primary-dark">OK</button>
          </form>
        )}

        {/* Timer SVG */}
        <div className="mb-12 relative group">
          <SvgTimer progress={progress} timeText={timeText} modeName={MODES[currentMode].label} />
        </div>

        {/* Controles */}
        <div className="flex items-center gap-6 mb-12">
          <button 
            onClick={togglePlay}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
              isPlaying ? "bg-surface-tint" : "bg-primary"
            }`}
          >
            {isPlaying ? <Pause size={32} className="fill-white" /> : <Play size={32} className="fill-white ml-2" />}
          </button>
          <button 
            onClick={resetTimer}
            className="w-14 h-14 rounded-full bg-white border border-outline-variant/50 text-on-surface-variant flex items-center justify-center shadow-sm hover:text-primary transition-colors"
            title="Reiniciar timer"
          >
            <RotateCcw size={24} />
          </button>
          <button 
            onClick={() => setZenMode(true)}
            className="w-14 h-14 rounded-full bg-white border border-outline-variant/50 text-warning flex items-center justify-center shadow-sm hover:bg-warning/10 transition-colors"
            title="Zen Mode (Pantalla Completa)"
          >
            <Flame size={24} />
          </button>
        </div>

        {/* Sonido */}
        <div className="w-full max-w-md">
          <SoundPlayer isPlaying={isPlaying} currentAmbient={ambient} onAmbientChange={setAmbient} />
        </div>
      </div>

      {/* Sidebar Lateral */}
      <div className="flex-1 space-y-6">
        {/* Selector de Tarea */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
          <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
            <Target size={18} className="text-primary"/> Enfoque de hoy
          </h3>
          <select 
            className="w-full h-11 px-4 bg-surface-container-lowest border border-outline-variant/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
          >
            <option value="">Ninguna tarea específica</option>
            {pendingTasks.map(t => (
              <option key={t.id} value={t.id}>{t.titulo} ({t.materia})</option>
            ))}
          </select>
          {selectedTask && (
            <div className="mt-3 p-3 bg-primary-container/20 border border-primary-container/50 rounded-lg text-sm text-on-surface-variant">
              Recompensa adicional al completarla: <strong className="text-primary">+{selectedTask.xp_reward} XP</strong>
            </div>
          )}
        </div>

        {/* Stats del día */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
            <span className="text-on-surface-variant text-sm font-bold">Sesiones Completadas Hoy</span>
            <span className="text-2xl font-bold text-on-surface">{sessionsCompletedToday} <span className="text-sm text-outline">/ 4</span></span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
            <span className="text-on-surface-variant text-sm font-bold">Tiempo de Foco Total</span>
            <span className="text-xl font-bold text-primary">{Math.floor((stats?.minutos_foco_total || 0)/60)}h {(stats?.minutos_foco_total || 0)%60}m</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant text-sm font-bold">Para tu meta</span>
            <span className="text-sm font-bold text-warning">{pendingTasks.length} pendientes</span>
          </div>
        </div>

        {/* Tip del día */}
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30">
          <h3 className="font-bold text-on-surface mb-2 flex items-center gap-2">
            <Lightbulb size={18} className="text-amber-500" /> Tip de Productividad
          </h3>
          <p className="text-sm text-on-surface-variant italic leading-relaxed">&quot;{randomTip}&quot;</p>
        </div>
      </div>

      {zenMode && (
        <ZenMode 
          timeText={timeText}
          progress={progress}
          modeName={MODES[currentMode].label}
          taskName={selectedTask?.titulo || null}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onExit={() => setZenMode(false)}
        />
      )}
    </div>
  );
}
