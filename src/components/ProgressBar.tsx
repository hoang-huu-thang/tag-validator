import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ProgressBar: React.FC = () => {
    const { isValidating, progress, processedLines, totalLines, errors, content } = useAppStore();

    const hasResult = !isValidating && content && progress === 100;
    const hasErrors = errors.length > 0;

    if (!content && !isValidating) return null;

    return (
        <div
            className="px-4 py-3 border-b animate-slide-in"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
            {/* Progress bar */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {isValidating ? (
                        <>
                            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                Validating…
                            </span>
                        </>
                    ) : hasResult ? (
                        <>
                            <CheckCircle
                                size={13}
                                style={{ color: hasErrors ? 'var(--error)' : 'var(--success)' }}
                            />
                            <span className="text-xs font-medium" style={{ color: hasErrors ? '#f47c7c' : 'var(--success)' }}>
                                {hasErrors ? `${errors.length} error${errors.length !== 1 ? 's' : ''} found` : 'No errors – file is valid ✓'}
                            </span>
                        </>
                    ) : null}
                </div>

                <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {isValidating && totalLines > 0 ? (
                        `${processedLines.toLocaleString()} / ${totalLines.toLocaleString()} lines`
                    ) : (
                        `${progress}%`
                    )}
                </span>
            </div>

            {/* Track */}
            <div className="progress-bar-track h-1.5">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
        </div>
    );
};
