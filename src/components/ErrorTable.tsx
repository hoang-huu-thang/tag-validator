import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getErrorTypeBadgeClass, getErrorTypeLabel } from '../utils/errorFormatter';
import type { ValidationError, SortField, ErrorType } from '../types';

interface ErrorTableProps {
    onSelectError: (error: ValidationError) => void;
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: 'asc' | 'desc' }) {
    if (field !== current) return <ChevronUp size={12} style={{ opacity: 0.2 }} />;
    return dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

export const ErrorTable: React.FC<ErrorTableProps> = ({ onSelectError }) => {
    const {
        errors,
        selectedErrorId,
        selectError,
        sortField,
        sortDirection,
        setSortField,
        setSortDirection,
        filterType,
        setFilterType,
    } = useAppStore();

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    }, [sortField, sortDirection, setSortField, setSortDirection]);

    const filteredSorted = useMemo(() => {
        let list = errors;
        if (filterType !== 'all') {
            list = list.filter(e => e.type === filterType);
        }
        return [...list].sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'type': cmp = a.type.localeCompare(b.type); break;
                case 'tag': cmp = a.tag.localeCompare(b.tag); break;
                case 'line': cmp = a.line - b.line; break;
                case 'column': cmp = a.column - b.column; break;
                case 'message': cmp = a.message.localeCompare(b.message); break;
            }
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }, [errors, filterType, sortField, sortDirection]);

    const copyError = async (e: React.MouseEvent<HTMLButtonElement>, error: ValidationError) => {
        e.stopPropagation();
        const text = `[${error.type}] <${error.tag}> line ${error.line}:${error.column} — ${error.message}`;
        await navigator.clipboard.writeText(text);
        setCopiedId(error.id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const handleRowClick = useCallback((error: ValidationError) => {
        selectError(error.id);
        onSelectError(error);
    }, [selectError, onSelectError]);

    // Filter tabs
    const tabs: Array<{ label: string; value: ErrorType | 'all' }> = [
        { label: `All (${errors.length})`, value: 'all' },
        { label: `Missing Close (${errors.filter(e => e.type === 'MISSING_CLOSE').length})`, value: 'MISSING_CLOSE' },
        { label: `Missing Open (${errors.filter(e => e.type === 'MISSING_OPEN').length})`, value: 'MISSING_OPEN' },
        { label: `Mismatch (${errors.filter(e => e.type === 'MISMATCH').length})`, value: 'MISMATCH' },
    ];

    const cols: Array<{ field: SortField; label: string; width: string }> = [
        { field: 'type', label: 'Type', width: '28%' },
        { field: 'tag', label: 'Tag', width: '16%' },
        { field: 'line', label: 'Line', width: '10%' },
        { field: 'column', label: 'Col', width: '8%' },
        { field: 'message', label: 'Message', width: 'auto' },
    ];

    if (errors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
                <div className="text-2xl">✓</div>
                <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>No errors detected</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your markup looks valid!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Filter tabs */}
            <div
                className="flex gap-0.5 px-3 pt-2 pb-0 flex-shrink-0 overflow-x-auto"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                {tabs.map(tab => (
                    <button
                        key={tab.value}
                        className="px-2.5 py-1.5 text-xs rounded-t font-medium whitespace-nowrap transition-colors"
                        style={{
                            background: filterType === tab.value ? 'var(--bg-tertiary)' : 'transparent',
                            color: filterType === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
                            borderBottom: filterType === tab.value ? '2px solid var(--accent)' : '2px solid transparent',
                        }}
                        onClick={() => setFilterType(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="flex flex-col flex-1 min-h-0 overflow-auto">
                {/* Header */}
                <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                    <thead style={{ background: 'var(--bg-tertiary)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                            {cols.map(col => (
                                <th
                                    key={col.field}
                                    className="px-3 py-2 text-left cursor-pointer select-none font-medium"
                                    style={{ color: 'var(--text-muted)', width: col.width, borderBottom: '1px solid var(--border)' }}
                                    onClick={() => handleSort(col.field)}
                                >
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        <SortIcon field={col.field} current={sortField} dir={sortDirection} />
                                    </span>
                                </th>
                            ))}
                            <th style={{ width: 32, borderBottom: '1px solid var(--border)' }} />
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSorted.map((error, idx) => (
                            <tr
                                key={error.id}
                                className={`error-row ${selectedErrorId === error.id ? 'selected' : ''}`}
                                style={{
                                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                    borderBottom: '1px solid var(--border)',
                                }}
                                onClick={() => handleRowClick(error)}
                            >
                                <td className="px-3 py-2">
                                    <span className={`badge ${getErrorTypeBadgeClass(error.type)}`}>
                                        {getErrorTypeLabel(error.type)}
                                    </span>
                                </td>
                                <td className="px-3 py-2 font-mono" style={{ color: 'var(--accent)' }}>
                                    &lt;{error.tag}&gt;
                                </td>
                                <td className="px-3 py-2 font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                    {error.line}
                                </td>
                                <td className="px-3 py-2 font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                    {error.column}
                                </td>
                                <td className="px-3 py-2 truncate" style={{ color: 'var(--text-primary)', maxWidth: 0 }}>
                                    <span title={error.message}>{error.message}</span>
                                </td>
                                <td className="py-2 pr-2 text-right">
                                    <button
                                        className="btn-ghost p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ opacity: selectedErrorId === error.id ? 1 : undefined }}
                                        onClick={(e) => copyError(e, error)}
                                        title="Copy error"
                                    >
                                        {copiedId === error.id ? (
                                            <Check size={11} style={{ color: 'var(--success)' }} />
                                        ) : (
                                            <Copy size={11} style={{ color: 'var(--text-muted)' }} />
                                        )}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
