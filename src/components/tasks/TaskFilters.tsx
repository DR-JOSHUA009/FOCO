import { Search, Filter } from "lucide-react";

interface TaskFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  priorityFilter: string;
  setPriorityFilter: (val: string) => void;
  subjectFilter: string;
  setSubjectFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  subjects: string[];
}

export default function TaskFilters({
  searchQuery, setSearchQuery, priorityFilter, setPriorityFilter, 
  subjectFilter, setSubjectFilter, statusFilter, setStatusFilter, 
  sortBy, setSortBy, subjects
}: TaskFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm space-y-4 mb-6">
      {/* Search and Status row */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por título o descripción..." 
            className="w-full h-10 pl-10 pr-4 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex bg-surface-container rounded-lg p-1">
          {(['pendientes', 'completadas', 'todas']).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                statusFilter === status ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Select Filters row */}
      <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-outline-variant/30">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant font-medium">
          <Filter size={16} /> Filtros:
        </div>
        
        <select 
          className="h-9 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="todas">Prioridad: Todas</option>
          <option value="alta">🔴 Alta</option>
          <option value="media">🟡 Media</option>
          <option value="baja">🟢 Baja</option>
        </select>

        <select 
          className="h-9 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none text-on-surface max-w-[200px] truncate"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="todas">Materia: Todas</option>
          {subjects.map(sub => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-on-surface-variant font-medium">Ordenar:</span>
          <select 
            className="h-9 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="fecha_entrega">Fecha entrega</option>
            <option value="prioridad">Prioridad</option>
            <option value="xp">Recompensa (XP)</option>
            <option value="creacion">Recientes</option>
          </select>
        </div>
      </div>
    </div>
  );
}
