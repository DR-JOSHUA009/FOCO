import { ReactNode } from "react";
import { ComunidadTabs } from "@/components/comunidad/ComunidadTabs";

export default function ComunidadLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-on-background mb-2">Comunidad</h1>
        <p className="text-on-surface-variant">Conecta con tus amigos y compite en grupos de estudio.</p>
      </div>
      <ComunidadTabs />
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}
