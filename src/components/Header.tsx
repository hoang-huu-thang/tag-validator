import React from 'react';
import { Code2, Upload, Trash2, Sun, Moon, AlertTriangle, Github } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface HeaderProps {
    onUploadClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUploadClick }) => {
    const { theme, toggleTheme, clearAll, errors, isValidating, content } = useAppStore();

    const errorCount = errors.length;

    return (
        <header
            className="flex items-center justify-between px-4 h-12 flex-shrink-0 border-b"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
            {/* Logo */}
            <div className="flex items-center gap-2.5">
                <div className="relative">
                    <Code2 size={20} style={{ color: 'var(--accent)' }} />
                    {errorCount > 0 && (
                        <span
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                            style={{ background: 'var(--error)' }}
                        />
                    )}
                </div>
                <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Tag<span style={{ color: 'var(--accent)' }}>Validator</span>
                </span>
                <span
                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                    v1.0
                </span>
            </div>

            {/* Center: status */}
            {isValidating && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--accent)' }}>
                    <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Validating…
                </div>
            )}
            {!isValidating && errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#f47c7c' }}>
                    <AlertTriangle size={13} />
                    {errorCount} error{errorCount !== 1 ? 's' : ''} found
                </div>
            )}
            {!isValidating && content && errorCount === 0 && (
                <div className="text-xs" style={{ color: 'var(--success)' }}>
                    ✓ No errors found
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1.5">
                <button
                    className="btn btn-primary text-xs"
                    onClick={onUploadClick}
                    data-tooltip="Upload file"
                >
                    <Upload size={13} />
                    Upload
                </button>

                <button
                    className="btn btn-secondary text-xs"
                    onClick={clearAll}
                    disabled={!content && errors.length === 0}
                    data-tooltip="Clear all"
                >
                    <Trash2 size={13} />
                    Clear
                </button>

                <a
                    href="https://github.com/hoang-huu-thang/tag-validator/issues/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost p-1.5"
                    data-tooltip="Report an issue on GitHub"
                >
                    <Github size={15} />
                </a>

                <a
                    href="https://buymeacoffee.com/thanghh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn text-xs font-semibold transition-all duration-150"
                    style={{
                        background: '#FFDD00',
                        color: '#000',
                        border: 'none',
                        boxShadow: '0 1px 4px rgba(255,221,0,0.3)',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
                        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 12px rgba(255,221,0,0.45)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLAnchorElement).style.transform = '';
                        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 1px 4px rgba(255,221,0,0.3)';
                    }}
                    data-tooltip="Support this project"
                >
                    ☕ Buy me a coffee
                </a>

                <div
                    className="w-px h-5 mx-1"
                    style={{ background: 'var(--border)' }}
                />

                <button
                    className="btn btn-ghost p-1.5"
                    onClick={toggleTheme}
                    data-tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
            </div>
        </header>
    );
};
