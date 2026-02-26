import type { TagToken, ValidationError, FixSuggestion, ErrorType } from '../types';
import { VOID_ELEMENTS } from './parser';

let _errorIdCounter = 0;
function genId(): string {
    return `err-${++_errorIdCounter}-${Date.now()}`;
}

interface StackEntry {
    name: string;
    line: number;
    column: number;
}

interface ValidateOptions {
    onProgress?: (processed: number, total: number) => void;
    maxErrors?: number;
    content: string; // original content for context extraction
}

function extractContext(content: string, line: number, radius = 40): string {
    const lines = content.split('\n');
    const targetLine = lines[line - 1] ?? '';
    return targetLine.length > radius * 2
        ? targetLine.slice(0, radius * 2) + '…'
        : targetLine.trim();
}

function buildSuggestions(type: ErrorType, tag: string, expected?: string): FixSuggestion[] {
    switch (type) {
        case 'MISSING_CLOSE':
            return [{
                type: 'ADD_CLOSING_TAG',
                description: `Add </${tag}> closing tag`,
                replacement: `</${tag}>`,
                precedence: 1,
            }];
        case 'MISSING_OPEN':
            return [{
                type: 'REMOVE_TAG',
                description: `Remove orphaned </${tag}>`,
                replacement: '',
                precedence: 1,
            }];
        case 'MISMATCH':
            return [
                {
                    type: 'SWAP_TAGS',
                    description: `Change </${tag}> to </${expected}>`,
                    replacement: `</${expected}>`,
                    precedence: 1,
                },
                {
                    type: 'ADD_CLOSING_TAG',
                    description: `Insert </${expected}> before </${tag}>`,
                    replacement: `</${expected}></${tag}>`,
                    precedence: 2,
                },
            ].filter(Boolean) as FixSuggestion[];
        default:
            return [];
    }
}

/**
 * Stack-based tag validation algorithm.
 * Returns sorted, deduplicated list of ValidationErrors.
 */
export function validateTokens(tokens: TagToken[], options: ValidateOptions): ValidationError[] {
    const { onProgress, maxErrors = 500, content } = options;
    const stack: StackEntry[] = [];
    const errors: ValidationError[] = [];
    const total = tokens.length;
    const progressInterval = Math.max(1, Math.floor(total / 20)); // ~5% intervals

    for (let i = 0; i < total; i++) {
        if (errors.length >= maxErrors) break;

        const token = tokens[i];

        if (onProgress && i % progressInterval === 0) {
            onProgress(i, total);
        }

        if (token.type === 'OPEN') {
            // Void elements don't need closing tags
            if (VOID_ELEMENTS.has(token.name)) continue;
            stack.push({ name: token.name, line: token.line, column: token.column });
        } else if (token.type === 'CLOSE') {
            // Ignore self-closing void in close position
            if (VOID_ELEMENTS.has(token.name)) continue;

            if (stack.length === 0) {
                // No opening tag at all
                errors.push({
                    id: genId(),
                    type: 'MISSING_OPEN',
                    severity: 'error',
                    line: token.line,
                    column: token.column,
                    tag: token.name,
                    context: extractContext(content, token.line),
                    message: `Found </${token.name}> but there is no opening <${token.name}> tag`,
                    suggestions: buildSuggestions('MISSING_OPEN', token.name),
                });
            } else if (stack[stack.length - 1].name === token.name) {
                // Perfect match
                stack.pop();
            } else {
                // Mismatch — try error recovery
                const topEntry = stack[stack.length - 1];
                errors.push({
                    id: genId(),
                    type: 'MISMATCH',
                    severity: 'error',
                    line: token.line,
                    column: token.column,
                    tag: token.name,
                    expected: topEntry.name,
                    context: extractContext(content, token.line),
                    message: `Expected </${topEntry.name}> (opened at line ${topEntry.line}) but found </${token.name}>`,
                    relatedLine: topEntry.line,
                    relatedTag: topEntry.name,
                    suggestions: buildSuggestions('MISMATCH', token.name, topEntry.name),
                });

                // Error recovery: pop until we find a match or exhaust stack
                while (stack.length > 0 && stack[stack.length - 1].name !== token.name) {
                    const unclosed = stack.pop()!;
                    if (errors.length < maxErrors) {
                        errors.push({
                            id: genId(),
                            type: 'MISSING_CLOSE',
                            severity: 'error',
                            line: unclosed.line,
                            column: unclosed.column,
                            tag: unclosed.name,
                            context: extractContext(content, unclosed.line),
                            message: `<${unclosed.name}> opened at line ${unclosed.line} was never closed`,
                            relatedLine: token.line,
                            suggestions: buildSuggestions('MISSING_CLOSE', unclosed.name),
                        });
                    }
                }
                // Pop matching tag if we found it
                if (stack.length > 0 && stack[stack.length - 1].name === token.name) {
                    stack.pop();
                }
            }
        }
    }

    // Remaining items in stack = unclosed tags
    while (stack.length > 0 && errors.length < maxErrors) {
        const unclosed = stack.pop()!;
        errors.push({
            id: genId(),
            type: 'MISSING_CLOSE',
            severity: 'error',
            line: unclosed.line,
            column: unclosed.column,
            tag: unclosed.name,
            context: extractContext(content, unclosed.line),
            message: `<${unclosed.name}> opened at line ${unclosed.line} was never closed before end of file`,
            suggestions: buildSuggestions('MISSING_CLOSE', unclosed.name),
        });
    }

    // Deduplicate: remove duplicate MISSING_CLOSE for same tag+line
    const seen = new Set<string>();
    const deduped = errors.filter(err => {
        const key = `${err.type}:${err.tag}:${err.line}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Sort by line number
    return deduped.sort((a, b) => a.line !== b.line ? a.line - b.line : a.column - b.column);
}
