// This file is intentionally a separate module so that next/dynamic with { ssr: false }
// loads it only in the browser. This avoids the crash caused by importing CSS
// from an ESM-only package (@excalidraw/excalidraw) during server-side rendering.
import "@excalidraw/excalidraw/index.css";
import { Excalidraw } from "@excalidraw/excalidraw";

export default Excalidraw;
