import React, { useState, useEffect } from 'react';
import { PlusIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { webhookService, WebhookConfiguration } from '../../services/webhookService';
import WebhookList from './WebhookList';
import WebhookFormModal from './WebhookFormModal';

interface WebhookManagementProps {
  className?: string;
}

const WebhookManagement: React.FC<WebhookManagementProps> = ({ className = '' }) => {
  const [webhooks, setWebhooks] = useState<WebhookConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfiguration | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await webhookService.getAllWebhooks();
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWebhook = (): void => {
    setShowCreateModal(true);
  };

  const handleEditWebhook = (webhook: WebhookConfiguration): void => {
    setEditingWebhook(webhook);
  };

  const handleDeleteWebhook = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await webhookService.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  const handleCloseModal = (): void => {
    setShowCreateModal(false);
    setEditingWebhook(null);
  };

  const handleWebhookSaved = (): void => {
    handleCloseModal();
    loadWebhooks();
  };

  const renderLoadingState = () => (
    <div className="flex justify-center items-center py-12">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  );

  const renderErrorState = () => (
    <div className="alert alert-error">
      <span>{error}</span>
      <button onClick={loadWebhooks} className="btn btn-ghost btn-sm">
        Try again
      </button>
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <GlobeAltIcon className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
      <h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
      <p className="text-base-content/60 mb-4">
        Create your first webhook to start receiving notifications
      </p>
      <button onClick={handleCreateWebhook} className="btn btn-primary">
        <PlusIcon className="h-5 w-5" />
        Create First Webhook
      </button>
    </div>
  );

  const renderContent = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderErrorState();
    if (webhooks.length === 0) return renderEmptyState();

    return (
      <WebhookList
        webhooks={webhooks}
        onEdit={handleEditWebhook}
        onDelete={handleDeleteWebhook}
      />
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-base-content/60">
            Create and manage custom webhooks for different notification targets
          </p>
        </div>
        {webhooks.length > 0 && (
          <button onClick={handleCreateWebhook} className="btn btn-primary btn-sm">
            <PlusIcon className="h-4 w-4" />
            Create Webhook
          </button>
        )}
      </div>

      {/* Content */}
      {renderContent()}

      {/* Modal */}
      {(showCreateModal || editingWebhook) && (
        <WebhookFormModal
          webhook={editingWebhook}
          onClose={handleCloseModal}
          onSave={handleWebhookSaved}
        />
      )}
    </div>
  );
};

export default WebhookManagement;
