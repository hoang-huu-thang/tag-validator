import React, { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Upload, FileCode2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useMonaco as useMonacoHook } from '../hooks/useMonaco';
import { readFileAsText, detectLanguageFromFilename, detectLanguageFromContent } from '../utils/fileHandler';
import type { ValidationError } from '../types';
import type * as MonacoTypes from 'monaco-editor';

interface EditorPanelProps {
    onValidate: (text: string) => void;
    selectedError: ValidationError | null;
    onUploadClick: () => void;
    onBeautifyReady?: (fn: () => void) => void;
}

const PLACEHOLDER_HINT = `<!-- Paste your HTML / XML here, or drop a file ✦ -->`;

export const EditorPanel: React.FC<EditorPanelProps> = ({ onValidate, selectedError, onUploadClick, onBeautifyReady }) => {
    const { content, setContent, language, setLanguage, errors, theme } = useAppStore();
    const { applyDecorations, clearDecorations, revealLine } = useMonacoHook();
    const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof MonacoTypes | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const validateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Apply decorations whenever errors change
    useEffect(() => {
        if (editorRef.current && monacoRef.current) {
            if (errors.length > 0) {
                applyDecorations(editorRef.current, monacoRef.current, errors);
            } else {
                clearDecorations(editorRef.current, monacoRef.current);
            }
        }
    }, [errors, applyDecorations, clearDecorations]);

    // Navigate to selected error
    useEffect(() => {
        if (selectedError && editorRef.current) {
            revealLine(editorRef.current, selectedError.line);
        }
    }, [selectedError, revealLine]);

    const handleEditorMount: OnMount = useCallback((editor, monacoInstance) => {
        editorRef.current = editor as MonacoTypes.editor.IStandaloneCodeEditor;
        monacoRef.current = monacoInstance as typeof MonacoTypes;
        setEditorReady(true);

        // Auto-focus editor so user can paste immediately
        editor.focus();

        // Re-apply decorations if errors already exist
        if (errors.length > 0) {
            applyDecorations(
                editor as MonacoTypes.editor.IStandaloneCodeEditor,
                monacoInstance as typeof MonacoTypes,
                errors
            );
        }

        // Expose beautify (format document) to parent
        if (onBeautifyReady) {
            onBeautifyReady(() => {
                editor.getAction('editor.action.formatDocument')?.run();
            });
        }

        // Auto-detect language when user pastes
        editor.onDidPaste(() => {
            const value = editor.getValue();
            if (value.trim()) {
                const detected = detectLanguageFromContent(value);
                setLanguage(detected);
            }
        });
    }, [errors, applyDecorations, setLanguage]);

    // Real-time validation with debounce
    const handleContentChange = useCallback((value: string | undefined) => {
        const text = value ?? '';
        setContent(text);

        if (validateTimeout.current) clearTimeout(validateTimeout.current);

        if (text.trim()) {
            // Short debounce: 500ms after user stops typing
            validateTimeout.current = setTimeout(() => {
                onValidate(text);
            }, 500);
        }
    }, [setContent, onValidate]);

    const handleNewContent = useCallback((text: string) => {
        setContent(text);
        if (text.trim()) {
            if (validateTimeout.current) clearTimeout(validateTimeout.current);
            onValidate(text);
        }
    }, [setContent, onValidate]);

    // File drag-drop anywhere on the editor panel
    const onDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const lang = detectLanguageFromFilename(file.name);
        setLanguage(lang);
        const text = await readFileAsText(file);
        handleNewContent(text);
    }, [handleNewContent, setLanguage]);

    const monacoLanguageMap: Record<string, string> = {
        html: 'html',
        xml: 'xml',
        vue: 'html',
        jsx: 'javascript',
    };

    const isEmpty = !content || content === PLACEHOLDER_HINT;

    return (
        <div
            className="relative h-full"
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
        >
            {/* ── Empty-state overlay (shown until user starts typing / loads file) ── */}
            {isEmpty && editorReady && !isDragOver && (
                <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 pointer-events-none"
                    style={{ background: 'rgba(30,30,30,0.65)', backdropFilter: 'blur(2px)' }}
                >
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg,rgba(79,158,255,0.18),rgba(124,92,191,0.18))',
                            border: '1px solid rgba(79,158,255,0.35)',
                        }}
                    >
                        <FileCode2 size={26} style={{ color: 'var(--accent)' }} />
                    </div>

                    <div className="text-center">
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                            Paste your HTML / XML here
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            or drop a file · or use Upload button
                        </p>
                    </div>

                    {/* Buttons need pointer-events */}
                    <div className="flex gap-3 pointer-events-auto">
                        <button
                            className="btn btn-primary text-xs"
                            onClick={onUploadClick}
                        >
                            <Upload size={13} />
                            Browse file
                        </button>
                        <button
                            className="btn btn-secondary text-xs"
                            onClick={() => {
                                // Load intentional example
                                const example = `<!DOCTYPE html>
<html>
  <head>
    <title>Example</title>
  </head>
  <body>
    <div class="container">
      <h1>Hello World</h1>
      <p>This paragraph is never closed
      <div>
        <span>Nested mismatch</div>
      </span>
    </div>
  </body>
</html>`;
                                handleNewContent(example);
                            }}
                        >
                            Load example
                        </button>
                    </div>
                </div>
            )}

            {/* ── Drag-over overlay ── */}
            {isDragOver && (
                <div
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none"
                    style={{
                        background: 'rgba(79,158,255,0.08)',
                        border: '2px dashed var(--accent)',
                        borderRadius: 4,
                    }}
                >
                    <Upload size={28} style={{ color: 'var(--accent)' }} className="animate-bounce" />
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                        {isEmpty ? 'Drop to load file' : 'Drop to replace content'}
                    </span>
                </div>
            )}

            {/* ── Monaco Editor — always mounted ── */}
            <Editor
                height="100%"
                language={monacoLanguageMap[language] ?? 'html'}
                value={content}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                onChange={handleContentChange}
                onMount={handleEditorMount}
                options={{
                    fontSize: 13,
                    fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                    fontLigatures: true,
                    minimap: { enabled: true, side: 'right' },
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    glyphMargin: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    formatOnPaste: false,
                    renderLineHighlight: 'all',
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        useShadows: true,
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                    },
                    bracketPairColorization: { enabled: true },
                    padding: { top: 12, bottom: 12 },
                }}
                loading={
                    <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-primary)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading editor…</span>
                        </div>
                    </div>
                }
            />
        </div>
    );
};
