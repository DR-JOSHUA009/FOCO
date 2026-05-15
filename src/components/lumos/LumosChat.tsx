"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "¿Cómo priorizo mis tareas?",
  "Dame un tip rápido",
  "¿Cuánto XP me falta para subir?",
  "Motívame"
];

export default function LumosChat() {
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
    
    const newMessages = [...messages, { role: "user", content: text } as Message];
    setMessages(newMessages);
    setInput("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/lumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) })
      });

      if (!response.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: response.status === 429 ? "He alcanzado mi límite de respuestas por esta hora. ¡Tómate un descanso y vuelve pronto!" : "Hubo un error de conexión con la red. Intenta de nuevo." }]);
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
          updated[updated.length - 1].content += chunkValue;
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
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-dark transition-all z-40 hover:scale-110 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <Sparkles size={24} />
      </button>

      <div className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-surface z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out border-l border-outline-variant/30 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-16 bg-primary text-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><Sparkles size={18}/> Lumos AI</h2>
            <p className="text-[10px] text-white/80 font-medium uppercase tracking-wider">Tu asistente académico</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-surface-container-highest text-on-surface rounded-br-sm' : 'bg-primary-container/30 text-on-surface border border-primary/20 rounded-bl-sm shadow-sm'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-primary-container/30 border border-primary/20 p-4 rounded-2xl rounded-bl-sm flex gap-1 items-center justify-center">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-outline-variant/30 shrink-0">
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_QUESTIONS.map((q, i) => (
              <button 
                key={i} 
                onClick={() => handleSend(q)}
                className="text-[10px] font-semibold text-primary border border-primary/30 bg-primary/5 px-2 py-1 rounded-full hover:bg-primary/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
          
          <div className="relative flex items-end gap-2 bg-surface-container rounded-xl border border-outline-variant/50 p-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
            <button 
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isThinking}
              className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 mb-1 mr-1 hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
