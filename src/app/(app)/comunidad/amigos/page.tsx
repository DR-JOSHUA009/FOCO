"use client";

import { useState, useEffect } from 'react';
import { SearchFriends } from '@/components/comunidad/SearchFriends';

export default function ComunidadAmigosPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = () => {
    fetch('/api/community/friends')
      .then(res => res.json())
      .then(data => {
         setFriends(data.friends || []);
         setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const removeFriend = async (friendId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar a este amigo?')) return;
    try {
      const res = await fetch(`/api/community/friends/${friendId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setFriends(prev => prev.filter(f => f.id !== friendId));
      } else {
        const error = await res.json();
        alert(error.error || 'Error al eliminar amigo');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SearchFriends />

      <div>
        <h2 className="text-xl font-bold text-on-background mb-4">Mis Amigos ({friends.length})</h2>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : friends.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
            Aún no has añadido amigos. ¡Usa el buscador para conectarte!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                    {friend.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-on-background">{friend.display_name}</span>
                </div>
                <button 
                  onClick={() => removeFriend(friend.id)}
                  className="text-on-surface-variant hover:text-error hover:bg-error-container p-2 rounded-full transition-colors"
                  title="Eliminar amigo"
                >
                  <span className="material-symbols-outlined text-[20px]">person_remove</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
