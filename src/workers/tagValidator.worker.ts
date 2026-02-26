/// <reference lib="webworker" />
import { parseContent } from './parser';
import { validateTokens } from './validator';
import type { WorkerMessage, MainMessage } from '../types';

let cancelled = false;

self.onmessage = async (event: MessageEvent<MainMessage>) => {
    const { type, payload } = event.data;

    if (type === 'CANCEL') {
        cancelled = true;
        return;
    }

    if (type !== 'VALIDATE' || !payload) return;

    cancelled = false;
    const { content, language } = payload;

    const TIMEOUT_MS = 10_000;
    const startTime = Date.now();

    try {
        const totalLines = content.split('\n').length;

        // Send immediate progress
        const progressMsg: WorkerMessage = {
            type: 'PROGRESS',
            payload: { processedLines: 0, totalLines, progress: 0 },
        };
        self.postMessage(progressMsg);

        // Parse tokens
        const { tokens } = parseContent(content, language);

        if (cancelled) return;

        // Validate with progress callbacks
        const errors = validateTokens(tokens, {
            content,
            maxErrors: 500,
            onProgress: (processed, total) => {
                if (Date.now() - startTime > TIMEOUT_MS) {
                    throw new Error('Validation timeout after 10 seconds. Partial results shown.');
                }
                const progress = Math.round((processed / Math.max(total, 1)) * 90) + 5;
                const msg: WorkerMessage = {
                    type: 'PROGRESS',
                    payload: {
                        processedLines: Math.round((processed / Math.max(total, 1)) * totalLines),
                        totalLines,
                        progress,
                    },
                };
                self.postMessage(msg);
            },
        });

        if (cancelled) return;

        const doneMsg: WorkerMessage = {
            type: 'COMPLETE',
            payload: { errors },
        };
        self.postMessage(doneMsg);
    } catch (err) {
        const errorMsg: WorkerMessage = {
            type: 'ERROR',
            payload: { errorMessage: (err as Error).message },
        };
        self.postMessage(errorMsg);
    }
};
