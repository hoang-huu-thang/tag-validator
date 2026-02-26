import { useRef, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import type { ValidationError } from '../types';

type MonacoEditor = Monaco.editor.IStandaloneCodeEditor;
type IDisposable = Monaco.IDisposable;

const ERROR_LINE_CLASS = 'error-line-decoration';
const WARNING_LINE_CLASS = 'warning-line-decoration';
const GLYPH_CLASS = 'error-glyph-decoration';

export function useMonaco() {
    const decorationsRef = useRef<string[]>([]);
    const markersDisposableRef = useRef<IDisposable | null>(null);

    /**
     * Apply error decorations (highlighted lines, glyph margin) to the editor.
     */
    const applyDecorations = useCallback(
        (editor: MonacoEditor, monaco: typeof Monaco, errors: ValidationError[]) => {
            // Convert errors to markers (shows in the Problems panel and as squiggly lines)
            const model = editor.getModel();
            if (model) {
                const markers: Monaco.editor.IMarkerData[] = errors.map(err => ({
                    severity:
                        err.severity === 'error'
                            ? monaco.MarkerSeverity.Error
                            : monaco.MarkerSeverity.Warning,
                    message: err.message,
                    startLineNumber: err.line,
                    startColumn: err.column,
                    endLineNumber: err.line,
                    endColumn: err.column + err.tag.length + 2,
                    source: 'TagValidator',
                }));
                monaco.editor.setModelMarkers(model, 'tagvalidator', markers);
            }

            // Also apply visual decorations for highlighted background lines
            const newDecorations: Monaco.editor.IModelDeltaDecoration[] = errors.map(err => ({
                range: new monaco.Range(err.line, 1, err.line, Number.MAX_SAFE_INTEGER),
                options: {
                    isWholeLine: true,
                    className: err.severity === 'error' ? ERROR_LINE_CLASS : WARNING_LINE_CLASS,
                    glyphMarginClassName: GLYPH_CLASS,
                    glyphMarginHoverMessage: { value: `**${err.type}**: ${err.message}` },
                    overviewRuler: {
                        color: err.severity === 'error' ? '#f44747' : '#ffcc02',
                        position: monaco.editor.OverviewRulerLane.Full,
                    },
                    minimap: {
                        color: err.severity === 'error' ? '#f44747' : '#ffcc02',
                        position: monaco.editor.MinimapPosition.Inline,
                    },
                },
            }));

            decorationsRef.current = editor.deltaDecorations(
                decorationsRef.current,
                newDecorations
            );
        },
        []
    );

    /**
     * Clear all decorations and markers.
     */
    const clearDecorations = useCallback((editor: MonacoEditor, monaco: typeof Monaco) => {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        const model = editor.getModel();
        if (model) {
            monaco.editor.setModelMarkers(model, 'tagvalidator', []);
        }
        markersDisposableRef.current?.dispose();
        markersDisposableRef.current = null;
    }, []);

    /**
     * Scroll editor to a specific line and highlight it.
     */
    const revealLine = useCallback((editor: MonacoEditor, line: number) => {
        editor.revealLineInCenter(line, 1 /* Smooth */);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
    }, []);

    return { applyDecorations, clearDecorations, revealLine };
}
