import type { ValidationError, Language } from '../types';
import type { ErrorType } from '../types';

/**
 * Generate a human-friendly message for a validation error.
 */
export function formatErrorMessage(error: ValidationError): string {
    switch (error.type) {
        case 'MISSING_CLOSE':
            return `<${error.tag}> at line ${error.line} is never closed`;
        case 'MISSING_OPEN':
            return `</${error.tag}> at line ${error.line} has no matching opening tag`;
        case 'MISMATCH':
            return `Expected </${error.expected}> but found </${error.tag}> at line ${error.line}`;
        default:
            return error.message;
    }
}

/**
 * Return CSS class name for a given error type badge.
 */
export function getErrorTypeBadgeClass(type: ErrorType): string {
    switch (type) {
        case 'MISMATCH': return 'badge-mismatch';
        case 'MISSING_OPEN': return 'badge-missing-open';
        case 'MISSING_CLOSE': return 'badge-missing-close';
        default: return 'badge-error';
    }
}

export function getErrorTypeLabel(type: ErrorType): string {
    switch (type) {
        case 'MISMATCH': return 'Mismatch';
        case 'MISSING_OPEN': return 'Missing Open';
        case 'MISSING_CLOSE': return 'Missing Close';
        default: return type;
    }
}

/**
 * Count errors by type.
 */
export function countByType(errors: ValidationError[]): Record<ErrorType, number> {
    return errors.reduce(
        (acc, err) => {
            acc[err.type] = (acc[err.type] || 0) + 1;
            return acc;
        },
        { MISMATCH: 0, MISSING_OPEN: 0, MISSING_CLOSE: 0 } as Record<ErrorType, number>
    );
}

/**
 * Apply auto-fix: insert missing closing tags at EOF.
 */
export function autoFixMissingClose(content: string, errors: ValidationError[]): string {
    const missingClose = errors
        .filter(e => e.type === 'MISSING_CLOSE')
        .sort((a, b) => a.line - b.line);

    if (missingClose.length === 0) return content;

    // Collect the tags to close (in reverse stack order)
    const closingTags = missingClose.map(e => `</${e.tag}>`).join('\n');
    return content.trimEnd() + '\n' + closingTags + '\n';
}

/**
 * Export errors as CSV string.
 */
export function errorsToCSV(errors: ValidationError[]): string {
    const header = 'Type,Tag,Line,Column,Message,Context';
    const rows = errors.map(e => [
        e.type,
        e.tag,
        e.line,
        e.column,
        `"${e.message.replace(/"/g, '""')}"`,
        `"${e.context.replace(/"/g, '""')}"`,
    ].join(','));
    return [header, ...rows].join('\n');
}

/**
 * Export errors as JSON string.
 */
export function errorsToJSON(errors: ValidationError[]): string {
    return JSON.stringify(errors, null, 2);
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
