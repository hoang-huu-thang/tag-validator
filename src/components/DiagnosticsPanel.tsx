import React, { useCallback } from 'react';
import { Download, Wrench, FileJson, FileSpreadsheet, Check, X } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { ErrorTable } from './ErrorTable';
import { useAppStore } from '../store/useAppStore';
import type { ValidationError } from '../types';
import {
    countByType,
    autoFixMissingClose,
    errorsToCSV,
    errorsToJSON,
    downloadFile,
} from '../utils/errorFormatter';

interface DiagnosticsPanelProps {
    onSelectError: (error: ValidationError) => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ onSelectError }) => {
    const { errors, content, isValidating, setContent } = useAppStore();
    const [copiedJSON, setCopiedJSON] = React.useState(false);
    const [showFixPreview, setShowFixPreview] = React.useState(false);
    const [fixPreviewContent, setFixPreviewContent] = React.useState('');

    const counts = countByType(errors);

    const handleExportCSV = () => {
        if (!errors.length) return;
        downloadFile(errorsToCSV(errors), 'tagvalidator-errors.csv', 'text/csv');
    };

    const handleExportJSON = async () => {
        const json = errorsToJSON(errors);
        await navigator.clipboard.writeText(json);
        setCopiedJSON(true);
        setTimeout(() => setCopiedJSON(false), 1800);
    };

    const handleQuickFix = useCallback(() => {
        const fixed = autoFixMissingClose(content, errors);
        setFixPreviewContent(fixed);
        setShowFixPreview(true);
    }, [content, errors]);

    const applyFix = () => {
        setContent(fixPreviewContent);
        // Re-validate will be triggered by the App-level useEffect watching content
        setShowFixPreview(false);
    };

    const summaryCards = [
        { label: 'Missing Close', count: counts.MISSING_CLOSE, color: '#f47c7c', bg: 'rgba(244,71,71,0.1)' },
        { label: 'Missing Open', count: counts.MISSING_OPEN, color: '#64b5f6', bg: 'rgba(100,181,246,0.1)' },
        { label: 'Mismatch', count: counts.MISMATCH, color: '#ff9666', bg: 'rgba(255,120,50,0.1)' },
    ];

    return (
        <div className="flex flex-col h-full min-h-0" style={{ background: 'var(--bg-primary)' }}>
            {/* Progress bar */}
            <ProgressBar />

            {/* Summary cards – only when there are errors */}
            {errors.length > 0 && (
                <div className="flex gap-2 px-3 py-2 flex-shrink-0">
                    {summaryCards.map(card => (
                        <div
                            key={card.label}
                            className="flex flex-col items-center flex-1 py-2 rounded-lg"
                            style={{ background: card.bg, border: `1px solid ${card.color}33` }}
                        >
                            <span className="text-lg font-bold font-mono" style={{ color: card.color }}>
                                {card.count}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Action bar – visible when there are errors */}
            {errors.length > 0 && (
                <div
                    className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
                    style={{ borderBottom: '1px solid var(--border)' }}
                >
                    <button
                        className="btn btn-secondary text-xs"
                        onClick={handleQuickFix}
                        disabled={counts.MISSING_CLOSE === 0}
                        title="Auto-insert closing tags for MISSING_CLOSE errors"
                    >
                        <Wrench size={12} />
                        Auto-Fix
                    </button>

                    <div className="flex-1" />

                    <button
                        className="btn btn-ghost text-xs"
                        onClick={handleExportCSV}
                        title="Download error report as CSV"
                    >
                        <FileSpreadsheet size={12} />
                        CSV
                    </button>
                    <button
                        className="btn btn-ghost text-xs"
                        onClick={handleExportJSON}
                        title="Copy errors as JSON"
                    >
                        {copiedJSON ? <Check size={12} style={{ color: 'var(--success)' }} /> : <FileJson size={12} />}
                        {copiedJSON ? 'Copied!' : 'JSON'}
                    </button>
                </div>
            )}

            {/* Error table */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {!isValidating && errors.length === 0 && !content ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                        >
                            <span className="text-xl">🔍</span>
                        </div>
                        <p className="text-xs text-center" style={{ color: 'var(--text-muted)', maxWidth: 180 }}>
                            Load an HTML or XML file to start validation
                        </p>
                    </div>
                ) : (
                    <ErrorTable onSelectError={onSelectError} />
                )}
            </div>

            {/* Quick Fix preview modal */}
            {showFixPreview && (
                <div
                    className="absolute inset-0 flex items-end z-50"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                >
                    <div
                        className="w-full animate-slide-in"
                        style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px 12px 0 0',
                            maxHeight: '60vh',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Auto-Fix Preview
                            </span>
                            <button className="btn-ghost p-1 rounded" onClick={() => setShowFixPreview(false)}>
                                <X size={15} style={{ color: 'var(--text-muted)' }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-3">
                            <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                                {fixPreviewContent.slice(-2000)}
                            </pre>
                        </div>
                        <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                            <button className="btn btn-primary flex-1" onClick={applyFix}>
                                Apply Fix
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowFixPreview(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-ghost" onClick={() => {
                                downloadFile(fixPreviewContent, 'fixed.html', 'text/html');
                            }}>
                                <Download size={13} />
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
