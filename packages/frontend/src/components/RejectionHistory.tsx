import { useEffect, useState } from 'react';
import { fetchModerationLogs, ModerationLog } from '../services/api';

interface Props {
  contributionId: number;
}

export default function RejectionHistory({ contributionId }: Props) {
  const [logs, setLogs] = useState<ModerationLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchModerationLogs(contributionId);
        if (isMounted) setLogs(data);
      } catch (e) {
        if (isMounted) setError((e as Error).message || 'Failed to load rejection history');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [contributionId]);

  if (loading) {
    return (
      <div className="mt-4">
        <div className="skeleton h-6 w-48 mb-2" />
        <div className="skeleton h-4 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="alert alert-error mt-4">
        <span>{error}</span>
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-2">Rejection history</h4>
      <ul className="space-y-2">
        {logs.map((log) => (
          <li key={log.id} className="p-3 rounded-lg bg-base-200">
            <div className="text-sm text-error mb-1">
              {log.comment || 'No reason provided'}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(log.createdAt).toLocaleString()} · by {log.moderatorEmail || `User #${log.moderatorId}`}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

