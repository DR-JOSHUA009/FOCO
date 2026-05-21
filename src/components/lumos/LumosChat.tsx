"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTION_CHIPS = [
  "¿Cómo priorizo mis tareas?",
  "Dame un tip rápido",
  "¿Cuánto XP me falta para subir?",
];

/**
 * LumosChat — AI assistant panel
 * 
 * DESIGN: Slide-up panel with 300ms ease-in-out transition
 * SECURITY: Rate-limited via /api/lumos (20/hr), auth required
 * [NEEDS REVIEW]: subject_id scoping — requires passing active subject
 *   from notebook context to isolate Lumos per-subject
 */
export default function LumosChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "¡Hola! Soy Lumos ✦. Estoy aquí para ayudarte a organizar tus estudios y mantenerte enfocado. ¿En qué te ayudo hoy?" }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    // Sanitize input to prevent XSS before sending to API
    const sanitized = text.replace(/[<>]/g, "");
    
    const newMessages = [...messages, { role: "user", content: sanitized } as Message];
    setMessages(newMessages);
    setInput("");
    setIsThinking(true);

    try {
      let subject_id = null;
      if (pathname.startsWith('/cuadernos/')) {
        const parts = pathname.split('/');
        subject_id = parts[parts.length - 1];
      }

      const response = await fetch("/api/lumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          subject_id
        })
      });

      if (!response.ok) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: response.status === 429 
            ? "He alcanzado mi límite de respuestas por esta hora. ¡Tómate un descanso y vuelve pronto!" 
            : "Hubo un error de conexión con la red. Intenta de nuevo." 
        }]);
        setIsThinking(false);
        return;
      }

      setIsThinking(false);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      let done = false;
      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunkValue,
          };
          return updated;
        });
      }
    } catch (error) {
      setIsThinking(false);
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, ha ocurrido un error mágico. Inténtalo más tarde." }]);
    }
  };

  return (
    <>
      {/* ── FAB — Primary #CBB4ED bg, Sparkle icon in Neutral ── */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 w-14 h-14 bg-primary text-neutral rounded-full flex items-center justify-center shadow-glow-primary hover:bg-primary-dark transition-all duration-300 ease-in-out z-40 hover:scale-110 active:scale-95 touch-target ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Abrir Lumos AI"
      >
        <Sparkles size={24} />
      </button>

      {/* ── Slide-up Panel — 300ms ease-in-out ── */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-surface-container-lowest z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out border-l border-outline-variant/30 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Panel Header — Neutral (#1A1A2E) bg, Inter Headline */}
        <div className="h-16 bg-neutral text-white flex items-center justify-between px-6 shrink-0 z-10">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Sparkles size={18} className="text-primary"/>
              Lumos AI
            </h2>
            <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Tu asistente académico</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors touch-target"
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] p-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' 
                  ? 'bg-surface-container-highest text-on-surface rounded-2xl rounded-br-sm' 
                  : 'bg-primary/15 text-on-surface rounded-2xl rounded-bl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-primary/15 p-4 rounded-2xl rounded-bl-sm flex gap-1.5 items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/30 shrink-0 pb-safe">
          {/* Suggestion Chips — Secondary (#A8D1F6) fill, 8px radius */}
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTION_CHIPS.map((q, i) => (
              <button 
                key={i} 
                onClick={() => handleSend(q)}
                className="text-xs font-semibold text-neutral bg-secondary/30 px-3 py-1.5 rounded-ac-chip hover:bg-secondary/50 transition-colors touch-target"
              >
                {q}
              </button>
            ))}
          </div>
          
          {/* Text Input */}
          <div className="relative flex items-end gap-2 bg-surface-container rounded-ac-btn border border-outline-variant/50 p-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Pregúntale a Lumos..."
              className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 text-sm px-3 py-2 min-h-[40px] text-on-surface"
              rows={1}
            />
            {/* Send Button — 44x44 min touch target */}
            <button 
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isThinking}
              className="w-11 h-11 rounded-ac-chip bg-primary text-neutral flex items-center justify-center shrink-0 mb-0.5 mr-0.5 hover:bg-primary-dark disabled:opacity-50 transition-colors touch-target"
              aria-label="Enviar mensaje"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
