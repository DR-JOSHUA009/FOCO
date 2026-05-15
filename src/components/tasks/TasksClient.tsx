"use client";

import { useState, useMemo } from "react";
import { Task } from "@/types";
import { Plus } from "lucide-react";
import TaskFilters from "./TaskFilters";
import TaskItem from "./TaskItem";
import TaskModal from "./TaskModal";
import EmptyState from "./EmptyState";

interface TasksClientProps {
  initialTasks: Task[];
  userSubjects: string[];
}

export default function TasksClient({ initialTasks, userSubjects }: TasksClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("todas");
  const [subjectFilter, setSubjectFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("pendientes");
  const [sortBy, setSortBy] = useState("fecha_entrega");

  const handleUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleModalSuccess = (task: Task) => {
    if (taskToEdit) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    } else {
      setTasks([task, ...tasks]);
    }
    setTaskToEdit(undefined);
  };

  const openEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setTaskToEdit(undefined);
    setIsModalOpen(true);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter === "pendientes" && t.completada) return false;
      if (statusFilter === "completadas" && !t.completada) return false;
      if (priorityFilter !== "todas" && t.prioridad !== priorityFilter) return false;
      if (subjectFilter !== "todas" && t.materia !== subjectFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const inTitle = t.titulo.toLowerCase().includes(query);
        const inDesc = t.descripcion?.toLowerCase().includes(query) || false;
        if (!inTitle && !inDesc) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "fecha_entrega") return new Date(a.fecha_entrega).getTime() - new Date(b.fecha_entrega).getTime();
      if (sortBy === "xp") return b.xp_reward - a.xp_reward;
      if (sortBy === "creacion") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "prioridad") {
        const pOrder = { alta: 1, media: 2, baja: 3 };
        return pOrder[a.prioridad] - pOrder[b.prioridad];
      }
      return 0;
    });
  }, [tasks, statusFilter, priorityFilter, subjectFilter, searchQuery, sortBy]);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-12">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
            Mis Tareas 
            <span className="text-sm font-medium bg-surface-container-highest px-3 py-1 rounded-full text-on-surface-variant">
              {tasks.filter(t => !t.completada).length} pendientes
            </span>
          </h1>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-transform hover:scale-105 active:scale-95 shadow-md shadow-primary/20"
        >
          <Plus size={20} /> Nueva Tarea
        </button>
      </header>

      <TaskFilters 
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
        subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        sortBy={sortBy} setSortBy={setSortBy}
        subjects={userSubjects}
      />

      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onEdit={openEditModal}
            />
          ))
        ) : (
          <EmptyState />
        )}
      </div>

      {isModalOpen && (
        <TaskModal 
          onClose={() => setIsModalOpen(false)} 
          taskToEdit={taskToEdit}
          userSubjects={userSubjects}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
