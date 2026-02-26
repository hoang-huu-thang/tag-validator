# HTML/XML Tag Mismatch Detector – Project Context Document

## 1. Project Overview

**Project Name:** TagValidator – High-Performance HTML/XML Tag Mismatch Detection Tool

**Problem Statement:**
Developers, SEO auditors, and data engineers frequently work with large HTML/XML files (1,000–10,000+ lines) containing tag mismatches that are difficult to identify manually. Existing solutions either:
- Require parsing entire files into memory (causing performance degradation)
- Provide generic error reporting without line-level precision
- Block the UI during processing, creating a poor user experience

**Solution:**
A production-grade web application that delivers real-time, non-blocking tag validation with pinpoint error location reporting, integrated editor navigation, and intelligent auto-correction suggestions.

**Target Users:**
- Full-stack developers working with large template files (Vue, JSX, HTML templates)
- SEO auditors validating markup semantics
- Data engineers processing XML/HTML feeds
- Content migration specialists ensuring markup integrity during bulk transformations

---

## 2. Core Requirements

### 2.1 Performance Constraints
- **No UI Lag:** Process files up to 10,000 lines without blocking the main thread
- **Streaming Architecture:** Parse content incrementally using streaming parsers
- **Memory Efficiency:** Avoid DOM tree creation; use token-based analysis
- **Sub-second Feedback:** Complete validation and error reporting within 1–2 seconds for typical files

### 2.2 Accuracy Requirements
- **Line & Column Precision:** Report exact position of every tag mismatch
- **Error Context:** Provide surrounding code snippet for each error
- **Zero False Negatives:** Catch all mismatches including nested, deeply layered structures
- **Minimal False Positives:** Use HTML5 void element definitions to avoid spurious errors

### 2.3 User Experience Requirements
- **Intuitive Input:** Support copy-paste, file drag-and-drop, and file upload
- **Interactive Navigation:** Click any error to auto-scroll editor to that location
- **Visual Feedback:** Real-time syntax highlighting, error markers, and progress indication
- **Actionable Output:** Suggest fixes and provide context for each issue

---

## 3. Technical Architecture

### 3.1 Frontend Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React 18 (or Next.js 14+ with App Router) | SSR capability, server-side processing optional; component composition for modular UI |
| **Editor** | Monaco Editor (embedded VS Code) | Virtual scrolling (handles 10K+ lines), syntax highlighting, built-in line mapping |
| **Styling** | Tailwind CSS v3 | Utility-first, dark/light mode support via class-based theming |
| **Icons** | Lucide React | Lightweight, accessible icon library |
| **State Management** | React Context + useReducer or Zustand | Minimal dependencies, sufficient for this scope |
| **Type Safety** | TypeScript | Catch errors at build time, improve IDE support |
| **Build Tool** | Vite | Fast HMR, optimized production builds |

### 3.2 Core Processing Layer

**Web Worker Architecture:**
```
Main Thread (React)
    ↓ postMessage(fileContent)
Web Worker (htmlparser2 + Validation Algorithm)
    ↓ postMessage(errorList, progress%)
Main Thread (React) - Update State → Re-render
```

**Web Worker Responsibilities:**
- Tokenize file content using `htmlparser2` streaming parser
- Execute tag-matching stack algorithm
- Detect all error types (missing open, missing close, mismatch)
- Generate error metadata (line, column, context)
- Report progress at configurable intervals (every 100 lines processed)

**Parser Library:**
- **htmlparser2 v9+:** Lightweight, stream-friendly HTML/XML parser (used in Cheerio, Prettier)
- **Alternative consideration:** `html-parse-stringify` for fallback, but htmlparser2 is battle-tested

### 3.3 Component Hierarchy

```
<TagValidatorApp>
  ├─ <Header />
  ├─ <main className="flex">
  │  ├─ <EditorPanel>
  │  │  ├─ <FileInputDropZone />
  │  │  └─ <MonacoEditorWrapper />
  │  │     └─ Web Worker Integration
  │  │
  │  └─ <DiagnosticsPanel>
  │     ├─ <ProgressBar />
  │     ├─ <ErrorSummary />
  │     ├─ <ErrorTable>
  │     │  └─ Clickable Error Rows
  │     ├─ <ErrorMinimap />
  │     └─ <ActionBar>
  │        ├─ Quick Fix Button
  │        └─ Export Report Button
```

---

## 4. Core Algorithm: Stack-Based Tag Matching

### 4.1 Tokenization Phase

**Input:** Raw HTML/XML string  
**Process:** Stream tokens from htmlparser2

```javascript
// Pseudocode
htmlparser2.parseChunk(content, {
  onopentag(name, attrs) {
    // Emit: { type: 'OPEN', name, line, col, attrs }
  },
  onclosetag(name) {
    // Emit: { type: 'CLOSE', name, line, col }
  },
  onerror(err) {
    // Track parse errors
  }
});
```

### 4.2 Validation Phase (Stack Algorithm)

**State Machine:**

```
stack = [] // { tagName, line, col, attributes }
errors = []
voidElements = new Set(['img', 'br', 'hr', 'input', ...])

for each token:
  if token.type === 'OPEN':
    if isVoidElement(token.name):
      // Skip – void elements don't require closing tag
    else:
      stack.push(token)

  else if token.type === 'CLOSE':
    if stack.isEmpty():
      // Error: MISSING_OPEN
      errors.push({
        type: 'MISSING_OPEN',
        found: token.name,
        line: token.line,
        column: token.col,
        message: `Found </${token.name}> but no opening <${token.name}> tag`
      })
      // Continue (error tolerance)

    else if stack.peek().tagName === token.name:
      // Match: Pop from stack
      stack.pop()

    else:
      // Mismatch: tag doesn't match top of stack
      openTag = stack.peek()
      errors.push({
        type: 'MISMATCH',
        expected: openTag.tagName,
        found: token.name,
        line: token.line,
        column: token.col,
        expectedLine: openTag.line,
        message: `Found </${token.name}> but expected </${openTag.tagName}> at line ${token.line}`
      })
      
      // Error Recovery: Pop until match found
      while (!stack.isEmpty() && stack.peek().tagName !== token.name):
        unclosed = stack.pop()
        errors.push({
          type: 'MISSING_CLOSE',
          tag: unclosed.tagName,
          line: unclosed.line,
          message: `Tag <${unclosed.tagName}> opened at line ${unclosed.line} was never closed`
        })
      
      if (!stack.isEmpty() && stack.peek().tagName === token.name:
        stack.pop()

// EOF: Any remaining items on stack are unclosed tags
for each item in stack:
  errors.push({
    type: 'MISSING_CLOSE',
    tag: item.tagName,
    line: item.line,
    message: `Tag <${item.tagName}> opened at line ${item.line} was never closed before EOF`
  })
```

### 4.3 Error Deduplication & Sorting

- Remove redundant errors (e.g., don't report both "MISSING_CLOSE" for `<div>` and "MISMATCH" for same occurrence)
- Sort errors by line number
- Limit to top 500 errors (prevent UI overload for files with catastrophic markup)

---

## 5. Data Structures

### 5.1 Error Object Schema

```typescript
interface ValidationError {
  id: string; // UUID for unique identification
  type: 'MISMATCH' | 'MISSING_OPEN' | 'MISSING_CLOSE';
  severity: 'error' | 'warning';
  
  // Primary error location
  line: number;
  column: number;
  
  // Tag information
  tag: string;
  expected?: string; // For MISMATCH type
  
  // Context
  context: string; // Surrounding code snippet (±20 chars)
  message: string;
  
  // Related error location (if applicable)
  relatedLine?: number;
  relatedTag?: string;
  
  // Fix suggestions
  suggestions: FixSuggestion[];
}

interface FixSuggestion {
  type: 'ADD_CLOSING_TAG' | 'REMOVE_TAG' | 'SWAP_TAGS';
  description: string;
  replacement: string;
  precedence: number; // 1 = highest confidence
}
```

### 5.2 Worker-to-Main Communication

```typescript
// Worker → Main (Progress Update)
interface WorkerMessage {
  type: 'PROGRESS' | 'COMPLETE' | 'ERROR';
  payload: {
    processedLines?: number;
    totalLines?: number;
    progress?: number; // 0-100
    errors?: ValidationError[];
    errorMessage?: string;
  };
}

// Main → Worker (Task)
interface MainMessage {
  type: 'VALIDATE';
  payload: {
    content: string;
    language: 'html' | 'xml' | 'vue' | 'jsx';
  };
}
```

---

## 6. Feature Set

### 6.1 Input & Processing

- **File Input Methods:**
  - Click to upload `.html`, `.xml`, `.vue`, `.jsx` files (up to 50 MB)
  - Drag-and-drop anywhere on editor
  - Paste content directly (Ctrl+V)
  - Load from URL (optional, for CMS templates)

- **Format Detection:**
  - Auto-detect markup language based on file extension or content sniffing
  - Allow manual override via dropdown selector

### 6.2 Real-Time Validation

- **Progress Indication:**
  - Linear progress bar showing `processed lines / total lines`
  - Percentage display
  - Estimated time remaining (optional)

- **Non-Blocking Processing:**
  - Worker reports progress every 500 lines
  - UI remains fully interactive during validation
  - Ability to cancel long-running validations

### 6.3 Error Reporting Dashboard

**Error Summary Section:**
- Total error count
- Breakdown by error type (MISSING_OPEN, MISSING_CLOSE, MISMATCH)
- Severity indicators (critical vs. warning)

**Interactive Error Table:**
- Sortable columns: Type | Tag | Line | Column | Message
- Inline click handler: Jump to error location in editor
- Highlight row on hover
- Copy error details to clipboard

**Visual Integration:**
- Monaco Editor decorations:
  - Red wavy underline for error lines
  - Inline error messages (via `glyphMarginClassName`)
  - Line number background color (light red tint)

**Error Minimap (Optional, Advanced):**
- Vertical strip showing error density across file
- Click to jump to error region

### 6.4 Editor Features

- **Syntax Highlighting:** HTML/XML/Vue/JSX
- **Code Folding:** Collapse/expand tag blocks
- **Line Numbers:** Visible with error indicators
- **Minimap:** Optional zoomed view
- **Line Wrapping:** Configurable

### 6.5 Auto-Fix & Batch Operations

**Quick Fix (One-Click):**
- Button: "Auto-Fix Unclosed Tags"
- Action: Insert closing tags for all MISSING_CLOSE errors at EOF
- Preview before applying

**Export & Integration:**
- Download corrected HTML file
- Copy all errors as JSON
- Export error report as CSV
- Copy corrected HTML to clipboard

---

## 7. UI/UX Design

### 7.1 Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Header: TagValidator | Upload | Clear | Theme       │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│   EDITOR PANEL       │  DIAGNOSTICS PANEL           │
│   (60% width)        │  (40% width)                 │
│                      │                              │
│  • File drop zone    │  • Progress bar              │
│  • Monaco Editor     │  • Error summary             │
│  • Line indicators   │  • Error table               │
│  • Syntax highlight  │  • Click row → Jump to line  │
│                      │  • Quick fix button          │
│                      │  • Export button             │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
```

### 7.2 Theme Support

- **Dark Mode (Default):** Background #1e1e1e, Text #e0e0e0
- **Light Mode:** Background #ffffff, Text #333333
- Toggle in header via icon button
- Persist user preference in `localStorage`

### 7.3 Responsive Design

- **Desktop (1200px+):** Full split-view layout
- **Tablet (768px–1199px):** Stacked panels, editor on top
- **Mobile:** Editor in full-screen modal, separate diagnostics modal

### 7.4 Loading & Empty States

- **Empty State:** Prompt with instructions, example file upload button
- **Processing State:** Progress bar + animated spinner + estimated time
- **Error State:** Clear error message, "Retry" button
- **Complete State:** Summary card with action buttons

---

## 8. Technical Implementation Details

### 8.1 Web Worker Setup

**File:** `src/workers/tagValidator.worker.ts`

```typescript
import { parseWithLineTracking } from './parser';
import { validateTags } from './validator';

self.onmessage = async (event: MessageEvent) => {
  const { content, language } = event.data;
  const lines = content.split('\n');
  
  try {
    const errors = await validateTags(content, {
      onProgress: (processed, total) => {
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            processedLines: processed,
            totalLines: total,
            progress: Math.round((processed / total) * 100)
          }
        });
      }
    });

    self.postMessage({
      type: 'COMPLETE',
      payload: { errors }
    });
  } catch (err) {
    self.postMessage({
      type: 'ERROR',
      payload: { errorMessage: err.message }
    });
  }
};
```

### 8.2 Monaco Editor Integration

**Configuration for Large Files:**
```typescript
const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  fontSize: 13,
  fontFamily: 'Fira Code, monospace',
  minimap: { enabled: true, side: 'right' },
  wordWrap: 'on',
  lineNumbers: 'on',
  glyphMargin: true, // For error indicators
  scrollBeyondLastLine: false,
  readOnly: false,
  automaticLayout: true,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    useShadows: true,
    verticalScrollbarSize: 16
  }
};
```

### 8.3 Error Marker Rendering

```typescript
const decorations = errors.map(error => ({
  range: new monaco.Range(
    error.line, 1,
    error.line, Number.MAX_SAFE_INTEGER
  ),
  options: {
    isWholeLine: true,
    className: 'error-line',
    glyphMarginClassName: 'error-glyph',
    glyphMarginHoverMessage: { value: error.message },
    marginClassName: 'error-margin'
  }
}));

editor.deltaDecorations([], decorations);
```

---

## 9. Performance Optimization Strategies

### 9.1 Worker Thread Optimization
- **Chunk Processing:** Break file into 500-line chunks, process sequentially
- **Progress Reporting:** Batch updates (report every 500 lines, not every line)
- **Memory Management:** Clear intermediate data structures between chunks
- **Error Limit:** Stop detailed analysis after 500+ errors (report "Too many errors")

### 9.2 UI Rendering Optimization
- **Virtualization:** Error table uses react-window for 1000+ error rows
- **Memoization:** Wrap Error components with `React.memo()`
- **Debouncing:** Delay re-renders during rapid updates
- **Code Splitting:** Lazy-load Monaco Editor bundle

### 9.3 Parser Optimization
- **Streaming:** Don't load entire file into memory at once
- **Early Exit:** Stop validation if catastrophic errors detected
- **Caching:** Memoize void element set, reuse regex patterns

---

## 10. Error Recovery & Robustness

### 10.1 Malformed Markup Handling

**Scenario:** `<div><p></div></p>`

**Algorithm Response:**
1. Push `{div, 1, 1}` → Stack: `[{div, 1, 1}]`
2. Push `{p, 1, 6}` → Stack: `[{div}, {p}]`
3. See `</div>` but top of stack is `{p}`
4. **Error:** MISMATCH (expected `</p>`, found `</div>`)
5. **Error Recovery:** Pop `{p}`, mark as MISSING_CLOSE; continue
6. Pop `{div}` (matches)
7. See `</p>` but stack empty
8. **Error:** MISSING_OPEN (no opening `<p>` tag)

**Result:** Two precise errors, no cascading false positives

### 10.2 Timeout Protection

- Worker validates on 5-second timeout (fallback for infinite loops)
- Show user: "Validation incomplete due to timeout. Partial results shown."

### 10.3 User-Friendly Error Messages

- Instead of: `MISSING_CLOSE at 1024,5`
- Show: `Tag <div> opened at line 1018 was never closed. Did you forget </div>?`

---

## 11. Project Structure

```
tag-validator/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── workers/
│   │   ├── tagValidator.worker.ts        # Main worker logic
│   │   ├── parser.ts                     # htmlparser2 wrapper
│   │   └── validator.ts                  # Stack algorithm
│   ├── components/
│   │   ├── EditorPanel.tsx
│   │   ├── DiagnosticsPanel.tsx
│   │   ├── FileInputDropZone.tsx
│   │   ├── ErrorTable.tsx
│   │   ├── ProgressBar.tsx
│   │   └── Header.tsx
│   ├── hooks/
│   │   ├── useWorker.ts                  # Worker communication
│   │   └── useMonaco.ts                  # Editor integration
│   ├── types/
│   │   └── index.ts                      # TypeScript interfaces
│   ├── styles/
│   │   └── globals.css                   # Tailwind + custom CSS
│   ├── utils/
│   │   ├── errorFormatter.ts
│   │   └── fileHandler.ts
│   ├── App.tsx                           # Root component
│   └── main.tsx                          # Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## 12. Development Workflow

### 12.1 Setup & Build

```bash
npm create vite@latest tag-validator -- --template react-ts
cd tag-validator
npm install react monaco-editor htmlparser2 lucide-react zustand
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm run dev  # Vite dev server
```

### 12.2 Testing Strategy

- **Unit Tests:** Parser, validator algorithm (Vitest)
- **Integration Tests:** Worker + Main thread communication (Vitest + @testing-library)
- **Performance Tests:** Load large files (10K lines), measure UI responsiveness
- **Visual Regression:** Screenshot tests for different error scenarios

### 12.3 Deployment

- **Build:** `npm run build` → optimized bundles
- **Hosting:** Vercel, Netlify (static), or self-hosted Node.js (optional API for batch processing)
- **CDN:** Serve Monaco Editor from CDN for faster load
- **Environment:** Web Workers supported in all modern browsers (IE 11 excluded)

---

## 13. Success Criteria

✅ **Performance:** 10,000 lines validated in < 2 seconds without UI blocking  
✅ **Accuracy:** 100% detection of MISSING_CLOSE, MISSING_OPEN, MISMATCH errors  
✅ **UX:** Click error → editor scrolls to location in < 300ms  
✅ **Robustness:** Handles malformed markup without cascading errors  
✅ **Accessibility:** WCAG 2.1 AA compliance, keyboard navigation support  
✅ **Browser Support:** Chrome, Firefox, Safari, Edge (latest 2 versions)  

---

This context document is comprehensive enough to onboard an AI-powered development system and begin iterative implementation with high confidence and minimal rework.
