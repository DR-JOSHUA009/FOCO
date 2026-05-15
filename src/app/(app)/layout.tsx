"use client";

import { useEffect } from "react";
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
  MessageSquare,
  LogOut,
  Flame,
  Medal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LumosChat from "@/components/lumos/LumosChat";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();
  const { user, userStats, setUser, setUserStats, setLoading } = useAppStore();

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

        // Cargar stats (racha, nivel, xp)
        const { data: stats } = await supabase
          .from("user_stats")
          .select("*")
          .eq("user_id", authUser.id)
          .single();
          
        if (stats) {
          // Check Streaks
          const updatedStats = await checkAndUpdateStreak(supabase, authUser.id, stats);
          if (updatedStats) {
            setUserStats({ ...stats, ...updatedStats } as any);
          } else {
            setUserStats(stats as any);
          }
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [supabase, setUser, setUserStats, setLoading]);

  const navItems = [
    { label: "Inicio", href: "/", icon: LayoutDashboard },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tareas", href: "/tareas", icon: CheckSquare },
    { label: "Modo Foco", href: "/foco", icon: Timer },
    { label: "Cuadernos", href: "/cuadernos", icon: BookOpen },
    { label: "Perfil", href: "/perfil", icon: UserIcon },
  ];

  return (
    <div className="flex h-screen w-full bg-surface overflow-hidden text-on-surface">
      {/* Sidebar - 240px */}
      <aside className="w-[240px] h-full bg-white border-r border-outline-variant/50 flex flex-col justify-between flex-shrink-0 relative z-20">
        <div>
          {/* Logo */}
          <div className="h-[64px] flex items-center px-6 border-b border-outline-variant/50">
            <span className="font-bold text-2xl tracking-tight text-on-surface">FOCO</span>
            <span className="font-bold text-2xl tracking-tight text-primary">I</span>
          </div>

          {/* Nav */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              // Especial rule for "/" to avoid always matching startsWith
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary-container/30 text-primary font-semibold"
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
        <div className="p-4 border-t border-outline-variant/50 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-container/50 flex items-center justify-center text-primary font-bold overflow-hidden">
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
              className="w-full flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-error transition-colors px-2 py-1.5 rounded-md hover:bg-error/10"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Topbar - 64px */}
        <header className="h-[64px] bg-white/80 backdrop-blur-md border-b border-outline-variant/50 flex items-center justify-end px-6 gap-6 flex-shrink-0 z-10">
          {/* Stats Badges */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-warning/10 text-warning px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm">
              <Flame size={16} className="fill-warning text-warning" />
              {userStats?.racha_actual || 0}d
            </div>
            <div className="flex items-center gap-1.5 bg-primary-container/40 text-primary px-3 py-1.5 rounded-full text-sm font-semibold capitalize shadow-sm">
              <Medal size={16} />
              Nivel {userStats?.nivel || "Bronce"}
            </div>
            <div className="flex items-center gap-1.5 bg-secondary-container/40 text-secondary-dark px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm">
              <Sparkles size={16} className="text-secondary" />
              {userStats?.xp_total || 0} XP
            </div>
          </div>

          <div className="w-px h-6 bg-outline-variant/50"></div>

          {/* Lumos AI Button */}
          <button className="flex items-center gap-2 bg-on-surface text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-on-surface/90 transition-all shadow-md hover:shadow-lg active:scale-95">
            <MessageSquare size={16} />
            Lumos AI
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-surface">
          {children}
        </main>
      </div>
      <LumosChat />
    </div>
  );
}
