/**
 * Vitest tests for parser.ts
 *
 * Run: yarn test (or npx vitest run)
 *
 * These tests verify that parseContent() emits the correct token stream
 * for a wide range of edge cases, including tags that htmlparser2 would
 * normally swallow in HTML error-recovery mode.
 */
import { describe, it, expect } from 'vitest';
import { parseContent } from '../parser';
import type { TagToken } from '../../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function opens(tokens: TagToken[]): string[] {
    return tokens.filter(t => t.type === 'OPEN').map(t => t.name);
}

function closes(tokens: TagToken[]): string[] {
    return tokens.filter(t => t.type === 'CLOSE').map(t => t.name);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('parseContent – HTML mode', () => {

    it('emits OPEN and CLOSE for a matched pair', () => {
        const { tokens } = parseContent('<div>hello</div>');
        expect(opens(tokens)).toEqual(['div']);
        expect(closes(tokens)).toEqual(['div']);
    });

    it('correctly identifies a close tag with an unknown name (wewe)', () => {
        // THE CORE BUG: htmlparser2 swallows </wewe> in HTML mode; our
        // secondary scan must inject it so the validator can detect the mismatch.
        const { tokens } = parseContent('<span>Nested mismatch</wewe>');
        expect(opens(tokens)).toEqual(['span']);
        expect(closes(tokens)).toContain('wewe');
    });

    it('emits both OPEN and mismatched CLOSE for div/span swap', () => {
        const { tokens } = parseContent('<div><span>text</div>');
        expect(opens(tokens)).toEqual(['div', 'span']);
        // htmlparser2 may or may not emit implied closes; regardless, div must appear
        expect(closes(tokens)).toContain('div');
    });

    it('handles completely unknown close tag (xyz is not in any HTML spec)', () => {
        const { tokens } = parseContent('<div>hello</xyz>');
        expect(opens(tokens)).toContain('div');
        expect(closes(tokens)).toContain('xyz');
    });

    it('emits extra orphaned close tags', () => {
        const { tokens } = parseContent('<div>text</div></div></span>');
        expect(closes(tokens)).toContain('span');
        // Should see at least 2 div closes + 1 span close
        expect(closes(tokens).filter(n => n === 'div').length).toBeGreaterThanOrEqual(2);
    });

    it('does NOT emit a CLOSE for void elements that appear as self-closing', () => {
        const { tokens } = parseContent('<div><br></div>');
        // br must not appear as a CLOSE
        expect(closes(tokens)).not.toContain('br');
    });

    it('handles missing close at EOF – emits only OPEN tokens', () => {
        const { tokens } = parseContent('<div><span>no close');
        expect(opens(tokens)).toEqual(['div', 'span']);
        // No close tags in source
        expect(closes(tokens)).toEqual([]);
    });

    it('handles empty input', () => {
        const { tokens } = parseContent('');
        expect(tokens).toHaveLength(0);
    });

    it('handles only close tags (orphaned)', () => {
        const { tokens } = parseContent('</div></span>');
        expect(opens(tokens)).toHaveLength(0);
        expect(closes(tokens)).toContain('div');
        expect(closes(tokens)).toContain('span');
    });

    it('normalises tag names to lowercase', () => {
        const { tokens } = parseContent('<DIV>text</DIV>');
        expect(opens(tokens)).toEqual(['div']);
        expect(closes(tokens)).toEqual(['div']);
    });

    it('treats correctly nested tags as valid (no extra tokens)', () => {
        const { tokens } = parseContent('<a><b><c>text</c></b></a>');
        expect(opens(tokens)).toEqual(['a', 'b', 'c']);
        expect(closes(tokens)).toEqual(['c', 'b', 'a']);
    });

    it('handles self-closing syntax <br/> without CLOSE token', () => {
        const { tokens } = parseContent('<div><br/></div>');
        expect(closes(tokens)).not.toContain('br');
        expect(closes(tokens)).toContain('div');
    });

    it('returns correct line numbers', () => {
        const html = '<div>\n  <span>\n  </span>\n</div>';
        const { tokens } = parseContent(html);
        const spanOpen = tokens.find(t => t.type === 'OPEN' && t.name === 'span');
        expect(spanOpen?.line).toBe(2);
    });
});

describe('parseContent – XML mode', () => {

    it('emits OPEN and CLOSE faithfully in XML mode', () => {
        const { tokens } = parseContent('<root><child>text</child></root>', 'xml');
        expect(opens(tokens)).toEqual(['root', 'child']);
        expect(closes(tokens)).toEqual(['child', 'root']);
    });

    it('catches mismatch directly in XML mode (no error recovery)', () => {
        const { tokens } = parseContent('<root><child>text</weirdclose></root>', 'xml');
        expect(closes(tokens)).toContain('weirdclose');
        expect(closes(tokens)).toContain('root');
    });

    it('does not treat br as void in XML mode', () => {
        // In XML, <br> is an open tag that must be explicitly closed or self-closed
        const { tokens } = parseContent('<root><br>text</br></root>', 'xml');
        expect(closes(tokens)).toContain('br');
    });
});
