import { Lock, Sparkles, Users, Globe, Trophy } from "lucide-react";

export default function ComunidadPage() {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center bg-surface text-neutral font-inter relative overflow-hidden">
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px] mix-blend-multiply animate-pulse" />
        <div className="absolute inset-20 bg-secondary/20 rounded-full blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-2xl text-center px-6">
        
        {/* Floating Lock Icon Container */}
        <div className="relative mb-8 group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary to-secondary blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700 rounded-full" />
          
          <div className="relative w-32 h-32 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center shadow-2xl transition-transform duration-500 hover:scale-105 hover:-translate-y-2">
            <Lock size={48} className="text-primary mb-1 drop-shadow-md" />
            <div className="absolute top-2 right-2">
              <Sparkles size={16} className="text-secondary animate-bounce" />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-5xl font-black mb-4 tracking-tight bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] animate-gradient-x text-transparent bg-clip-text">
          Comunidad FOCOI
        </h1>
        
        <p className="text-xl text-on-surface-variant/80 mb-10 max-w-lg leading-relaxed font-medium">
          Estamos construyendo un espacio de estudio inmersivo. Muy pronto podrás unirte a salas de co-working, compartir recursos y conectar con mentes enfocadas.
        </p>

        {/* Sneak Peek Features */}
        <div className="flex gap-4 sm:gap-6 flex-wrap justify-center">
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-surface-container border border-outline-variant/30 text-sm font-semibold text-on-surface shadow-sm">
            <Users size={18} className="text-primary" /> Salas de Estudio
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-surface-container border border-outline-variant/30 text-sm font-semibold text-on-surface shadow-sm">
            <Globe size={18} className="text-secondary" /> Retos Globales
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-surface-container border border-outline-variant/30 text-sm font-semibold text-on-surface shadow-sm">
            <Trophy size={18} className="text-warning" /> Rankings de XP
          </div>
        </div>

      </div>
    </div>
  );
}
