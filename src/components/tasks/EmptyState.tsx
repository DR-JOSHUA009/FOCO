import { ListTodo } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-outline-variant/30 shadow-sm mt-6">
      <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center text-outline mb-4">
        <ListTodo size={48} />
      </div>
      <h3 className="text-xl font-bold text-on-surface mb-2">No hay tareas aquí</h3>
      <p className="text-on-surface-variant max-w-sm">
        No se encontraron tareas con los filtros actuales. Disfruta tu tiempo libre o agrega nuevas responsabilidades.
      </p>
    </div>
  );
}
