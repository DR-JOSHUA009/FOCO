"use client";

import { useState } from "react";
import { Users, UserPlus, Flame, Medal, Plus, ArrowRight, MousePointer2, Trophy, Crown, Target } from "lucide-react";

/**
 * SocialClient — Comunidad (Sala de Estudio & Amigos)
 * 
 * DESIGN: Academic Clarity (Strictly using primary #CBB4ED, secondary #A8D1F6, tertiary #C8C074).
 * LAYOUT: Bottom tab navigation, Amigos list first, Grupos below.
 */
export default function SocialClient({ currentUserId }: { currentUserId: string }) {
  const [activeTab, setActiveTab] = useState<"sala" | "amigos">("sala");

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden -m-8 relative bg-background">
      
      {/* ── Main Content Area (With bottom padding for fixed tab) ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 transition-screen">
        <div className="max-w-4xl mx-auto w-full">
          
          {/* =========================================
              VIEW: SALA DE ESTUDIO
              ========================================= */}
          {activeTab === "sala" && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral">Sala de Estudio</h1>
                <p className="text-on-surface-variant text-sm mt-1">Colabora en tiempo real con tus compañeros.</p>
              </div>

              {/* Lobby Card */}
              <div className="card-ac !bg-surface-container-low border border-primary/20 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      <h2 className="text-xl font-bold text-neutral">Mesa "Física Cuántica"</h2>
                    </div>
                    <p className="text-sm text-on-surface-variant mb-4">4 personas estudiando ahora mismo. ¡Únete a la sesión grupal!</p>
                    
                    {/* Avatars with active colored borders */}
                    <div className="flex items-center -space-x-3 mb-6 md:mb-0">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`w-12 h-12 rounded-full border-2 bg-surface-container-highest flex items-center justify-center shadow-sm relative z-${10-i} ${
                          i === 1 ? 'border-primary' : i === 2 ? 'border-secondary' : 'border-tertiary'
                        }`}>
                          <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i+10}&backgroundColor=transparent`} alt={`User ${i}`} className="w-full h-full object-cover rounded-full" />
                        </div>
                      ))}
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-outline-variant bg-surface flex items-center justify-center z-0 text-outline-variant cursor-pointer hover:border-primary hover:text-primary transition-colors touch-target" title="Invitar amigo">
                        <Plus size={20} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Secondary - Crear Sala */}
                    <button className="btn-outlined w-full sm:w-auto flex items-center justify-center gap-2">
                      <Plus size={18} /> Crear sala
                    </button>
                    {/* Primary - Unirse */}
                    <button className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
                      <ArrowRight size={18} /> Unirse
                    </button>
                  </div>
                </div>
              </div>

              {/* Shared Canvas Preview */}
              <div className="card-ac !p-0 overflow-hidden border border-outline-variant/20 relative group">
                {/* XP Progress Bar Overlay */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface-container-lowest/90 backdrop-blur-md px-4 py-2 rounded-full shadow-card z-20 flex items-center gap-3 border border-outline-variant/20">
                  <span className="text-sm font-bold text-neutral">+120 XP</span>
                  <div className="w-32 h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary rounded-full w-[70%] animate-pulse-soft"></div>
                  </div>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">esta sesión</span>
                </div>

                {/* Canvas Mockup Image/Grid */}
                <div className="h-[400px] w-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-surface flex items-center justify-center relative">
                  
                  {/* Mock drawn elements */}
                  <div className="absolute top-1/4 left-1/4 w-32 h-24 border-2 border-primary rounded-lg bg-primary/5 flex items-center justify-center shadow-sm">
                    <span className="text-primary font-bold">Concepto A</span>
                  </div>
                  <div className="absolute top-[40%] right-1/4 w-32 h-24 border-2 border-secondary rounded-lg bg-secondary/5 flex items-center justify-center shadow-sm">
                    <span className="text-secondary-dark font-bold">Concepto B</span>
                  </div>
                  {/* SVG Line connecting them */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <path d="M 300 200 Q 400 100 550 250" fill="none" stroke="#CBB4ED" strokeWidth="3" strokeDasharray="5,5" />
                  </svg>

                  {/* Multi-cursors */}
                  <div className="absolute top-[30%] left-[30%] flex flex-col items-center animate-bounce" style={{ animationDuration: '3s' }}>
                    <MousePointer2 className="text-primary fill-primary rotate-[-20deg]" size={24} />
                    <span className="bg-primary text-neutral text-[10px] font-bold px-2 py-0.5 rounded shadow-sm mt-1">AnaM</span>
                  </div>
                  <div className="absolute top-[45%] right-[20%] flex flex-col items-center animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                    <MousePointer2 className="text-secondary-dark fill-secondary-dark rotate-[10deg]" size={24} />
                    <span className="bg-secondary-dark text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm mt-1">CarlosJ</span>
                  </div>
                </div>

                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-30 flex items-center justify-center">
                  <button className="btn-primary !bg-neutral !text-white flex items-center gap-2">
                    <Users size={18} /> Entrar al lienzo
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* =========================================
              VIEW: AMIGOS & GRUPOS
              ========================================= */}
          {activeTab === "amigos" && (
            <div className="space-y-10 animate-fade-in">
              
              {/* Header */}
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-neutral">Comunidad</h1>
                <p className="text-on-surface-variant text-sm mt-1">Tus amigos y grupos de estudio.</p>
              </div>

              {/* Lista de Amigos (Primero, como se solicitó) */}
              <div>
                <h3 className="font-bold text-neutral text-lg mb-4 flex items-center gap-2">
                  <UserPlus className="text-primary" size={22} /> Mis Amigos
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "Lucía M.", streak: 12, level: "Plata", seed: 40, badge: "Rey de Mayo" },
                    { name: "Andrés K.", streak: 4, level: "Bronce", seed: 41 },
                    { name: "Sofía R.", streak: 28, level: "Oro", seed: 42, badge: "Más constante" },
                    { name: "Mateo T.", streak: 0, level: "Bronce", seed: 43 },
                  ].map((friend, i) => (
                    <div key={i} className="card-ac !p-4 flex items-center justify-between hover:shadow-soft transition-shadow cursor-pointer touch-target group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-surface-container-highest bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                          <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${friend.seed}&backgroundColor=transparent`} alt={friend.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral text-sm flex items-center gap-2">
                            {friend.name}
                            {/* Winning badge chip */}
                            {friend.badge && (
                              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm ${
                                friend.badge.includes('Rey') ? 'bg-tertiary/20 text-tertiary-dark' : 'bg-primary/20 text-primary-dark'
                              }`}>
                                {friend.badge}
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs font-bold text-on-surface-variant">
                              <Crown size={12} className={friend.level === 'Oro' ? 'text-tertiary' : friend.level === 'Plata' ? 'text-outline' : 'text-outline-variant'} />
                              {friend.level}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold text-tertiary-dark">
                              <Flame size={12} className="fill-tertiary" />
                              {friend.streak}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline-variant group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grupos de Competencia (Debajo de amigos) */}
              <div>
                <h3 className="font-bold text-neutral text-lg mb-4 flex items-center gap-2">
                  <Trophy className="text-tertiary" size={22} /> Grupos de Competencia
                </h3>
                
                <div className="flex gap-4 overflow-x-auto pb-6 snap-x -mx-4 px-4 md:mx-0 md:px-0">
                  {/* Group Card 1 */}
                  <div className="card-ac shrink-0 w-[300px] snap-start border border-outline-variant/20 hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-neutral text-base">Escuadrón Ing.</h4>
                        <p className="text-xs text-on-surface-variant font-medium">Torneo Mensual</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary-dark font-bold text-sm">
                        #1
                      </div>
                    </div>
                    
                    <div className="flex -space-x-2 mb-5">
                      {[1,2,3].map(i => (
                        <img key={i} src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i+20}&backgroundColor=transparent`} alt={`User`} className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-highest" />
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-on-surface-variant flex items-center gap-1"><Target size={14}/> Desafío Semanal</span>
                        <span className="text-tertiary-dark">8/10</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary rounded-full w-[80%]"></div>
                      </div>
                    </div>
                  </div>

                  {/* Group Card 2 */}
                  <div className="card-ac shrink-0 w-[300px] snap-start border border-outline-variant/20">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-neutral text-base">Club de Estudio</h4>
                        <p className="text-xs text-on-surface-variant font-medium">Torneo Mensual</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-bold text-sm">
                        #3
                      </div>
                    </div>
                    
                    <div className="flex -space-x-2 mb-5">
                      {[1,2,3,4].map(i => (
                        <img key={i} src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i+30}&backgroundColor=transparent`} alt={`User`} className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-highest" />
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-on-surface-variant flex items-center gap-1"><Target size={14}/> Desafío Semanal</span>
                        <span className="text-primary-dark">4/10</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full w-[40%]"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Create Group CTA */}
                  <div className="card-ac shrink-0 w-[200px] snap-start border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container transition-colors touch-target">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <Plus size={24} />
                    </div>
                    <span className="font-bold text-sm text-neutral">Nuevo Grupo</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ── BOTTOM TAB NAVIGATION ── */}
      <div className="absolute bottom-0 left-0 w-full bg-surface-container-lowest/90 backdrop-blur-md border-t border-outline-variant/30 px-4 py-3 pb-safe z-50 shadow-[0_-4px_20px_rgba(26,26,46,0.05)]">
        <div className="max-w-sm mx-auto flex items-center gap-2">
          <button 
            onClick={() => setActiveTab("sala")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all touch-target ${
              activeTab === 'sala' 
                ? 'text-primary' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
            }`}
          >
            <div className={`px-4 py-1 rounded-full transition-colors ${activeTab === 'sala' ? 'bg-primary/20' : 'bg-transparent'}`}>
              <Users size={20} />
            </div>
            <span className="text-[10px] font-bold">Sala de Estudio</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("amigos")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all touch-target ${
              activeTab === 'amigos' 
                ? 'text-primary' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
            }`}
          >
            <div className={`px-4 py-1 rounded-full transition-colors ${activeTab === 'amigos' ? 'bg-primary/20' : 'bg-transparent'}`}>
              <UserPlus size={20} />
            </div>
            <span className="text-[10px] font-bold">Amigos</span>
          </button>
        </div>
      </div>

    </div>
  );
}
