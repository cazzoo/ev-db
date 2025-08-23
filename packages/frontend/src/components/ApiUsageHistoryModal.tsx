import { useState, useEffect } from 'react';
import { ApiKey, DailyUsage, DailyUsagePerKey } from '../services/api';
import DataTable, { Column } from './DataTable';

interface ApiUsageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKey[];
  dailyUsage: DailyUsage[];
  dailyUsagePerKey: DailyUsagePerKey[];
}

interface ExtendedDailyUsage extends DailyUsage {
  formattedDate: string;
  dayOfWeek: string;
}

const ApiUsageHistoryModal = ({ isOpen, onClose, apiKeys, dailyUsage, dailyUsagePerKey }: ApiUsageHistoryModalProps) => {
  const [filteredUsage, setFilteredUsage] = useState<ExtendedDailyUsage[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<number | 'all'>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (!isOpen) return;

    const processUsageData = () => {
      // Determine which data source to use based on selected API key
      let sourceData: DailyUsage[] = [];

      if (selectedApiKey === 'all') {
        // Use aggregated data for all keys
        sourceData = [...dailyUsage];
      } else {
        // Aggregate per-key data for the selected key
        const keyUsageMap = new Map<string, number>();

        dailyUsagePerKey
          .filter(usage => usage.apiKeyId === selectedApiKey)
          .forEach(usage => {
            const existing = keyUsageMap.get(usage.day) || 0;
            keyUsageMap.set(usage.day, existing + usage.count);
          });

        sourceData = Array.from(keyUsageMap.entries()).map(([day, count]) => ({
          day,
          count
        }));
      }

      // Filter by date range
      const today = new Date();
      let cutoffDate: Date | null = null;

      switch (dateRange) {
        case '7d':
          cutoffDate = new Date(today);
          cutoffDate.setDate(today.getDate() - 7);
          break;
        case '30d':
          cutoffDate = new Date(today);
          cutoffDate.setDate(today.getDate() - 30);
          break;
        case '90d':
          cutoffDate = new Date(today);
          cutoffDate.setDate(today.getDate() - 90);
          break;
        case 'all':
        default:
          cutoffDate = null;
          break;
      }

      let filtered = sourceData;
      if (cutoffDate) {
        filtered = filtered.filter(usage => new Date(usage.day) >= cutoffDate!);
      }

      // Add formatted data and sort by date (newest first)
      const extended: ExtendedDailyUsage[] = filtered
        .map(usage => {
          const date = new Date(usage.day);
          return {
            ...usage,
            formattedDate: date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' })
          };
        })
        .sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime());

      setFilteredUsage(extended);
    };

    processUsageData();
  }, [dailyUsage, dailyUsagePerKey, selectedApiKey, dateRange, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const columns: Column<ExtendedDailyUsage>[] = [
    {
      key: 'formattedDate',
      header: 'Date',
      accessor: 'formattedDate',
      render: (value, item) => (
        <div>
          <div className="font-medium">{String(value)}</div>
          <div className="text-xs text-base-content/60">{item.dayOfWeek}</div>
        </div>
      )
    },
    {
      key: 'count',
      header: 'API Calls',
      accessor: 'count',
      render: (value) => (
        <div className="text-right">
          <span className="badge badge-primary">{String(value)}</span>
        </div>
      )
    }
  ];

  const totalCalls = filteredUsage.reduce((sum, usage) => sum + usage.count, 0);
  const avgDaily = filteredUsage.length > 0 ? Math.round(totalCalls / filteredUsage.length) : 0;
  const maxDaily = filteredUsage.length > 0 ? Math.max(...filteredUsage.map(u => u.count)) : 0;

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">API Usage History</h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Time Period</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          {apiKeys.length > 1 && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">API Key</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={selectedApiKey}
                onChange={(e) => setSelectedApiKey(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              >
                <option value="all">All API Keys</option>
                {apiKeys.map(key => (
                  <option key={key.id} value={key.id}>
                    {key.name || `Key ${key.id}`} {key.revokedAt ? '(Revoked)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-primary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-title">Total Calls</div>
            <div className="stat-value text-primary">{totalCalls.toLocaleString()}</div>
            <div className="stat-desc">
              {dateRange === 'all' ? 'All time' : `Last ${dateRange.replace('d', ' days')}`}
            </div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-secondary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="stat-title">Daily Average</div>
            <div className="stat-value text-secondary">{avgDaily}</div>
            <div className="stat-desc">Calls per day</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-accent">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="stat-title">Peak Day</div>
            <div className="stat-value text-accent">{maxDaily}</div>
            <div className="stat-desc">Highest single day</div>
          </div>
        </div>

        {/* Usage Table */}
        <div className="overflow-x-auto">
          <DataTable<ExtendedDailyUsage>
            data={filteredUsage}
            columns={columns}
            emptyMessage="No API usage data found"
            size="sm"
            zebra={true}
          />
        </div>

        {/* Export Options */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-base-300">
          <div className="text-sm text-base-content/60">
            Showing {filteredUsage.length} days of usage data
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm btn-outline" disabled>
              Export CSV
            </button>
            <button className="btn btn-sm btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};

export default ApiUsageHistoryModal;
