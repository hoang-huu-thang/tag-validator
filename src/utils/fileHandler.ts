import type { Language } from '../types';

const EXT_MAP: Record<string, Language> = {
    html: 'html',
    htm: 'html',
    xml: 'xml',
    xhtml: 'html',
    vue: 'vue',
    jsx: 'jsx',
    tsx: 'jsx',
};

/**
 * Detect language from a filename extension.
 */
export function detectLanguageFromFilename(filename: string): Language {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return EXT_MAP[ext] ?? 'html';
}

/**
 * Detect language by sniffing the content.
 */
export function detectLanguageFromContent(content: string): Language {
    const trimmed = content.trimStart();
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<rss') || trimmed.startsWith('<feed')) {
        return 'xml';
    }
    if (/<template[^>]*>/.test(content) && /<script[^>]*>/.test(content)) {
        return 'vue';
    }
    if (/import React|from ['"]react['"]|JSX/.test(content)) {
        return 'jsx';
    }
    return 'html';
}

/**
 * Read a File object and return its text content.
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string ?? '');
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * Check if file size is within limit (default 50 MB).
 */
export function isFileSizeOk(file: File, maxMB = 50): boolean {
    return file.size <= maxMB * 1024 * 1024;
}

/**
 * Get a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
