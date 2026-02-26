/**
 * Vitest tests for validator.ts
 *
 * These tests verify that validateTokens() produces the correct
 * ValidationError list for all edge cases, working on top of the
 * token stream produced by parseContent().
 */
import { describe, it, expect } from 'vitest';
import { parseContent } from '../parser';
import { validateTokens } from '../validator';

// ── helper ──────────────────────────────────────────────────────────────────

function validate(html: string, lang: 'html' | 'xml' | 'vue' | 'jsx' = 'html') {
    const { tokens } = parseContent(html, lang);
    return validateTokens(tokens, { content: html });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('validateTokens – basic cases', () => {

    it('reports NO errors for a perfectly valid document', () => {
        const errors = validate('<div><span>text</span></div>');
        expect(errors).toHaveLength(0);
    });

    it('reports NO errors for void elements', () => {
        const errors = validate('<div><img src="x.png"><br><input></div>');
        expect(errors).toHaveLength(0);
    });

    it('reports NO errors for empty input', () => {
        expect(validate('')).toHaveLength(0);
    });

    it('reports NO errors for self-closing void elements', () => {
        expect(validate('<br/>')).toHaveLength(0);
        expect(validate('<img/>')).toHaveLength(0);
    });
});

describe('validateTokens – MISMATCH', () => {

    it('THE CORE BUG: detects mismatch when close tag name differs (span vs wewe)', () => {
        const errors = validate('<span>Nested mismatch</wewe>');
        expect(errors.length).toBeGreaterThan(0);
        const hasMismatch = errors.some(e =>
            e.type === 'MISMATCH' || e.type === 'MISSING_CLOSE'
        );
        expect(hasMismatch).toBe(true);
    });

    it('detects mismatch for div closed with span', () => {
        const errors = validate('<div><span>text</div>');
        const types = errors.map(e => e.type);
        // span was never closed before div, so we expect a MISMATCH or MISSING_CLOSE for span
        expect(types).toContain('MISMATCH');
    });

    it('detects completely unknown close tag as MISSING_OPEN or via parent MISMATCH', () => {
        const errors = validate('<div>hello</xyz>');
        expect(errors.length).toBeGreaterThan(0);
    });

    it('detects deeply nested mismatch', () => {
        const errors = validate('<html><body><div><span>text</div></body></html>');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.type === 'MISMATCH')).toBe(true);
    });
});

describe('validateTokens – MISSING_OPEN', () => {

    it('reports MISSING_OPEN for orphaned close tags', () => {
        const errors = validate('</div></span>');
        expect(errors.length).toBe(2);
        expect(errors.every(e => e.type === 'MISSING_OPEN')).toBe(true);
    });

    it('reports MISSING_OPEN for extra closing div after valid pair', () => {
        const errors = validate('<div>text</div></div>');
        const missingOpen = errors.filter(e => e.type === 'MISSING_OPEN');
        expect(missingOpen.length).toBe(1);
        expect(missingOpen[0].tag).toBe('div');
    });
});

describe('validateTokens – MISSING_CLOSE', () => {

    it('reports MISSING_CLOSE for tags open at EOF', () => {
        const errors = validate('<div><span>no close');
        expect(errors.some(e => e.type === 'MISSING_CLOSE' && e.tag === 'span')).toBe(true);
        expect(errors.some(e => e.type === 'MISSING_CLOSE' && e.tag === 'div')).toBe(true);
    });

    it('reports correct line for unclosed tag', () => {
        const html = '<div>\n<span>text';
        const errors = validate(html);
        const spanErr = errors.find(e => e.tag === 'span');
        expect(spanErr?.line).toBe(2);
    });
});

describe('validateTokens – edge cases', () => {

    it('handles documents with only comments / text', () => {
        expect(validate('<!-- comment -->hello world')).toHaveLength(0);
    });

    it('handles deeply valid nesting', () => {
        expect(validate('<a><b><c><d>x</d></c></b></a>')).toHaveLength(0);
    });

    it('deduplicates errors for the same tag+line', () => {
        // This triggers the deduplication code-path: same MISSING_CLOSE for
        // the same tag on the same line should only appear once.
        const errors = validate('<div><div>text</div>');
        const divClose = errors.filter(e => e.tag === 'div' && e.type === 'MISSING_CLOSE');
        // Should not have duplicates for same line+tag
        const seen = new Set(divClose.map(e => `${e.tag}:${e.line}`));
        expect(divClose.length).toBe(seen.size);
    });

    it('errors are sorted by line number', () => {
        const html = '<a>\n<b>\n</a>\nsome text</c>';
        const errors = validate(html);
        for (let i = 1; i < errors.length; i++) {
            expect(errors[i].line).toBeGreaterThanOrEqual(errors[i - 1].line);
        }
    });
});

describe('validateTokens – XML mode', () => {

    it('reports NO errors for valid XML', () => {
        expect(validate('<root><item>x</item></root>', 'xml')).toHaveLength(0);
    });

    it('detects mismatch in XML with wrong close tag', () => {
        const errors = validate('<root><item>x</wrong></root>', 'xml');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.type === 'MISMATCH' || e.type === 'MISSING_CLOSE')).toBe(true);
    });
});
