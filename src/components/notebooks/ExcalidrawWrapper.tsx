"use client";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Excalidraw, exportToBlob, exportToSvg } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { AppState, BinaryFiles } from "@excalidraw/excalidraw/types/types";

export interface ExcalidrawWrapperRef {
  getElements: () => readonly ExcalidrawElement[];
  getAppState: () => AppState;
  getFiles: () => BinaryFiles;
  downloadPng: (name: string) => Promise<void>;
  downloadSvg: (name: string) => Promise<void>;
}

interface ExcalidrawWrapperProps {
  initialData?: any;
  onChange?: (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => void;
}

const ExcalidrawWrapper = forwardRef<ExcalidrawWrapperRef, ExcalidrawWrapperProps>(
  ({ initialData, onChange }, ref) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

    useImperativeHandle(ref, () => ({
      getElements: () => excalidrawAPI?.getSceneElements() || [],
      getAppState: () => excalidrawAPI?.getAppState() || {},
      getFiles: () => excalidrawAPI?.getFiles() || {},
      downloadPng: async (name: string) => {
        if (!excalidrawAPI) return;
        const blob = await exportToBlob({
          elements: excalidrawAPI.getSceneElements(),
          appState: { ...excalidrawAPI.getAppState(), exportBackground: true },
          files: excalidrawAPI.getFiles(),
          mimeType: "image/png",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${name}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      },
      downloadSvg: async (name: string) => {
        if (!excalidrawAPI) return;
        const svg = await exportToSvg({
          elements: excalidrawAPI.getSceneElements(),
          appState: { ...excalidrawAPI.getAppState(), exportBackground: true },
          files: excalidrawAPI.getFiles(),
        });
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svg);
        const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${name}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }));

    return (
      <div style={{ height: "100%", width: "100%" }}>
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={initialData}
          onChange={onChange}
          langCode="es-ES"
          UIOptions={{ canvasActions: { loadScene: false, export: false, saveAsImage: false } }}
        />
      </div>
    );
  }
);

ExcalidrawWrapper.displayName = "ExcalidrawWrapper";
export default ExcalidrawWrapper;
