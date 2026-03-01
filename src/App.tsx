import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EditorPanel } from './components/EditorPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { useWorker } from './hooks/useWorker';
import { useAppStore } from './store/useAppStore';
import { trackEvent } from './utils/analytics';
import type { ValidationError } from './types';
import './styles/globals.css';

export default function App() {
  const { theme, content, language } = useAppStore();
  const { validate, cancel } = useWorker();
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null);
  const [editorWidth, setEditorWidth] = useState(60); // percent
  const beautifyFnRef = useRef<(() => void) | null>(null);
  const [, forceRender] = useState(0);
  const setBeautifyFn = useCallback((fn: () => void) => {
    beautifyFnRef.current = fn;
    forceRender(n => n + 1);
  }, []);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(60);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme to HTML element on mount and change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Handle initial language from URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/(html|xml|vue|jsx)-validator/);
    if (match && match[1]) {
      // Set the global state language directly
      useAppStore.getState().setLanguage(match[1] as any);
    }
  }, []);

  // Sync language with URL and SEO meta tags
  useEffect(() => {
    const langUpper = language.toUpperCase();

    // Update Document Title
    document.title = `${langUpper} Validator - Free Online ${langUpper} Tag Checker`;

    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', `Free online ${langUpper} validator. Detect unclosed tags, mismatched closing tags, and structural errors in ${langUpper} documents instantly.`);

    // Update Canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', `https://tagvalidator.com/${language}-validator`);

    // Only push state if the current URL doesn't already match
    const newPath = `/${language}-validator`;
    if (window.location.pathname !== newPath && window.location.pathname !== '/') {
      window.history.pushState({}, '', newPath);
    } else if (window.location.pathname === '/') {
      window.history.replaceState({}, '', newPath);
    }
  }, [language]);

  // Trigger validation
  const handleValidate = useCallback((text: string) => {
    validate(text, language);
  }, [validate, language]);

  const handleSelectError = useCallback((error: ValidationError) => {
    setSelectedError(error);
  }, []);

  const handleUploadClick = () => {
    trackEvent('click_upload');
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
      {/* SEO content – visually hidden, readable by JS-capable crawlers */}
      <SeoDescription />

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
          <LanguageBarWithBeautify onValidate={handleValidate} beautifyFn={beautifyFnRef.current} />
          <div className="flex-1 min-h-0">
            <EditorPanel onValidate={handleValidate} selectedError={selectedError} onUploadClick={handleUploadClick} onBeautifyReady={setBeautifyFn} />
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
                onClick={() => { trackEvent('click_validate'); cancel(); handleValidate(content); }}
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
function LanguageBarWithBeautify({ onValidate, beautifyFn }: { onValidate: (text: string) => void; beautifyFn?: (() => void) | null }) {
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

      {/* Beautify button */}
      <div style={{ marginLeft: 'auto' }}>
        <button
          className="btn btn-ghost text-xs py-0.5 flex items-center gap-1"
          disabled={!beautifyFn || !content.trim()}
          onClick={() => beautifyFn?.()}
          title="Format / beautify code (Shift+Alt+F)"
          style={{ opacity: (!beautifyFn || !content.trim()) ? 0.4 : 1 }}
        >
          ✦ Beautify
        </button>
      </div>
    </div>
  );
}

/**
 * SEO content component — visually hidden but present in the DOM so that
 * JavaScript-rendering crawlers (e.g. Googlebot) can index it.
 * Users never see this content; screen readers skip it via aria-hidden.
 */
function SeoDescription() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      <h1>TagValidator – Free HTML &amp; XML Tag Mismatch Checker Online</h1>
      <p>
        TagValidator is a free online tool that detects unclosed tags, mismatched closing tags, and structural
        errors in HTML, XML, JSX, Vue, and XHTML documents. Paste your code or upload a file and get instant,
        line-precise error reports. No installation, no sign-up required.
      </p>

      <h2>Key Features</h2>
      <ul>
        <li>Real-time HTML and XML validation powered by a non-blocking Web Worker</li>
        <li>Line and column precision — every error links back to its exact position</li>
        <li>Monaco Editor with full syntax highlighting (same engine as VS Code)</li>
        <li>One-click auto-fix to close all unclosed tags in the correct order</li>
        <li>Beautify and format messy markup instantly</li>
        <li>Drag-and-drop upload for .html, .xml, .vue, .jsx, and .tsx files</li>
        <li>Export error lists as CSV or JSON for CI pipelines and bug reports</li>
        <li>Dark and light themes</li>
      </ul>

      <h2>Supported Languages</h2>
      <ul>
        <li>HTML5 — including void elements and optional closing tags</li>
        <li>XML / XHTML — strict well-formedness checking</li>
        <li>JSX / TSX — React component markup with self-closing tag detection</li>
        <li>Vue Single-File Components — validates template sections</li>
      </ul>

      <h2>Common Use Cases</h2>
      <ul>
        <li>Check missing HTML tags in CMS-generated or email builder output</li>
        <li>Validate XML configuration files for build tools or data feeds</li>
        <li>Find unclosed div or section tags that break page layouts</li>
        <li>Debug JSX render errors caused by improperly closed components</li>
        <li>Audit third-party HTML snippets before embedding them on your site</li>
      </ul>

      <h2>Who Is It For?</h2>
      <p>
        TagValidator is built for web developers, front-end engineers, content editors, and QA teams who need a
        quick sanity-check on markup before deploying to production. It also helps with email HTML templates,
        legacy codebases, and any code that cannot be run through a local linter.
      </p>
    </div>
  );
}
