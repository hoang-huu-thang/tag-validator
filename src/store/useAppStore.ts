import { create } from 'zustand';
import type { ValidationError, Language, ValidationState, SortField, SortDirection, ErrorType } from '../types';

interface AppActions {
    setContent: (content: string) => void;
    setLanguage: (lang: Language) => void;
    startValidation: () => void;
    setProgress: (processedLines: number, totalLines: number, progress: number) => void;
    setErrors: (errors: ValidationError[]) => void;
    setValidationError: (msg: string) => void;
    selectError: (id: string | null) => void;
    toggleTheme: () => void;
    setSortField: (field: SortField) => void;
    setSortDirection: (dir: SortDirection) => void;
    setFilterType: (type: ErrorType | 'all') => void;
    resetValidation: () => void;
    clearAll: () => void;
}

export type AppStore = ValidationState & AppActions;

const THEME_KEY = 'tagvalidator-theme';

function getInitialTheme(): 'dark' | 'light' {
    try {
        const saved = localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null;
        return saved ?? 'dark';
    } catch {
        return 'dark';
    }
}

export const useAppStore = create<AppStore>((set, get) => ({
    // State
    content: '',
    language: 'html',
    errors: [],
    isValidating: false,
    progress: 0,
    processedLines: 0,
    totalLines: 0,
    theme: getInitialTheme(),
    selectedErrorId: null,
    sortField: 'line',
    sortDirection: 'asc',
    filterType: 'all',

    // Actions
    setContent: (content) => set({ content }),
    setLanguage: (language) => set({ language }),

    startValidation: () => set({
        isValidating: true,
        progress: 0,
        processedLines: 0,
        errors: [],
        selectedErrorId: null,
    }),

    setProgress: (processedLines, totalLines, progress) =>
        set({ processedLines, totalLines, progress }),

    setErrors: (errors) => set({
        errors,
        isValidating: false,
        progress: 100,
    }),

    setValidationError: (_msg) => set({ isValidating: false }),

    selectError: (id) => set({ selectedErrorId: id }),

    toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(THEME_KEY, newTheme); } catch { /* ignore */ }
        // Apply class to html element for Tailwind dark mode
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        document.documentElement.classList.toggle('light', newTheme === 'light');
        set({ theme: newTheme });
    },

    setSortField: (sortField) => set({ sortField }),
    setSortDirection: (sortDirection) => set({ sortDirection }),

    setFilterType: (filterType) => set({ filterType }),

    resetValidation: () => set({
        errors: [],
        isValidating: false,
        progress: 0,
        processedLines: 0,
        totalLines: 0,
        selectedErrorId: null,
    }),

    clearAll: () => set({
        content: '',
        errors: [],
        isValidating: false,
        progress: 0,
        processedLines: 0,
        totalLines: 0,
        selectedErrorId: null,
        filterType: 'all',
    }),
}));
