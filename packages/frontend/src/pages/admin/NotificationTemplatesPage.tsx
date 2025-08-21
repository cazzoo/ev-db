import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTemplates,
  createTemplate,
  NotificationTemplate,
  CreateTemplateRequest,
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES
} from '../../services/adminNotificationApi';

const NotificationTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: '',
    description: '',
    eventType: '',
    title: '',
    content: '',
    notificationType: 'info',
    category: 'system',
    variables: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getTemplates();
      setTemplates(result.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateTemplateRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleVariableChange = (variables: string) => {
    const variableArray = variables.split(',').map(v => v.trim()).filter(v => v);
    handleInputChange('variables', variableArray);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Template name is required');
      return false;
    }
    if (!formData.eventType.trim()) {
      setError('Event type is required');
      return false;
    }
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.content.trim()) {
      setError('Content is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const result = await createTemplate(formData);
      setSuccess(`Template created successfully! ID: ${result.templateId}`);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        eventType: '',
        title: '',
        content: '',
        notificationType: 'info',
        category: 'system',
        variables: [],
      });
      setShowCreateForm(false);
      
      // Reload templates
      await loadTemplates();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationTypeColor = (type: string) => {
    const notificationType = NOTIFICATION_TYPES.find(t => t.value === type);
    return notificationType?.color || 'text-base-content';
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'system': return 'badge-primary';
      case 'contribution': return 'badge-success';
      case 'user': return 'badge-info';
      case 'admin': return 'badge-warning';
      case 'changelog': return 'badge-accent';
      case 'maintenance': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Notification Templates</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/notifications')}
            className="btn btn-ghost btn-sm"
          >
            ← Back to Management
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary btn-sm"
          >
            ➕ Create Template
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-xs">✕</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="btn btn-ghost btn-xs">✕</button>
        </div>
      )}

      {/* Create Template Form */}
      {showCreateForm && (
        <div className="card bg-base-100 shadow-sm border border-base-200 mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">Create New Template</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Template Name *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Welcome Message"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Event Type *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={formData.eventType}
                    onChange={(e) => handleInputChange('eventType', e.target.value)}
                    placeholder="e.g., user.welcome"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Type</span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={formData.notificationType}
                    onChange={(e) => handleInputChange('notificationType', e.target.value)}
                  >
                    {NOTIFICATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Category</span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    {NOTIFICATION_CATEGORIES.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Description</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of this template"
                  maxLength={500}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Title *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Notification title template"
                  maxLength={200}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Content *</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-24"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Notification content template"
                  maxLength={2000}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Variables</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={formData.variables?.join(', ') || ''}
                  onChange={(e) => handleVariableChange(e.target.value)}
                  placeholder="userName, credits, actionUrl (comma-separated)"
                />
                <div className="label">
                  <span className="label-text-alt">Available variables for template substitution</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    'Create Template'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : templates.length === 0 ? (
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">No Templates</h3>
            <p className="text-base-content/60">
              Create your first notification template to get started.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary mt-4"
            >
              Create Template
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{template.name}</h3>
                      <div className={`badge ${getCategoryBadgeClass(template.category)}`}>
                        {template.category}
                      </div>
                      <div className={`badge badge-outline ${getNotificationTypeColor(template.notificationType)}`}>
                        {template.notificationType}
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-base-content/70 mb-2">
                        {template.description}
                      </p>
                    )}
                    <div className="text-sm mb-2">
                      <span className="font-medium">Event:</span> {template.eventType}
                    </div>
                    <div className="text-sm mb-2">
                      <span className="font-medium">Title:</span> {template.title}
                    </div>
                    <div className="text-sm mb-3">
                      <span className="font-medium">Content:</span> 
                      <span className="text-base-content/70 line-clamp-2 ml-1">
                        {template.content}
                      </span>
                    </div>
                    {template.variables && template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-xs font-medium">Variables:</span>
                        {JSON.parse(template.variables as any).map((variable: string) => (
                          <span key={variable} className="badge badge-ghost badge-xs">
                            {variable}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-base-content/60">
                      Created: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationTemplatesPage;
