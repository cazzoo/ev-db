import React, { useState } from 'react';
import { PencilIcon, TrashIcon, PlayIcon } from '@heroicons/react/24/outline';
import {
  WebhookConfiguration,
  webhookService,
  formatWebhookDate,
  calculateSuccessRate,
  getEventTypeLabel
} from '../../services/webhookService';

interface WebhookListProps {
  webhooks: WebhookConfiguration[];
  onEdit: (webhook: WebhookConfiguration) => void;
  onDelete: (id: number) => void;
}

const WebhookList: React.FC<WebhookListProps> = ({ webhooks, onEdit, onDelete }) => {
  const [testingWebhook, setTestingWebhook] = useState<number | null>(null);

  const handleTestWebhook = async (id: number): Promise<void> => {
    try {
      setTestingWebhook(id);
      const result = await webhookService.testWebhook(id);

      if (result.success) {
        alert('Webhook test successful!');
      } else {
        alert(`Webhook test failed: ${result.error}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to test webhook');
    } finally {
      setTestingWebhook(null);
    }
  };

  const renderWebhookCard = (webhook: WebhookConfiguration) => (
    <div key={webhook.id} className="card bg-base-200 border border-base-300">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <WebhookHeader webhook={webhook} />
            <WebhookDescription webhook={webhook} />
            <WebhookUrl webhook={webhook} />
            <WebhookStats webhook={webhook} />
            <WebhookEvents webhook={webhook} />
          </div>
          <WebhookActions
            webhook={webhook}
            isTestingWebhook={testingWebhook === webhook.id}
            onTest={() => handleTestWebhook(webhook.id)}
            onEdit={() => onEdit(webhook)}
            onDelete={() => onDelete(webhook.id)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {webhooks.map(renderWebhookCard)}
    </div>
  );
};

interface WebhookHeaderProps {
  webhook: WebhookConfiguration;
}

const WebhookHeader: React.FC<WebhookHeaderProps> = ({ webhook }) => (
  <div className="flex items-center gap-3 mb-2">
    <h4 className="font-semibold">{webhook.name}</h4>
    <div className={`badge badge-sm ${webhook.isEnabled ? 'badge-success' : 'badge-error'}`}>
      {webhook.isEnabled ? 'Enabled' : 'Disabled'}
    </div>
    <div className="badge badge-sm badge-outline">{webhook.method}</div>
    <div className="badge badge-sm badge-outline">{webhook.authType}</div>
  </div>
);

interface WebhookDescriptionProps {
  webhook: WebhookConfiguration;
}

const WebhookDescription: React.FC<WebhookDescriptionProps> = ({ webhook }) => {
  if (!webhook.description) return null;

  return (
    <p className="text-sm text-base-content/70 mb-2">{webhook.description}</p>
  );
};

interface WebhookUrlProps {
  webhook: WebhookConfiguration;
}

const WebhookUrl: React.FC<WebhookUrlProps> = ({ webhook }) => (
  <div className="font-mono bg-base-300 px-2 py-1 rounded text-xs mb-2">
    {webhook.url}
  </div>
);

interface WebhookStatsProps {
  webhook: WebhookConfiguration;
}

const WebhookStats: React.FC<WebhookStatsProps> = ({ webhook }) => (
  <div className="text-xs text-base-content/60 mb-2">
    <div className="flex flex-wrap gap-2">
      <span>Events: {webhook.enabledEvents.length}</span>
      <span>•</span>
      <span>Success Rate: {calculateSuccessRate(webhook)}</span>
      <span>•</span>
      <span>Total Calls: {webhook.successCount + webhook.failureCount}</span>
      {webhook.lastTriggered && (
        <>
          <span>•</span>
          <span>Last: {formatWebhookDate(webhook.lastTriggered)}</span>
        </>
      )}
    </div>
  </div>
);

interface WebhookEventsProps {
  webhook: WebhookConfiguration;
}

const WebhookEvents: React.FC<WebhookEventsProps> = ({ webhook }) => (
  <div className="flex flex-wrap gap-1">
    {webhook.enabledEvents.map((event: string) => (
      <span key={event} className="badge badge-xs badge-outline">
        {getEventTypeLabel(event)}
      </span>
    ))}
  </div>
);

interface WebhookActionsProps {
  webhook: WebhookConfiguration;
  isTestingWebhook: boolean;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const WebhookActions: React.FC<WebhookActionsProps> = ({
  isTestingWebhook,
  onTest,
  onEdit,
  onDelete,
}) => (
  <div className="flex gap-1">
    <button
      onClick={onTest}
      disabled={isTestingWebhook}
      className="btn btn-ghost btn-xs"
      title="Test webhook"
    >
      {isTestingWebhook ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <PlayIcon className="h-3 w-3" />
      )}
    </button>
    <button
      onClick={onEdit}
      className="btn btn-ghost btn-xs"
      title="Edit webhook"
    >
      <PencilIcon className="h-3 w-3" />
    </button>
    <button
      onClick={onDelete}
      className="btn btn-ghost btn-xs text-error"
      title="Delete webhook"
    >
      <TrashIcon className="h-3 w-3" />
    </button>
  </div>
);

export default WebhookList;
