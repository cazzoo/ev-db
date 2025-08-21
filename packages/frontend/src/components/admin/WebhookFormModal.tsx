import React, { useState } from 'react';
import {
  WebhookConfiguration,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  webhookService,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_AUTH_TYPES,
  WEBHOOK_HTTP_METHODS
} from '../../services/webhookService';
import {
  WEBHOOK_TEMPLATES,
  getTemplateById,
  validateWebhookUrl
} from '../../services/webhookTemplates';

interface WebhookFormModalProps {
  webhook?: WebhookConfiguration | null;
  onClose: () => void;
  onSave: () => void;
}

interface WebhookFormData {
  name: string;
  description: string;
  url: string;
  method: string;
  contentType: string;
  authType: string;
  authToken: string;
  authUsername: string;
  authPassword: string;
  authHeaderName: string;
  secret: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enabledEvents: string[];
  isEnabled: boolean;
  customHeaders?: Record<string, string>;
  payloadTemplate?: string;
}

const WebhookFormModal: React.FC<WebhookFormModalProps> = ({
  webhook,
  onClose,
  onSave,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(webhook ? 'custom' : '');
  const [formData, setFormData] = useState<WebhookFormData>({
    name: webhook?.name || '',
    description: webhook?.description || '',
    url: webhook?.url || '',
    method: webhook?.method || 'POST',
    contentType: webhook?.contentType || 'application/json',
    authType: webhook?.authType || 'none',
    authToken: webhook?.authToken || '',
    authUsername: webhook?.authUsername || '',
    authPassword: webhook?.authPassword || '',
    authHeaderName: webhook?.authHeaderName || '',
    secret: webhook?.secret || '',
    timeout: webhook?.timeout || 30,
    retryAttempts: webhook?.retryAttempts || 3,
    retryDelay: webhook?.retryDelay || 5,
    enabledEvents: webhook?.enabledEvents || [],
    isEnabled: webhook?.isEnabled !== false,
    customHeaders: webhook?.customHeaders ? JSON.parse(webhook.customHeaders as string) : undefined,
    payloadTemplate: webhook?.payloadTemplate || undefined,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; message?: string } | null>(null);

  const isEditMode = Boolean(webhook);

  // Template application logic
  const applyTemplate = (templateId: string, resetAll = false) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    setFormData(prev => ({
      name: resetAll ? template.name : (prev.name || template.name),
      description: resetAll ? '' : prev.description,
      url: resetAll ? '' : prev.url,
      method: template.config.method,
      contentType: template.config.contentType,
      authType: template.config.authType,
      authToken: template.config.authToken || '',
      authUsername: template.config.authUsername || '',
      authPassword: template.config.authPassword || '',
      authHeaderName: template.config.authHeaderName || '',
      secret: resetAll ? '' : prev.secret,
      timeout: template.config.timeout,
      retryAttempts: template.config.retryAttempts,
      retryDelay: template.config.retryDelay,
      enabledEvents: template.defaultEvents,
      customHeaders: template.config.customHeaders,
      payloadTemplate: template.config.payloadTemplate,
      isEnabled: resetAll ? true : prev.isEnabled,
    }));
  };

  // Reset to template defaults (for reset button)
  const resetToTemplateDefaults = () => {
    if (!selectedTemplate) return;

    const template = getTemplateById(selectedTemplate);
    if (!template) return;

    setFormData(prev => ({
      ...prev,
      method: template.config.method,
      contentType: template.config.contentType,
      authType: template.config.authType,
      authToken: template.config.authToken || '',
      authUsername: template.config.authUsername || '',
      authPassword: template.config.authPassword || '',
      authHeaderName: template.config.authHeaderName || '',
      timeout: template.config.timeout,
      retryAttempts: template.config.retryAttempts,
      retryDelay: template.config.retryDelay,
      enabledEvents: template.defaultEvents,
      customHeaders: template.config.customHeaders,
      payloadTemplate: template.config.payloadTemplate,
    }));

    // Clear validation states
    setError(null);
    setTestResult(null);
    setUrlValidation(null);
  };

  const handleTemplateChange = (templateId: string) => {
    if (selectedTemplate && (formData.name || formData.url || formData.description)) {
      if (!confirm('Changing template will reset your current configuration. Continue?')) {
        return;
      }
    }

    setSelectedTemplate(templateId);
    if (templateId !== 'custom' && templateId !== '') {
      applyTemplate(templateId, true); // Reset all fields when switching templates
    } else if (templateId === 'custom') {
      // Reset to default values for custom template
      setFormData({
        name: '',
        description: '',
        url: '',
        method: 'POST',
        contentType: 'application/json',
        authType: 'none',
        authToken: '',
        authUsername: '',
        authPassword: '',
        authHeaderName: '',
        secret: '',
        timeout: 30,
        retryAttempts: 3,
        retryDelay: 5,
        enabledEvents: [],
        customHeaders: undefined,
        payloadTemplate: undefined,
        isEnabled: true,
      });
    }
    setError(null);
    setTestResult(null);
    setUrlValidation(null);
  };

  const handleUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, url }));

    // Real-time URL validation
    if (url && selectedTemplate) {
      const validation = validateWebhookUrl(url, selectedTemplate);
      setUrlValidation(validation);
    } else {
      setUrlValidation(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name || !formData.url || formData.enabledEvents.length === 0) {
      setError('Name, URL, and at least one event are required');
      return false;
    }

    // Template-specific URL validation
    if (selectedTemplate) {
      const urlValidation = validateWebhookUrl(formData.url, selectedTemplate);
      if (!urlValidation.isValid) {
        setError(urlValidation.message || 'Invalid URL format');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Prepare data with proper serialization
      const submitData = {
        ...formData,
        customHeaders: formData.customHeaders ? JSON.stringify(formData.customHeaders) : undefined,
      };

      if (isEditMode && webhook) {
        const updateData: UpdateWebhookRequest = { ...submitData, id: webhook.id };
        await webhookService.updateWebhook(updateData);
      } else {
        const createData: CreateWebhookRequest = submitData;
        await webhookService.createWebhook(createData);
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save webhook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEventToggle = (eventValue: string) => {
    setFormData(prev => ({
      ...prev,
      enabledEvents: prev.enabledEvents.includes(eventValue)
        ? prev.enabledEvents.filter(e => e !== eventValue)
        : [...prev.enabledEvents, eventValue]
    }));
  };

  const handleTestConnection = async () => {
    if (!formData.url) {
      setTestResult({ success: false, message: 'URL is required for testing' });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      setError(null);

      // Include template information in test data
      const testData = {
        ...formData,
        templateId: selectedTemplate,
        customHeaders: formData.customHeaders ? JSON.stringify(formData.customHeaders) : undefined,
      };

      const result = await webhookService.testWebhookConfig(testData);

      if (result.success) {
        setTestResult({
          success: true,
          message: `Connection successful! ${selectedTemplate !== 'custom' ? `${getTemplateById(selectedTemplate)?.name} format used.` : ''}`
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Connection failed'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to test connection'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          {isEditMode ? 'Edit Webhook' : 'Create New Webhook'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {/* Template Selection */}
          {!isEditMode && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Choose a Template</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">Select a template...</option>
                {WEBHOOK_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.icon} {template.name} - {template.description}
                  </option>
                ))}
              </select>
              {selectedTemplate && selectedTemplate !== 'custom' && (
                <div className="mt-2 p-3 bg-base-200 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-info">ℹ️</span>
                      <div className="text-sm">
                        <p className="font-medium">
                          {getTemplateById(selectedTemplate)?.name} Template Selected
                        </p>
                        <p className="text-base-content/70 mt-1">
                          {getTemplateById(selectedTemplate)?.documentation}
                        </p>
                        <p className="text-xs text-base-content/60 mt-1">
                          URL format: {getTemplateById(selectedTemplate)?.urlExample}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={resetToTemplateDefaults}
                      title="Reset to template defaults"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Name *</span>
              </label>
              <input
                type="text"
                className="input input-bordered input-sm"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Webhook"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Method</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={formData.method}
                onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
              >
                {WEBHOOK_HTTP_METHODS.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered textarea-sm"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">URL *</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                className={`input input-bordered input-sm flex-1 ${
                  urlValidation && !urlValidation.isValid ? 'input-error' : ''
                }`}
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={selectedTemplate && selectedTemplate !== 'custom'
                  ? getTemplateById(selectedTemplate)?.urlExample
                  : "https://example.com/webhook"
                }
                required
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleTestConnection}
                disabled={isTesting || !formData.url}
              >
                {isTesting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Test Connection'
                )}
              </button>
            </div>
            {urlValidation && !urlValidation.isValid && (
              <div className="alert alert-warning mt-2">
                <span className="text-sm">{urlValidation.message}</span>
              </div>
            )}
            {testResult && (
              <div className={`alert mt-2 ${testResult.success ? 'alert-success' : 'alert-error'}`}>
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Authentication */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Authentication</span>
              {selectedTemplate && ['discord', 'teams', 'slack'].includes(selectedTemplate) && (
                <span className="label-text-alt text-info">No auth needed for {getTemplateById(selectedTemplate)?.name}</span>
              )}
            </label>
            <select
              className="select select-bordered select-sm"
              value={formData.authType}
              onChange={(e) => setFormData(prev => ({ ...prev, authType: e.target.value }))}
            >
              {WEBHOOK_AUTH_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {formData.authType === 'bearer' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Bearer Token</span>
              </label>
              <input
                type="password"
                className="input input-bordered input-sm"
                value={formData.authToken}
                onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
                placeholder="Bearer token"
              />
            </div>
          )}

          {formData.authType === 'basic' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Username</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={formData.authUsername}
                  onChange={(e) => setFormData(prev => ({ ...prev, authUsername: e.target.value }))}
                  placeholder="Username"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered input-sm"
                  value={formData.authPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, authPassword: e.target.value }))}
                  placeholder="Password"
                />
              </div>
            </div>
          )}

          {formData.authType === 'api_key' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Header Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={formData.authHeaderName}
                  onChange={(e) => setFormData(prev => ({ ...prev, authHeaderName: e.target.value }))}
                  placeholder="X-API-Key"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">API Key</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered input-sm"
                  value={formData.authToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
                  placeholder="API key value"
                />
              </div>
            </div>
          )}

          {/* Events */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Enabled Events *</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENT_TYPES.map(event => (
                <label key={event.value} className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={formData.enabledEvents.includes(event.value)}
                    onChange={() => handleEventToggle(event.value)}
                  />
                  <span className="label-text text-sm">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Timeout (s)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm"
                value={formData.timeout}
                onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                min="1"
                max="300"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Retry Attempts</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm"
                value={formData.retryAttempts}
                onChange={(e) => setFormData(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) || 3 }))}
                min="0"
                max="10"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Retry Delay (s)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm"
                value={formData.retryDelay}
                onChange={(e) => setFormData(prev => ({ ...prev, retryDelay: parseInt(e.target.value) || 5 }))}
                min="1"
                max="60"
              />
            </div>
          </div>

          {/* Payload Template (Advanced) */}
          {(selectedTemplate === 'custom' || formData.payloadTemplate) && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Payload Template (Advanced)</span>
                <span className="label-text-alt">Use variables: {'{'}{'{'} event {'}'}{'}'},  {'{'}{'{'} timestamp {'}'}{'}'},  {'{'}{'{'} data {'}'}{'}'}  </span>
              </label>
              <textarea
                className="textarea textarea-bordered textarea-sm font-mono text-xs"
                value={formData.payloadTemplate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, payloadTemplate: e.target.value }))}
                placeholder="Custom JSON payload template..."
                rows={6}
              />
              <div className="label">
                <span className="label-text-alt text-xs">
                  Leave empty to use default payload format
                </span>
              </div>
            </div>
          )}

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                className="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
              />
              <span className="label-text">Enable webhook</span>
            </label>
          </div>

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                isEditMode ? 'Update Webhook' : 'Create Webhook'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WebhookFormModal;
