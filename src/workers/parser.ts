import { Parser } from 'htmlparser2';
import type { TagToken, Language } from '../types';

// Void elements that don't need closing tags (HTML5)
export const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
    // Older HTML4 void elements
    'command', 'keygen', 'menuitem',
]);

// Elements whose text content must NOT be scanned for tags
const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);

export interface ParseResult {
    tokens: TagToken[];
    parseErrors: string[];
}

/**
 * Parse HTML/XML content into a stream of tokens with line/column info.
 *
 * htmlparser2 performs browser-like HTML error recovery in HTML mode — it
 * silently swallows close tags for unknown elements (e.g. </wewe>) without
 * firing onclosetag, making mismatches invisible to the validator.
 *
 * Fix: after the htmlparser2 pass we do a secondary regex scan over the raw
 * source to collect EVERY </tagname> written in the document. Any close tag
 * that is present in the source but was NOT emitted by the parser is injected
 * as a synthetic CLOSE token so the stack-based validator can catch it.
 *
 * False-positive guards: we track the byte-ranges of HTML comments, CDATA,
 * attribute values, and script/style content during the first pass so the
 * secondary scan never injects tokens for text-that-looks-like-a-tag.
 *
 * For XML language we use xmlMode:true which disables all error recovery and
 * emits every close tag faithfully — no secondary scan needed.
 */
export function parseContent(content: string, language: Language = 'html'): ParseResult {
    const tokens: TagToken[] = []
    const parseErrors: string[] = []

    // Build a line offset table for O(1) line/col lookup
    const lineOffsets: number[] = [0]
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '\n') lineOffsets.push(i + 1)
    }

    function offsetToLineCol(offset: number): { line: number; column: number } {
        let lo = 0
        let hi = lineOffsets.length - 1
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2)
            if (lineOffsets[mid] <= offset) lo = mid
            else hi = mid - 1
        }
        return { line: lo + 1, column: offset - lineOffsets[lo] + 1 }
    }

    const isXml = language === 'xml'

    // Track offsets of CLOSE tokens already emitted by htmlparser2
    const emittedCloseOffsets = new Set<number>()

    // Track byte-ranges that should be excluded from the secondary scan.
    // Each entry is [start, end] (inclusive) of a region whose content
    // should NOT be treated as tag markup.
    const excludedRanges: Array<[number, number]> = []

    // Track whether the current open tag is a raw-text element (script/style)
    let rawTextStart = -1

    const parser = new Parser(
        {
            onopentag(name: string, attrs: Record<string, string>) {
                const offset = parser.startIndex
                const pos = offsetToLineCol(offset)

                const raw = content.slice(parser.startIndex, parser.endIndex + 1)
                const isSelfClosing = raw.endsWith('/>')

                tokens.push({
                    type: 'OPEN',
                    name: name.toLowerCase(),
                    line: pos.line,
                    column: pos.column,
                    attrs,
                    ...(isSelfClosing ? { isSelfClosing: true } : {})
                })

                // Exclude attribute values from secondary scan.
                // Reconstruct approximate character ranges for each attr value.
                for (const [, val] of Object.entries(attrs)) {
                    if (!val) continue
                    // Find the value in the source starting from the tag offset
                    const searchFrom = offset
                    const searchTo = Math.min(content.length, offset + 2048)
                    const attrValIdx = content.indexOf(val, searchFrom)
                    if (attrValIdx !== -1 && attrValIdx < searchTo) {
                        excludedRanges.push([attrValIdx, attrValIdx + val.length - 1])
                    }
                }

                // Track raw-text elements so their body is excluded
                if (RAW_TEXT_ELEMENTS.has(name.toLowerCase())) {
                    rawTextStart = parser.endIndex + 1
                }
            },
            onclosetag(name: string, isImplied: boolean) {
                if (isImplied) return
                const offset = parser.startIndex
                emittedCloseOffsets.add(offset)
                const pos = offsetToLineCol(offset)
                tokens.push({
                    type: 'CLOSE',
                    name: name.toLowerCase(),
                    line: pos.line,
                    column: pos.column,
                })

                // Close the raw-text body range
                if (RAW_TEXT_ELEMENTS.has(name.toLowerCase()) && rawTextStart !== -1) {
                    excludedRanges.push([rawTextStart, offset - 1])
                    rawTextStart = -1
                }
            },
            oncomment(_data: string) {
                // Exclude the full comment from secondary scan
                excludedRanges.push([parser.startIndex, parser.endIndex])
            },
            oncdatastart() {
                excludedRanges.push([parser.startIndex, parser.endIndex])
            },
            onerror(err: Error) {
                parseErrors.push(err.message)
            },
        },
        {
            recognizeSelfClosing: true,
            lowerCaseTags: true,
            lowerCaseAttributeNames: true,
            decodeEntities: true,
            xmlMode: isXml,
            recognizeCDATA: true,
        }
    )

    parser.write(content)
    parser.end()

    // ── Secondary scan (HTML and XML modes) ─────────────────────────────────
    // htmlparser2 swallows close tags that don't match an open tag on its
    // internal stack — both in HTML mode (unknown elements) and in XML mode
    // (mismatched close tags like </weirdclose> inside <child>). Find every
    // </tagname> in the raw source and inject those that were swallowed.
    if (true) {
        // Sort excluded ranges once for efficient lookup
        excludedRanges.sort((a, b) => a[0] - b[0])

        function isExcluded(offset: number): boolean {
            for (const [start, end] of excludedRanges) {
                if (start > offset) break
                if (offset >= start && offset <= end) return true
            }
            return false
        }

        const closeTagRe = /<\/([a-zA-Z][a-zA-Z0-9_:-]*)\s*>/g
        let match: RegExpExecArray | null

        while ((match = closeTagRe.exec(content)) !== null) {
            const offset = match.index
            const rawName = match[1].toLowerCase()

            // Skip void elements — they never need a close token
            if (VOID_ELEMENTS.has(rawName)) continue

            // Skip if htmlparser2 already emitted a CLOSE at this exact offset
            if (emittedCloseOffsets.has(offset)) continue

            // Skip if this offset is inside a comment, CDATA, attribute value,
            // or script/style body — it's not real markup
            if (isExcluded(offset)) continue

            // Swallowed close tag — inject synthetic token
            const pos = offsetToLineCol(offset)
            tokens.push({
                type: 'CLOSE',
                name: rawName,
                line: pos.line,
                column: pos.column,
            })
        }

        // Re-sort tokens by source position
        tokens.sort((a, b) => a.line !== b.line ? a.line - b.line : a.column - b.column)
    }

    return { tokens, parseErrors }
}
