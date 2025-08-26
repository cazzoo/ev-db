import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChangelog, CreateChangelogRequest } from '../../services/changelogApi';

interface ChangelogEntry {
  category: 'feature' | 'bugfix' | 'improvement' | 'breaking' | 'security' | 'deprecated';
  title: string;
  description: string;
  sortOrder?: number;
}

const CreateChangelogPage: React.FC = () => {
  const [formData, setFormData] = useState<CreateChangelogRequest>({
    version: '',
    title: '',
    description: '',
    releaseDate: new Date().toISOString().slice(0, 16), // Format for datetime-local input
    entries: [],
    isPublished: false,
    sendNotification: false,
  });

  const [currentEntry, setCurrentEntry] = useState<ChangelogEntry>({
    category: 'feature',
    title: '',
    description: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const categoryOptions = [
    { value: 'feature', label: '✨ Feature', color: 'badge-success' },
    { value: 'improvement', label: '⚡ Improvement', color: 'badge-info' },
    { value: 'bugfix', label: '🐛 Bug Fix', color: 'badge-warning' },
    { value: 'security', label: '🔒 Security', color: 'badge-error' },
    { value: 'breaking', label: '💥 Breaking Change', color: 'badge-error' },
    { value: 'deprecated', label: '⚠️ Deprecated', color: 'badge-neutral' },
  ];

  const getCategoryInfo = (category: string) => {
    return categoryOptions.find(opt => opt.value === category) || categoryOptions[0];
  };

  const handleInputChange = (field: keyof CreateChangelogRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEntryChange = (field: keyof ChangelogEntry, value: any) => {
    setCurrentEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEntry = () => {
    if (!currentEntry.title.trim() || !currentEntry.description.trim()) {
      setError('Entry title and description are required');
      return;
    }

    const newEntry = {
      ...currentEntry,
      sortOrder: formData.entries.length + 1,
    };

    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry]
    }));

    setCurrentEntry({
      category: 'feature',
      title: '',
      description: '',
    });

    setError(null);
  };

  const removeEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const moveEntry = (index: number, direction: 'up' | 'down') => {
    const newEntries = [...formData.entries];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newEntries.length) return;

    [newEntries[index], newEntries[targetIndex]] = [newEntries[targetIndex], newEntries[index]];

    // Update sort orders
    newEntries.forEach((entry, i) => {
      entry.sortOrder = i + 1;
    });

    setFormData(prev => ({
      ...prev,
      entries: newEntries
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.version.trim() || !formData.title.trim()) {
      setError('Version and title are required');
      return;
    }

    if (formData.entries.length === 0) {
      setError('At least one changelog entry is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const changelogData = {
        ...formData,
        releaseDate: new Date(formData.releaseDate).toISOString(),
      };

      await createChangelog(changelogData);
      setSuccess('Changelog created successfully!');

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/changelogs');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create changelog');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Create New Changelog</h1>
        <button
          onClick={() => navigate('/admin/changelogs')}
          className="btn btn-ghost btn-sm"
        >
          ← Back to Changelogs
        </button>
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
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Version *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2.1.0"
                  className="input input-bordered"
                  value={formData.version}
                  onChange={(e) => handleInputChange('version', e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Release Date *</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-bordered"
                  value={formData.releaseDate}
                  onChange={(e) => handleInputChange('releaseDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Title *</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Enhanced Notification System"
                className="input input-bordered"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Description</span>
              </label>
              <textarea
                placeholder="Brief description of this release..."
                className="textarea textarea-bordered h-24"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.isPublished}
                    onChange={(e) => handleInputChange('isPublished', e.target.checked)}
                  />
                  <span className="label-text ml-2">Publish immediately</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.sendNotification}
                    onChange={(e) => handleInputChange('sendNotification', e.target.checked)}
                  />
                  <span className="label-text ml-2">Send notification to users</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Add Entry Section */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Add Changelog Entry</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Category</span>
                </label>
                <select
                  className="select select-bordered"
                  value={currentEntry.category}
                  onChange={(e) => handleEntryChange('category', e.target.value)}
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text font-medium">Title</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., In-App Notification System"
                  className="input input-bordered"
                  value={currentEntry.title}
                  onChange={(e) => handleEntryChange('title', e.target.value)}
                />
              </div>
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Description</span>
              </label>
              <textarea
                placeholder="Detailed description of this change..."
                className="textarea textarea-bordered h-20"
                value={currentEntry.description}
                onChange={(e) => handleEntryChange('description', e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={addEntry}
              className="btn btn-outline btn-sm"
              disabled={!currentEntry.title.trim() || !currentEntry.description.trim()}
            >
              ➕ Add Entry
            </button>
          </div>
        </div>

        {/* Entries List */}
        {formData.entries.length > 0 && (
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-lg mb-4">
                Changelog Entries ({formData.entries.length})
              </h2>

              <div className="space-y-3">
                {formData.entries.map((entry, index) => {
                  const categoryInfo = getCategoryInfo(entry.category);
                  return (
                    <div key={index} className="border border-base-300 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`badge ${categoryInfo.color} badge-sm`}>
                              {categoryInfo.label}
                            </div>
                            <span className="text-sm text-base-content/60">#{index + 1}</span>
                          </div>
                          <h4 className="font-medium mb-1">{entry.title}</h4>
                          <p className="text-sm text-base-content/70 whitespace-pre-wrap">{entry.description}</p>
                        </div>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveEntry(index, 'up')}
                            disabled={index === 0}
                            className="btn btn-ghost btn-xs"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveEntry(index, 'down')}
                            disabled={index === formData.entries.length - 1}
                            className="btn btn-ghost btn-xs"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEntry(index)}
                            className="btn btn-ghost btn-xs text-error"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/changelogs')}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || formData.entries.length === 0}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Creating...
              </>
            ) : (
              'Create Changelog'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateChangelogPage;
