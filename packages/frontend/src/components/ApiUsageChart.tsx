import { useEffect, useRef, useState } from 'react';
import { ApiKey, DailyUsage, DailyUsagePerKey } from '../services/api';

interface ApiUsageChartProps {
  apiKeys: ApiKey[];
  dailyUsage: DailyUsage[];
  dailyUsagePerKey: DailyUsagePerKey[];
  onViewHistory?: () => void;
}

interface ChartDataPoint {
  date: string;
  value: number;
  apiKeyId?: number;
  apiKeyName?: string;
}

interface ChartSeries {
  apiKeyId: number;
  apiKeyName: string;
  color: string;
  data: ChartDataPoint[];
}

const ApiUsageChart = ({ apiKeys, dailyUsage, dailyUsagePerKey, onViewHistory }: ApiUsageChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedApiKey, setSelectedApiKey] = useState<number | 'all'>('all');
  const [chartSeries, setChartSeries] = useState<ChartSeries[]>([]);
  const [totalUsageData, setTotalUsageData] = useState<ChartDataPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number; seriesId?: number } | null>(null);

  // Generate last 30 days of data
  useEffect(() => {
    // Color palette for different API keys
    const colors = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // yellow
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#f97316', // orange
      '#84cc16', // lime
      '#ec4899', // pink
      '#6b7280', // gray
    ];

    const generateChartData = () => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);

      // Generate date range
      const dates: string[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo);
        date.setDate(thirtyDaysAgo.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Generate total usage data (for "All API Keys" view)
      const totalData: ChartDataPoint[] = dates.map(dateStr => {
        const usage = dailyUsage.find(u => u.day === dateStr);
        return {
          date: dateStr,
          value: usage?.count || 0,
        };
      });
      setTotalUsageData(totalData);

      // Generate series data for each API key
      const series: ChartSeries[] = apiKeys.map((apiKey, index) => {
        const data: ChartDataPoint[] = dates.map(dateStr => {
          const keyUsage = dailyUsagePerKey.filter(u =>
            u.day === dateStr && u.apiKeyId === apiKey.id
          );
          const value = keyUsage.reduce((sum, u) => sum + u.count, 0);
          return {
            date: dateStr,
            value,
            apiKeyId: apiKey.id,
            apiKeyName: apiKey.name || `Key ${apiKey.id}`,
          };
        });

        return {
          apiKeyId: apiKey.id,
          apiKeyName: apiKey.name || `Key ${apiKey.id}`,
          color: colors[index % colors.length],
          data,
        };
      });
      setChartSeries(series);
    };

    generateChartData();
  }, [dailyUsage, dailyUsagePerKey, apiKeys]);

  // Draw the chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine which data to use
    const currentData = selectedApiKey === 'all' ? totalUsageData :
      chartSeries.find(s => s.apiKeyId === selectedApiKey)?.data || [];

    if (currentData.length === 0) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling across all visible data
    let maxValue = 1;
    if (selectedApiKey === 'all') {
      // When showing all keys, find max across all series
      maxValue = Math.max(
        ...chartSeries.flatMap(s => s.data.map(d => d.value)),
        ...totalUsageData.map(d => d.value),
        1
      );
    } else {
      // When showing specific key, use max from that series
      maxValue = Math.max(...currentData.map(d => d.value), 1);
    }

    const yScale = chartHeight / maxValue;
    const xScale = chartWidth / (currentData.length - 1);

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const value = Math.round(maxValue - (maxValue / 5) * i);
      ctx.fillText(value.toString(), padding.left - 10, y);
    }

    // Vertical grid lines (every 5 days)
    for (let i = 0; i < currentData.length; i += 5) {
      const x = padding.left + i * xScale;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    // Draw the lines
    if (currentData.length > 1) {
      if (selectedApiKey === 'all') {
        // Draw multiple lines for all API keys
        chartSeries.forEach((series) => {
          if (series.data.some(d => d.value > 0)) { // Only draw series with data
            ctx.strokeStyle = series.color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            series.data.forEach((point, index) => {
              const x = padding.left + index * xScale;
              const y = padding.top + chartHeight - (point.value * yScale);

              if (index === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            });

            ctx.stroke();

            // Draw points for this series
            ctx.fillStyle = series.color;
            series.data.forEach((point, index) => {
              const x = padding.left + index * xScale;
              const y = padding.top + chartHeight - (point.value * yScale);

              ctx.beginPath();
              const radius = hoveredPoint?.index === index && hoveredPoint?.seriesId === series.apiKeyId ? 5 : 3;
              ctx.arc(x, y, radius, 0, 2 * Math.PI);
              ctx.fill();
            });
          }
        });
      } else {
        // Draw single line for selected API key
        const series = chartSeries.find(s => s.apiKeyId === selectedApiKey);
        if (series) {
          ctx.strokeStyle = series.color;
          ctx.lineWidth = 2;
          ctx.beginPath();

          currentData.forEach((point, index) => {
            const x = padding.left + index * xScale;
            const y = padding.top + chartHeight - (point.value * yScale);

            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });

          ctx.stroke();

          // Draw points
          ctx.fillStyle = series.color;
          currentData.forEach((point, index) => {
            const x = padding.left + index * xScale;
            const y = padding.top + chartHeight - (point.value * yScale);

            ctx.beginPath();
            const radius = hoveredPoint?.index === index ? 5 : 3;
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      }
    }

    // Draw hover tooltip
    if (hoveredPoint) {
      let point: ChartDataPoint;
      let tooltipText: string;

      if (selectedApiKey === 'all' && hoveredPoint.seriesId) {
        // When showing all series, get the point from the specific series
        const series = chartSeries.find(s => s.apiKeyId === hoveredPoint.seriesId);
        if (series && series.data[hoveredPoint.index]) {
          point = series.data[hoveredPoint.index];
          const date = new Date(point.date);
          const dateStr = date.toLocaleDateString();
          tooltipText = `${dateStr} - ${series.apiKeyName}: ${point.value} requests`;
        } else {
          return; // Skip tooltip if data not found
        }
      } else {
        // When showing single series, use current data
        point = currentData[hoveredPoint.index];
        if (!point) return; // Skip tooltip if data not found
        const date = new Date(point.date);
        const dateStr = date.toLocaleDateString();
        tooltipText = `${dateStr}: ${point.value} requests`;
      }

      ctx.font = '12px system-ui';
      const textWidth = ctx.measureText(tooltipText).width;
      const tooltipWidth = textWidth + 16;
      const tooltipHeight = 28;

      let tooltipX = hoveredPoint.x - tooltipWidth / 2;
      let tooltipY = hoveredPoint.y - tooltipHeight - 10;

      // Keep tooltip within canvas bounds
      if (tooltipX < 5) tooltipX = 5;
      if (tooltipX + tooltipWidth > width - 5) tooltipX = width - tooltipWidth - 5;
      if (tooltipY < 5) tooltipY = hoveredPoint.y + 15;

      // Draw tooltip background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

      // Draw tooltip text
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tooltipText, tooltipX + tooltipWidth / 2, tooltipY + tooltipHeight / 2);
    }

    // Draw X-axis labels (show every 5 days)
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < currentData.length; i += 5) {
      const x = padding.left + i * xScale;
      const date = new Date(currentData[i].date);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      ctx.fillText(label, x, padding.top + chartHeight + 10);
    }

    // Chart title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('API Usage - Last 30 Days', padding.left, 5);

  }, [totalUsageData, chartSeries, selectedApiKey, hoveredPoint]);

  // Handle mouse events for hover
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentData = selectedApiKey === 'all' ? totalUsageData :
      chartSeries.find(s => s.apiKeyId === selectedApiKey)?.data || [];

    if (currentData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    const xScale = chartWidth / (currentData.length - 1);

    // Find the closest point
    let closestIndex = -1;
    let closestSeriesId: number | undefined;
    let minDistance = Infinity;

    if (selectedApiKey === 'all') {
      // When showing all series, find the closest point by both X and Y coordinates
      chartSeries.forEach((series) => {
        series.data.forEach((point, index) => {
          const x = padding.left + index * xScale;

          // Calculate max value for Y scaling
          const maxValue = Math.max(
            ...chartSeries.flatMap(s => s.data.map(d => d.value)),
            ...totalUsageData.map(d => d.value),
            1
          );
          const yScale = chartHeight / maxValue;
          const y = padding.top + chartHeight - (point.value * yScale);

          // Calculate distance from mouse to this point (both X and Y)
          const xDistance = Math.abs(mouseX - x);
          const yDistance = Math.abs(mouseY - y);
          const totalDistance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);

          if (totalDistance < minDistance && xDistance < 20 && yDistance < 20) { // 20px tolerance for both axes
            minDistance = totalDistance;
            closestIndex = index;
            closestSeriesId = series.apiKeyId;
          }
        });
      });
    } else {
      // When showing single series, find closest point in that series
      currentData.forEach((point, index) => {
        const x = padding.left + index * xScale;
        const maxValue = Math.max(...currentData.map(d => d.value), 1);
        const yScale = chartHeight / maxValue;
        const y = padding.top + chartHeight - (point.value * yScale);

        const xDistance = Math.abs(mouseX - x);
        const yDistance = Math.abs(mouseY - y);
        const totalDistance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);

        if (totalDistance < minDistance && xDistance < 20 && yDistance < 20) {
          minDistance = totalDistance;
          closestIndex = index;
        }
      });
    }

    if (closestIndex >= 0) {
      const x = padding.left + closestIndex * xScale;

      // Calculate y position based on the data point
      let dataValue = 0;
      if (selectedApiKey === 'all' && closestSeriesId) {
        const series = chartSeries.find(s => s.apiKeyId === closestSeriesId);
        dataValue = series?.data[closestIndex]?.value || 0;
      } else {
        dataValue = currentData[closestIndex]?.value || 0;
      }

      // Find max value for scaling
      let maxValue = 1;
      if (selectedApiKey === 'all') {
        maxValue = Math.max(
          ...chartSeries.flatMap(s => s.data.map(d => d.value)),
          ...totalUsageData.map(d => d.value),
          1
        );
      } else {
        maxValue = Math.max(...currentData.map(d => d.value), 1);
      }

      const yScale = chartHeight / maxValue;
      const y = padding.top + chartHeight - (dataValue * yScale);

      setHoveredPoint({ index: closestIndex, x, y, seriesId: closestSeriesId });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Calculate statistics based on current view
  const currentData = selectedApiKey === 'all' ? totalUsageData :
    chartSeries.find(s => s.apiKeyId === selectedApiKey)?.data || [];

  const totalRequests = currentData.reduce((sum, point) => sum + point.value, 0);
  const avgDaily = Math.round(totalRequests / 30);
  const maxDaily = Math.max(...currentData.map(d => d.value));

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">API Usage Analytics</h2>
          {onViewHistory && (
            <button
              className="btn btn-sm btn-outline"
              onClick={onViewHistory}
            >
              View Full History
            </button>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Total (30d)</div>
            <div className="stat-value text-lg text-primary">{totalRequests}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Daily Avg</div>
            <div className="stat-value text-lg text-secondary">{avgDaily}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Peak Day</div>
            <div className="stat-value text-lg text-accent">{maxDaily}</div>
          </div>
        </div>

        {/* API Key Filter */}
        {apiKeys.length > 1 && (
          <div className="mb-4">
            <label className="label">
              <span className="label-text">Filter by API Key:</span>
            </label>
            <select
              className="select select-bordered select-sm w-full max-w-xs"
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

        {/* Legend - only show when displaying all API keys */}
        {selectedApiKey === 'all' && apiKeys.length > 1 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Legend:</div>
            <div className="flex flex-wrap gap-4">
              {chartSeries.map((series) => (
                <div key={series.apiKeyId} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: series.color }}
                  ></div>
                  <span className="text-sm">{series.apiKeyName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-64 border border-base-300 rounded-lg cursor-crosshair"
            style={{ maxWidth: '100%' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
          {currentData.every(d => d.value === 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-base-content/50">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>No API usage data yet</p>
                <p className="text-sm">Start making API calls to see your usage analytics</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-base-content/60 mt-2">
          Showing API usage for the last 30 days. Data updates daily.
        </div>
      </div>
    </div>
  );
};

export default ApiUsageChart;
