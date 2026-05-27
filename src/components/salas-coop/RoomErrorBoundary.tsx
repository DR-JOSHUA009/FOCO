"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RoomErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[RoomErrorBoundary] caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-on-surface p-8 text-center gap-4">
          <div className="text-6xl">😵</div>
          <h1 className="text-2xl font-bold">Ocurrió un error al cargar la sala</h1>
          <p className="text-on-surface-variant text-sm max-w-md">
            {this.state.error?.message || "Error desconocido"}
          </p>
          <pre className="text-xs text-error bg-error-container/20 p-4 rounded-xl max-w-xl overflow-auto text-left">
            {this.state.error?.stack?.slice(0, 800)}
          </pre>
          <a
            href="/salas-coop"
            className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-lg font-bold hover:brightness-110 transition-all"
          >
            Volver a Salas
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
