import React, { useCallback } from 'react';
import { Upload, FileCode, FolderOpen } from 'lucide-react';
import { readFileAsText, detectLanguageFromFilename, isFileSizeOk, formatFileSize } from '../utils/fileHandler';
import { useAppStore } from '../store/useAppStore';

interface FileInputDropZoneProps {
    onContent: (content: string) => void;
    className?: string;
}

const ACCEPTED_TYPES = ['.html', '.htm', '.xml', '.xhtml', '.vue', '.jsx', '.tsx'];
const EXAMPLE_HTML = `<!DOCTYPE html>
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

export const FileInputDropZone: React.FC<FileInputDropZoneProps> = ({ onContent, className = '' }) => {
    const { setLanguage } = useAppStore();
    const [isDragOver, setIsDragOver] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const processFile = useCallback(async (file: File) => {
        setError(null);
        if (!isFileSizeOk(file, 50)) {
            setError(`File too large (${formatFileSize(file.size)}). Max 50 MB.`);
            return;
        }
        const lang = detectLanguageFromFilename(file.name);
        setLanguage(lang);
        const text = await readFileAsText(file);
        onContent(text);
    }, [onContent, setLanguage]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const onDragLeave = () => setIsDragOver(false);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        e.target.value = '';
    };

    const loadExample = () => {
        setLanguage('html');
        onContent(EXAMPLE_HTML);
    };

    return (
        <div
            className={`flex flex-col items-center justify-center h-full p-8 transition-all duration-200 ${isDragOver ? 'drop-zone-active' : ''} ${className}`}
            style={{ border: '2px dashed var(--border)', borderRadius: 12 }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
        >
            <div className="flex flex-col items-center gap-5 text-center animate-fade-in">
                {/* Icon */}
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(79,158,255,0.15), rgba(124,92,191,0.15))', border: '1px solid rgba(79,158,255,0.3)' }}
                >
                    {isDragOver ? (
                        <Upload size={28} style={{ color: 'var(--accent)' }} className="animate-bounce" />
                    ) : (
                        <FileCode size={28} style={{ color: 'var(--accent)' }} />
                    )}
                </div>

                {/* Text */}
                <div>
                    <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {isDragOver ? 'Drop your file here' : 'Drop your HTML or XML file'}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Supports: {ACCEPTED_TYPES.join(', ')} · Max 50 MB
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        className="btn btn-primary"
                        onClick={() => inputRef.current?.click()}
                    >
                        <FolderOpen size={15} />
                        Browse File
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={loadExample}
                    >
                        Load Example
                    </button>
                </div>

                {/* Or paste */}
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Or paste HTML/XML content directly in the editor
                </p>

                {/* Error */}
                {error && (
                    <div className="text-xs px-3 py-2 rounded" style={{ background: 'rgba(244,71,71,0.12)', color: '#f47c7c', border: '1px solid rgba(244,71,71,0.3)' }}>
                        {error}
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                onChange={onFileChange}
            />
        </div>
    );
};
