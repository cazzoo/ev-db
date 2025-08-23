import { useState, useMemo, ReactNode, useRef } from 'react';
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  accessor?: keyof T | ((item: T) => unknown);
  sortable?: boolean;
  render?: (value: unknown, item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  show?: boolean | ((item: T) => boolean);
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  customSearch?: (item: T, query: string) => boolean;
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  paginationStyle?: 'simple' | 'full';
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  zebra?: boolean;
  onRowClick?: (item: T, index: number) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = "Search...",
  searchFields = [],
  customSearch,
  sortable = false,
  paginated = false,
  pageSize = 10,
  paginationStyle = 'full',
  loading = false,
  error = null,
  emptyMessage = "No data available",
  className = "",
  tableClassName = "",
  size = 'md',
  zebra = true,
  onRowClick,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Table ref for basic functionality
  const tableRef = useRef<HTMLTableElement>(null);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchable && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(item => {
        if (customSearch) {
          return customSearch(item, query);
        }

        // Default search implementation
        if (searchFields.length > 0) {
          return searchFields.some(field => {
            const value = item[field];
            return String(value || '').toLowerCase().includes(query);
          });
        }

        // Search all string fields if no specific fields provided
        return Object.values(item).some(value =>
          String(value || '').toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting
    if (sortable && sortConfig) {
      const { key, direction } = sortConfig;
      const column = columns.find(col => col.key === key);

      filtered.sort((a, b) => {
        let aValue: unknown;
        let bValue: unknown;

        if (column?.accessor) {
          if (typeof column.accessor === 'function') {
            aValue = column.accessor(a);
            bValue = column.accessor(b);
          } else {
            aValue = a[column.accessor];
            bValue = b[column.accessor];
          }
        } else {
          aValue = a[key];
          bValue = b[key];
        }

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Compare values
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, sortConfig, searchable, searchFields, customSearch, sortable, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  const paginatedData = paginated
    ? processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : processedData;

  // Reset page when data changes
  useMemo(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // No keyboard navigation - removed for simplicity

  const handleSort = (columnKey: string) => {
    if (!sortable) return;

    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    setSortConfig(prev => {
      if (prev?.key === columnKey) {
        return prev.direction === 'asc'
          ? { key: columnKey, direction: 'desc' }
          : null;
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  const getSortIndicator = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const renderPagination = () => {
    if (!paginated || totalPages <= 1) return null;

    if (paginationStyle === 'simple') {
      return (
        <div className="flex justify-between items-center mt-6">
          <div>Page {currentPage} of {totalPages}</div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      );
    }

    // Full pagination
    return (
      <div className="flex justify-center mt-6">
        <div className="btn-group">
          <button
            className="btn btn-outline"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <ChevronLeftIcon className="h-4 w-4 -ml-2" />
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          {[...Array(Math.min(5, totalPages)).keys()].map(i => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
            if (pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                className={`btn ${pageNum === currentPage ? 'btn-active' : 'btn-outline'}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            className="btn btn-outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronRightIcon className="h-4 w-4" />
            <ChevronRightIcon className="h-4 w-4 -ml-2" />
          </button>
        </div>
      </div>
    );
  };

  const tableClasses = [
    'table',
    size === 'sm' ? 'table-sm' : size === 'lg' ? 'table-lg' : '',
    zebra ? 'table-zebra' : '',
    'w-full',
    tableClassName
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={className}>
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search */}
      {searchable && (
        <div className="mb-6">
          <div className="form-control w-full max-w-xs">
            <div className="input-group">
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="input input-bordered w-full"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <span className="input-group-text">
                <MagnifyingGlassIcon className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      {paginatedData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table
            ref={tableRef}
            className={tableClasses}
            role="table"
          >
            <thead>
              <tr>
                {columns.map((column) => {
                  const showColumn = column.show !== false &&
                    (typeof column.show !== 'function' || paginatedData.some(item => (column.show as (item: T) => boolean)(item)));

                  if (!showColumn) return null;

                  return (
                    <th
                      key={column.key}
                      className={`${column.headerClassName || ''} ${
                        sortable && column.sortable ? 'cursor-pointer hover:bg-base-200' : ''
                      }`}
                      onClick={() => handleSort(column.key)}
                    >
                      {column.header}
                      {sortable && getSortIndicator(column.key)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => (
                <tr
                  key={index}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-base-200' : ''}`}
                  onClick={() => onRowClick?.(item, index)}
                  role="row"
                >
                  {columns.map((column) => {
                    const showColumn = column.show !== false &&
                      (typeof column.show !== 'function' || (column.show as (item: T) => boolean)(item));

                    if (!showColumn) return null;

                    let value: unknown;
                    if (column.accessor) {
                      if (typeof column.accessor === 'function') {
                        value = column.accessor(item);
                      } else {
                        value = item[column.accessor];
                      }
                    } else {
                      value = item[column.key];
                    }

                    return (
                      <td key={column.key} className={column.className || ''}>
                        {column.render ? column.render(value, item, index) : String(value || '')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}

export default DataTable;
