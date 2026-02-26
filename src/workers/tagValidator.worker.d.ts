// Type declaration for Vite's ?worker import suffix.
// Vite resolves `?worker` imports at bundle time; this file tells TypeScript
// the shape of the resolved module so `tsc` does not error with TS2307.
declare module '../workers/tagValidator.worker.ts?worker' {
    const WorkerConstructor: new () => Worker;
    export default WorkerConstructor;
}
