"use client";

import { useState, useEffect } from 'react';

export default function ComunidadSolicitudesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = () => {
    fetch('/api/community/friends/requests')
      .then(res => res.json())
      .then(data => {
         setRequests(data.requests || []);
         setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const respondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/community/friends/request/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        const error = await res.json();
        alert(error.error || 'Error al responder a la solicitud');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-on-background mb-2">Solicitudes Pendientes ({requests.length})</h2>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
          No tienes solicitudes de amistad pendientes.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">
                  {req.sender_display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="font-bold text-on-background block">{req.sender_display_name}</span>
                  <span className="text-xs text-on-surface-variant">Quiere ser tu amigo</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => respondToRequest(req.id, 'reject')}
                  className="px-4 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors font-medium text-sm"
                >
                  Rechazar
                </button>
                <button 
                  onClick={() => respondToRequest(req.id, 'accept')}
                  className="px-4 py-1.5 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity font-bold text-sm"
                >
                  Aceptar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
