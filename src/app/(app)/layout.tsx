"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { logout } from "@/app/auth/actions";
import { checkAndUpdateStreak } from "@/lib/streaks";
import {
  LayoutDashboard,
  CheckSquare,
  Timer,
  BookOpen,
  User as UserIcon,
  LogOut,
  Flame,
  Medal,
  Sparkles,
  Users,
  Network,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LumosChat from "@/components/lumos/LumosChat";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();
  const { user, userStats, setUser, setUserStats, setLoading, isSyncing, hydrateFromServer, syncPendingMutations } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // FIX 1: Hydrate XP from server on mount — server is the source of truth
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Cargar perfil
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
          
        if (profile) setUser(profile as any);

        // Hydrate stats from server (source of truth for XP)
        await hydrateFromServer();

        // Also check streaks with direct query for streak-specific logic
        const { data: stats } = await supabase
          .from("user_stats")
          .select("*")
          .eq("user_id", authUser.id)
          .single();
          
        if (stats) {
          const updatedStats = await checkAndUpdateStreak(supabase, authUser.id, stats);
          if (updatedStats) {
            setUserStats({ ...stats, ...updatedStats } as any);
          }
        }
      }
      setLoading(false);
    };

    fetchUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUser, setUserStats, setLoading, hydrateFromServer]);

  // FIX 1: Sync pending offline mutations when connectivity is restored
  useEffect(() => {
    const handleOnline = () => {
      syncPendingMutations();
    };
    window.addEventListener('online', handleOnline);
    // Also try to sync on mount in case we came back online
    if (navigator.onLine) syncPendingMutations();
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPendingMutations]);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tareas", href: "/tareas", icon: CheckSquare },
    { label: "Modo Foco", href: "/foco", icon: Timer },
    { label: "Cuadernos", href: "/cuadernos", icon: BookOpen },
    { label: "Salas Coop", href: "/salas-coop", icon: Network },
    { label: "Comunidad", href: "/comunidad", icon: Users },
    { label: "Perfil", href: "/perfil", icon: UserIcon },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-on-surface">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar (240px) — Academic Clarity ── */}
      <aside 
        className={`w-[240px] h-full bg-surface-container-lowest flex flex-col justify-between flex-shrink-0 fixed md:relative z-50 shadow-card transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          {/* Logo */}
          <div className="h-[64px] flex items-center px-6 border-b border-outline-variant/30">
            <span className="font-bold text-2xl tracking-tight text-neutral">FOCO</span>
            <span className="font-bold text-2xl tracking-tight text-primary">I</span>
          </div>

          {/* Nav */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-ac-btn transition-all touch-target ${
                    isActive
                      ? "bg-primary/20 text-neutral font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-primary" : "text-on-surface-variant"} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.nombre?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold truncate w-[130px]">{user?.nombre || "Cargando..."}</span>
              <span className="text-xs text-on-surface-variant capitalize">{userStats?.nivel || "Bronce"}</span>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-error transition-colors px-2 py-1.5 rounded-ac-chip hover:bg-error/10 touch-target"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Topbar (64px) — Academic Clarity */}
        <header className="h-[64px] bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between md:justify-end px-4 md:px-6 gap-4 flex-shrink-0 z-10">
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 text-on-surface-variant hover:bg-surface-container rounded-ac-chip touch-target"
          >
            <Menu size={24} />
          </button>

          {/* Stats Badges */}
          <div className="flex items-center gap-3">
            {/* Streak — tertiary accent */}
            <div className="flex items-center gap-1.5 bg-tertiary/15 text-tertiary-dark px-3 py-1.5 rounded-ac-chip text-sm font-semibold touch-target">
              <Flame size={16} className="fill-tertiary text-tertiary" />
              {userStats?.racha_actual || 0}d
            </div>
            {/* Level — primary accent */}
            <div className="flex items-center gap-1.5 bg-primary/15 text-neutral px-3 py-1.5 rounded-ac-chip text-sm font-semibold capitalize touch-target">
              <Medal size={16} className="text-primary" />
              Nivel {userStats?.nivel || "Bronce"}
            </div>
            {/* XP — secondary accent */}
            <div className="flex items-center gap-1.5 bg-secondary/15 text-neutral px-3 py-1.5 rounded-ac-chip text-sm font-semibold touch-target">
              <Sparkles size={16} className="text-secondary-dark" />
              {userStats?.xp_total || 0} XP
            </div>
          </div>
        </header>

        {/* FIX 1: Sync indicator — shown when offline mutations are queued */}
        {isSyncing && (
          <div className="bg-tertiary/20 text-tertiary-dark text-xs font-bold px-4 py-1.5 flex items-center justify-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
            Sincronizando...
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-background transition-screen">
          {children}
        </main>
      </div>

      {/* ── Lumos AI Chat Panel ── */}
      <LumosChat />
    </div>
  );
}
