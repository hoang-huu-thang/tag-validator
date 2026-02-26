import { useRef, useCallback, useEffect } from 'react';
import type { WorkerMessage, MainMessage, Language } from '../types';
import { useAppStore } from '../store/useAppStore';

// Import the worker as a module worker (Vite handles this)
import WorkerConstructor from '../workers/tagValidator.worker.ts?worker';

export function useWorker() {
    const workerRef = useRef<Worker | null>(null);
    const { startValidation, setProgress, setErrors, setValidationError } = useAppStore();

    // Create and store worker reference
    useEffect(() => {
        const worker = new WorkerConstructor();
        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            const { type, payload } = event.data;
            if (type === 'PROGRESS') {
                const p = payload as { processedLines: number; totalLines: number; progress: number };
                setProgress(p.processedLines, p.totalLines, p.progress);
            } else if (type === 'COMPLETE') {
                const p = payload as { errors: import('../types').ValidationError[] };
                setErrors(p.errors);
            } else if (type === 'ERROR') {
                const p = payload as { errorMessage: string };
                setValidationError(p.errorMessage);
            }
        };

        worker.onerror = (e: ErrorEvent) => {
            setValidationError(`Worker error: ${e.message}`);
        };

        return () => {
            worker.terminate();
        };
    }, [setProgress, setErrors, setValidationError]);

    const validate = useCallback((text: string, lang: Language) => {
        if (!workerRef.current) return;
        startValidation();
        const msg: MainMessage = {
            type: 'VALIDATE',
            payload: { content: text, language: lang },
        };
        workerRef.current.postMessage(msg);
    }, [startValidation]);

    const cancel = useCallback(() => {
        if (!workerRef.current) return;
        const msg: MainMessage = { type: 'CANCEL' };
        workerRef.current.postMessage(msg);
    }, []);

    return { validate, cancel };
}
