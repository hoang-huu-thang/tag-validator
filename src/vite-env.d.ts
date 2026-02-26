/// <reference types="vite/client" />

// Ambient module declarations for Vite's special import suffixes.

// ?worker  →  Web Worker constructor
declare module '*?worker' {
    const WorkerConstructor: new () => Worker;
    export default WorkerConstructor;
}

// Monaco global environment type
declare global {
    interface Window {
        MonacoEnvironment?: {
            getWorker(_: unknown, label: string): Worker;
        };
    }
}
