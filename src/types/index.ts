// TypeScript interfaces for TagValidator

export interface TagToken {
    type: 'OPEN' | 'CLOSE';
    name: string;
    line: number;
    column: number;
    attrs?: Record<string, string | null>;
    isSelfClosing?: boolean;
}

export interface FixSuggestion {
    type: 'ADD_CLOSING_TAG' | 'REMOVE_TAG' | 'SWAP_TAGS';
    description: string;
    replacement: string;
    precedence: number; // 1 = highest confidence
}

export type ErrorType = 'MISMATCH' | 'MISSING_OPEN' | 'MISSING_CLOSE';
export type Severity = 'error' | 'warning';

export interface ValidationError {
    id: string;
    type: ErrorType;
    severity: Severity;
    line: number;
    column: number;
    tag: string;
    expected?: string;
    context: string;
    message: string;
    relatedLine?: number;
    relatedTag?: string;
    suggestions: FixSuggestion[];
}

// Worker ↔ Main communication
export interface WorkerProgressPayload {
    processedLines: number;
    totalLines: number;
    progress: number; // 0-100
}

export interface WorkerCompletePayload {
    errors: ValidationError[];
}

export interface WorkerErrorPayload {
    errorMessage: string;
}

export type WorkerMessage =
    | { type: 'PROGRESS'; payload: WorkerProgressPayload }
    | { type: 'COMPLETE'; payload: WorkerCompletePayload }
    | { type: 'ERROR'; payload: WorkerErrorPayload };

export interface MainMessage {
    type: 'VALIDATE' | 'CANCEL';
    payload?: {
        content: string;
        language: 'html' | 'xml' | 'vue' | 'jsx';
    };
}

export type Language = 'html' | 'xml' | 'vue' | 'jsx';

export type SortField = 'type' | 'tag' | 'line' | 'column' | 'message';
export type SortDirection = 'asc' | 'desc';

export interface ValidationState {
    content: string;
    language: Language;
    errors: ValidationError[];
    isValidating: boolean;
    progress: number;
    processedLines: number;
    totalLines: number;
    theme: 'dark' | 'light';
    selectedErrorId: string | null;
    sortField: SortField;
    sortDirection: SortDirection;
    filterType: ErrorType | 'all';
}
