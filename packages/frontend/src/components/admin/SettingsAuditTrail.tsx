import { useState, useEffect } from 'react';
import { fetchSettingAuditTrail, AdminSettingAudit } from '../../services/api';
import {
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SettingsAuditTrailProps {
  settingId: number;
  settingName: string;
  isOpen: boolean;
  onClose: () => void;
}

const SettingsAuditTrail = ({ settingId, settingName, isOpen, onClose }: SettingsAuditTrailProps) => {
  const [auditTrail, setAuditTrail] = useState<AdminSettingAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && settingId) {
      loadAuditTrail();
    }
  }, [isOpen, settingId]);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSettingAuditTrail(settingId, 50);
      setAuditTrail(data.auditTrail);
    } catch (err) {
      setError((err as Error).message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'badge-success';
      case 'UPDATE':
        return 'badge-warning';
      case 'DELETE':
        return 'badge-error';
      case 'ACTIVATE':
        return 'badge-info';
      case 'DEACTIVATE':
        return 'badge-neutral';
      default:
        return 'badge-ghost';
    }
  };

  const truncateValue = (value: string | null, maxLength = 50) => {
    if (!value) return 'null';
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">
            Audit Trail: {settingName}
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {auditTrail.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">
                No audit records found for this setting
              </div>
            ) : (
              auditTrail.map((record) => (
                <div key={record.id} className="card bg-base-200 shadow-sm">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`badge ${getActionBadgeClass(record.action)}`}>
                          {record.action}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-base-content/60">
                          <ClockIcon className="h-4 w-4" />
                          {formatDate(record.changedAt)}
                        </div>
                      </div>
                      <div className="text-sm text-base-content/60">
                        ID: {record.id}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Old Value */}
                      <div>
                        <div className="text-sm font-medium text-base-content/80 mb-1">
                          Previous Value
                        </div>
                        <div className="bg-base-100 p-2 rounded text-sm font-mono">
                          {record.oldValue ? (
                            <span className="text-error">
                              {truncateValue(record.oldValue)}
                            </span>
                          ) : (
                            <span className="text-base-content/40">null</span>
                          )}
                        </div>
                      </div>

                      {/* New Value */}
                      <div>
                        <div className="text-sm font-medium text-base-content/80 mb-1">
                          New Value
                        </div>
                        <div className="bg-base-100 p-2 rounded text-sm font-mono">
                          {record.newValue ? (
                            <span className="text-success">
                              {truncateValue(record.newValue)}
                            </span>
                          ) : (
                            <span className="text-base-content/40">null</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* User and System Info */}
                    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-base-300">
                      <div className="flex items-center gap-1 text-sm text-base-content/60">
                        <UserIcon className="h-4 w-4" />
                        {record.changedByEmail || 'Unknown User'}
                      </div>
                      
                      {record.ipAddress && (
                        <div className="flex items-center gap-1 text-sm text-base-content/60">
                          <ComputerDesktopIcon className="h-4 w-4" />
                          {record.ipAddress}
                        </div>
                      )}
                      
                      {record.userAgent && (
                        <div className="flex items-center gap-1 text-sm text-base-content/60 max-w-xs">
                          <EyeIcon className="h-4 w-4" />
                          <span className="truncate" title={record.userAgent}>
                            {record.userAgent}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsAuditTrail;
