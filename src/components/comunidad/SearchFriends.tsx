"use client";

import { useState } from 'react';

export function SearchFriends() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/community/friends/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.users || []);
    } catch (err) {
      console.error(err);
    }
    setSearching(false);
  };

  const sendRequest = async (targetId: string) => {
    try {
      const res = await fetch('/api/community/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetId })
      });
      if (res.ok) {
        setSentRequests(prev => [...prev, targetId]);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to send request');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-bold text-on-background mb-4">Añadir nuevos amigos</h2>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre..." 
          className="flex-1 bg-surface px-4 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-background"
        />
        <button 
          type="submit" 
          disabled={searching || !query}
          className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {results.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/50">
              <span className="font-medium text-on-background">{user.display_name}</span>
              <button 
                onClick={() => sendRequest(user.id)}
                disabled={sentRequests.includes(user.id)}
                className="text-sm font-bold px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {sentRequests.includes(user.id) ? 'Enviada' : 'Añadir'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
