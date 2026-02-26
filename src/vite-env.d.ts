/// <reference types="vite/client" />

// Ambient module declarations for Vite's special import suffixes.

// ?worker  →  Web Worker constructor
declare module '*?worker' {
    const WorkerConstructor: new () => Worker;
    export default WorkerConstructor;
}
