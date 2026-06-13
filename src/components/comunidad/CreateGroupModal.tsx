"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Friend {
  id: string;
  display_name: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export function CreateGroupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(6);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const router = useRouter();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const openModal = () => {
    setIsOpen(true);
    setErrorMsg('');
    setName('');
    setSelectedFriends([]);
    setLoadingFriends(true);
    fetch('/api/community/friends')
      .then(res => res.json())
      .then(data => {
        setFriends(data.friends || []);
      })
      .catch(err => {
        console.error('Error loading friends:', err);
        setFriends([]);
      })
      .finally(() => setLoadingFriends(false));
  };

  const closeModal = () => {
    setIsOpen(false);
    setErrorMsg('');
  };

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await fetch('/api/community/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        duration_months: duration,
        member_ids: selectedFriends
      })
    });

    const data = await res.json();

    if (res.ok) {
      closeModal();
      showToast('¡Grupo creado correctamente!', 'success');
      router.refresh();
    } else {
      setErrorMsg(data.error || 'Ocurrió un error al crear el grupo.');
    }

    setLoading(false);
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-5 py-3 rounded-xl shadow-lg font-semibold text-sm transition-all animate-slide-up ${
            toast.type === 'success'
              ? 'bg-success text-white'
              : 'bg-error text-on-error'
          }`}
        >
          {toast.message}
        </div>
      )}

      <button
        onClick={openModal}
        className="flex items-center justify-center gap-2 bg-primary-container text-on-primary-container px-6 py-3 rounded-xl font-bold active:scale-95 duration-100 transition-colors hover:shadow-md self-start md:self-center"
      >
        <span className="material-symbols-outlined text-[20px]">group_add</span>
        Crear grupo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container">
              <h2 className="text-xl font-bold text-on-background">Crear nuevo grupo</h2>
              <button
                onClick={closeModal}
                className="text-on-surface-variant hover:bg-surface-variant rounded-full p-1 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {/* Error message */}
              {errorMsg && (
                <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-on-surface-variant">
                  Nombre del grupo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-surface px-4 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-background"
                  placeholder="Ej: Cálculo Avanzado 2024"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-on-surface-variant">Duración</label>
                <select
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full bg-surface px-4 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-background"
                >
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-on-surface-variant">
                  Invitar amigos <span className="font-normal text-on-surface-variant/70">(opcional)</span>
                </label>
                <div className="max-h-40 overflow-y-auto border border-outline-variant rounded-lg bg-surface flex flex-col p-2 gap-1">
                  {loadingFriends ? (
                    <div className="flex justify-center p-3">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : friends.length === 0 ? (
                    <p className="text-sm text-on-surface-variant p-2 text-center">
                      No tienes amigos añadidos aún.
                    </p>
                  ) : (
                    friends.map(friend => (
                      <label
                        key={friend.id}
                        className="flex items-center gap-3 p-2 hover:bg-surface-variant rounded-md cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.id)}
                          onChange={() => toggleFriend(friend.id)}
                          className="w-4 h-4 accent-primary rounded"
                        />
                        <span className="text-sm font-medium text-on-background">
                          {friend.display_name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-2 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-on-surface-variant font-medium hover:bg-surface-variant rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name}
                  className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
