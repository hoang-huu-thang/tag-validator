import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EditorPanel } from './components/EditorPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { useWorker } from './hooks/useWorker';
import { useAppStore } from './store/useAppStore';
import type { ValidationError } from './types';
import './styles/globals.css';

export default function App() {
  const { theme, content, language } = useAppStore();
  const { validate, cancel } = useWorker();
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null);
  const [editorWidth, setEditorWidth] = useState(60); // percent
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(60);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme to HTML element on mount and change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Trigger validation
  const handleValidate = useCallback((text: string) => {
    validate(text, language);
  }, [validate, language]);

  const handleSelectError = useCallback((error: ValidationError) => {
    setSelectedError(error);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { readFileAsText, detectLanguageFromFilename } = await import('./utils/fileHandler');
    const { setContent, setLanguage } = useAppStore.getState();
    const lang = detectLanguageFromFilename(file.name);
    setLanguage(lang);
    const text = await readFileAsText(file);
    setContent(text);
    if (text.trim()) handleValidate(text);
    e.target.value = '';
  };

  // Panel resizer
  const onMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = editorWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const container = document.getElementById('main-panels');
      if (!container) return;
      const containerWidth = container.getBoundingClientRect().width;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(80, Math.max(30, startWidth.current + (delta / containerWidth) * 100));
      setEditorWidth(newWidth);
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <Header onUploadClick={handleUploadClick} />

      {/* Hidden file input for header upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.xml,.xhtml,.vue,.jsx,.tsx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main panels */}
      <div id="main-panels" className="flex flex-1 min-h-0 overflow-hidden">
        {/* Editor panel */}
        <div
          className="flex flex-col min-h-0 overflow-hidden"
          style={{ width: `${editorWidth}%`, flexShrink: 0 }}
        >
          {/* Language selector bar */}
          <LanguageBar onValidate={handleValidate} />
          <div className="flex-1 min-h-0">
            <EditorPanel onValidate={handleValidate} selectedError={selectedError} onUploadClick={handleUploadClick} />
          </div>
        </div>

        {/* Drag resizer */}
        <div
          className="panel-resizer"
          onMouseDown={onMouseDown}
        />

        {/* Diagnostics panel */}
        <div
          className="relative flex flex-col min-h-0 overflow-hidden"
          style={{ flex: 1, borderLeft: '1px solid var(--border)' }}
        >
          <div
            className="px-3 py-2 flex-shrink-0 flex items-center justify-between border-b"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
              Diagnostics
            </span>
            {content && (
              <button
                className="btn btn-ghost text-xs py-0.5"
                onClick={() => { cancel(); handleValidate(content); }}
                title="Re-run validation"
              >
                ↻ Re-validate
              </button>
            )}
          </div>
          <DiagnosticsPanel onSelectError={handleSelectError} />
        </div>
      </div>
    </div>
  );
}

// Language selector sub-component
function LanguageBar({ onValidate }: { onValidate: (text: string) => void }) {
  const { language, setLanguage, content } = useAppStore();
  const languages = ['html', 'xml', 'vue', 'jsx'] as const;

  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0 border-b"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <span className="text-xs mr-1.5" style={{ color: 'var(--text-muted)' }}>Language:</span>
      {languages.map(lang => (
        <button
          key={lang}
          className="px-2 py-0.5 text-xs rounded font-mono transition-colors"
          style={{
            background: language === lang ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: language === lang ? '#fff' : 'var(--text-muted)',
          }}
          onClick={() => {
            setLanguage(lang);
            if (content.trim()) onValidate(content);
          }}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
