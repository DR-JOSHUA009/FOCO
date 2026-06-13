"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ComunidadTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 border-b border-outline-variant w-full mb-6">
      <Link 
        href="/comunidad" 
        className={`px-4 py-3 font-medium transition-colors border-b-2 ${
          pathname === '/comunidad' 
            ? 'text-primary border-primary' 
            : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-variant/50'
        }`}
      >
        Grupos
      </Link>
      <Link 
        href="/comunidad/amigos" 
        className={`px-4 py-3 font-medium transition-colors border-b-2 ${
          pathname === '/comunidad/amigos' 
            ? 'text-primary border-primary' 
            : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-variant/50'
        }`}
      >
        Amigos
      </Link>
      <Link 
        href="/comunidad/solicitudes" 
        className={`px-4 py-3 font-medium transition-colors border-b-2 ${
          pathname === '/comunidad/solicitudes' 
            ? 'text-primary border-primary' 
            : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-variant/50'
        }`}
      >
        Solicitudes
      </Link>
    </div>
  );
}
