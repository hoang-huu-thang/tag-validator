import { Parser } from 'htmlparser2';
import type { TagToken } from '../types';

// Void elements that don't need closing tags (HTML5)
export const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
    // Older HTML4 void elements
    'command', 'keygen', 'menuitem',
]);

export interface ParseResult {
    tokens: TagToken[];
    parseErrors: string[];
}

/**
 * Parse HTML/XML content into a stream of tokens with line/column info.
 * Uses htmlparser2 under the hood for battle-tested tokenization.
 */
export function parseContent(content: string): ParseResult {
    const tokens: TagToken[] = [];
    const parseErrors: string[] = [];

    // Build a line offset table for O(1) line/col lookup
    const lineOffsets: number[] = [0];
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '\n') {
            lineOffsets.push(i + 1);
        }
    }

    function offsetToLineCol(offset: number): { line: number; column: number } {
        let lo = 0;
        let hi = lineOffsets.length - 1;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (lineOffsets[mid] <= offset) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }
        return {
            line: lo + 1,
            column: offset - lineOffsets[lo] + 1,
        };
    }

    const parser = new Parser(
        {
            onopentag(name: string, attrs: Record<string, string>) {
                const offset = parser.startIndex;
                const pos = offsetToLineCol(offset);
                tokens.push({
                    type: 'OPEN',
                    name: name.toLowerCase(),
                    line: pos.line,
                    column: pos.column,
                    attrs,
                });
            },
            onclosetag(name: string, isImplied: boolean) {
                if (isImplied) return; // skip auto-closed void elements
                const offset = parser.startIndex;
                const pos = offsetToLineCol(offset);
                tokens.push({
                    type: 'CLOSE',
                    name: name.toLowerCase(),
                    line: pos.line,
                    column: pos.column,
                });
            },
            onerror(err: Error) {
                parseErrors.push(err.message);
            },
        },
        {
            recognizeSelfClosing: true,
            lowerCaseTags: true,
            lowerCaseAttributeNames: true,
            decodeEntities: true,
        }
    );

    parser.write(content);
    parser.end();

    return { tokens, parseErrors };
}
