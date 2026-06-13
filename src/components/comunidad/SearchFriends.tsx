"use client";

import { useState } from 'react';

interface UserResult {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export function SearchFriends() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(false);
    setErrorMsg('');
    setResults([]);

    const res = await fetch(`/api/community/friends/search?q=${encodeURIComponent(query.trim())}`);
    const data = await res.json();

    if (res.ok) {
      setResults(data.users || []);
    } else {
      setErrorMsg(data.error || 'Error al buscar usuarios.');
      console.error('[SearchFriends] search error:', data.error);
    }

    setSearching(false);
    setSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const sendRequest = async (targetId: string) => {
    const res = await fetch('/api/community/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: targetId })
    });

    if (res.ok) {
      setSentRequests(prev => [...prev, targetId]);
    } else {
      const error = await res.json();
      const msg = error.error || 'Error al enviar solicitud.';
      alert(msg);
      console.error('[SearchFriends] sendRequest error:', msg);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-bold text-on-background mb-4">Añadir nuevos amigos</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por nombre o usuario..."
          className="flex-1 bg-surface px-4 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-background"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
        >
          {searching ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin inline-block" />
              Buscando
            </span>
          ) : (
            'Buscar'
          )}
        </button>
      </div>

      {/* Error */}
      {errorMsg && (
        <p className="mt-3 text-sm text-error font-medium">{errorMsg}</p>
      )}

      {/* Empty state before search */}
      {!searched && !searching && !errorMsg && (
        <p className="mt-4 text-sm text-on-surface-variant text-center">
          Escribe un nombre de usuario para buscar.
        </p>
      )}

      {/* No results */}
      {searched && results.length === 0 && !errorMsg && (
        <p className="mt-4 text-sm text-on-surface-variant text-center">
          No se encontró ese usuario.
        </p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {results.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-on-background leading-tight">{user.display_name}</p>
                  {user.username && (
                    <p className="text-xs text-on-surface-variant">@{user.username}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => sendRequest(user.id)}
                disabled={sentRequests.includes(user.id)}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                {sentRequests.includes(user.id) ? 'Solicitud enviada' : 'Agregar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
