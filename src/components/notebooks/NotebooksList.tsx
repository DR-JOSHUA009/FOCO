"use client";

import { useState } from "react";
import { BookOpen, Plus, MoreVertical, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const COLORS = [
  "#cbb4ed", "#a8d1f6", "#fecdd3", "#fef08a", 
  "#bbf7d0", "#e9d5ff", "#fed7aa", "#e5e7eb"
];

export default function NotebooksList({ initialNotebooks }: { initialNotebooks: any[] }) {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({ nombre: "", materia: "", color: COLORS[0] });
  
  const supabase = createClient();
  const { user } = useAppStore();
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    const { data, error } = await supabase.from("notebooks").insert({
      user_id: user.id,
      nombre: formData.nombre,
      materia: formData.materia,
      color: formData.color,
      contenido_json: null
    }).select().single();

    if (error) {
      toast.error("Error al crear cuaderno");
    } else {
      toast.success("Cuaderno creado");
      router.push(`/cuadernos/${data.id}`);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation
    if (confirm("¿Estás seguro de eliminar este cuaderno? Se perderá todo su contenido.")) {
      const { error } = await supabase.from("notebooks").delete().eq("id", id);
      if (!error) {
        setNotebooks(notebooks.filter(n => n.id !== id));
        toast.success("Cuaderno eliminado");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-12">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Mis Cuadernos</h1>
          <p className="text-on-surface-variant">Lienzos infinitos para tus ideas, mapas mentales y apuntes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-transform hover:scale-105 active:scale-95 shadow-md shadow-primary/20"
        >
          <Plus size={20} /> Nuevo Cuaderno
        </button>
      </header>

      {notebooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {notebooks.map(nb => (
            <Link href={`/cuadernos/${nb.id}`} key={nb.id} className="group relative bg-white rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1 block">
              <div className="h-24 w-full relative" style={{ backgroundColor: nb.color }}>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
                <BookOpen size={48} className="absolute bottom-4 right-4 text-white/40 drop-shadow-sm -rotate-12 group-hover:rotate-0 transition-transform" />
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-on-surface text-lg truncate pr-6">{nb.nombre}</h3>
                  <button onClick={(e) => handleDelete(nb.id, e)} className="absolute right-3 top-28 p-2 rounded-full bg-white text-on-surface-variant hover:text-error hover:bg-error-container shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                    <X size={14} />
                  </button>
                </div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container px-2 py-0.5 rounded mb-3">
                  {nb.materia}
                </span>
                <p className="text-xs text-outline-variant">
                  Actualizado: {new Date(nb.updated_at || nb.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-outline-variant/30 shadow-sm mt-6">
          <div className="w-24 h-24 bg-primary-container/20 rounded-full flex items-center justify-center text-primary mb-4">
            <BookOpen size={48} />
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">No tienes cuadernos aún</h3>
          <p className="text-on-surface-variant max-w-sm mb-6">
            Crea tu primer cuaderno digital libre para hacer esquemas, dibujar o tomar notas sin límites.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold">
            Crear mi primer cuaderno
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-slide-up">
            <div className="flex justify-between items-center p-5 border-b border-outline-variant/30">
              <h2 className="text-lg font-bold text-on-surface">Nuevo Cuaderno</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Nombre</label>
                <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Notas de Biología" className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Materia</label>
                <input type="text" required value={formData.materia} onChange={e => setFormData({...formData, materia: e.target.value})} placeholder="Ej: Biología Celular" className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-2">Color de Portada</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setFormData({...formData, color: c})} className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-on-surface scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }}></button>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isLoading} className="w-full h-11 bg-primary text-white font-bold rounded-xl flex items-center justify-center hover:bg-primary-dark disabled:opacity-70">
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Crear Cuaderno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
