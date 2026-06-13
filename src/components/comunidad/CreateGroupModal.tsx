"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Friend {
  id: string;
  display_name: string;
}

export function CreateGroupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(6);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetch('/api/community/friends')
        .then(res => res.json())
        .then(data => {
          if (data.friends) setFriends(data.friends);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/community/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          duration_months: duration,
          member_ids: selectedFriends
        })
      });
      if (res.ok) {
        setIsOpen(false);
        setName('');
        setSelectedFriends([]);
        router.refresh();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create group');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-primary-container text-on-primary-container px-6 py-3 rounded-xl font-bold font-body-md text-body-md active:scale-95 duration-100 transition-colors hover:shadow-md self-start md:self-center"
      >
        <span className="material-symbols-outlined text-[20px]">group_add</span>
        Crear grupo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container">
              <h2 className="text-xl font-bold text-on-background">Crear nuevo grupo</h2>
              <button onClick={() => setIsOpen(false)} className="text-on-surface-variant hover:bg-surface-variant rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-on-surface-variant">Nombre del grupo</label>
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
                <label className="text-sm font-semibold text-on-surface-variant">Invitar amigos</label>
                <div className="max-h-40 overflow-y-auto border border-outline-variant rounded-lg bg-surface flex flex-col p-2 gap-1">
                  {friends.length === 0 ? (
                    <p className="text-sm text-on-surface-variant p-2 text-center">No tienes amigos añadidos aún.</p>
                  ) : (
                    friends.map(friend => (
                      <label key={friend.id} className="flex items-center gap-3 p-2 hover:bg-surface-variant rounded-md cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedFriends.includes(friend.id)}
                          onChange={() => toggleFriend(friend.id)}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-on-background">{friend.display_name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
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
