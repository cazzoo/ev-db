import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllChangelogs,
  deleteChangelog,
  updateChangelog,
  Changelog,
  getCategoryInfo,
  formatReleaseDate,
  sortEntriesByCategory
} from '../../services/changelogApi';

const ChangelogManagementPage: React.FC = () => {
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadChangelogs();
  }, []);

  const loadChangelogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getAllChangelogs();
      setChangelogs(result.changelogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load changelogs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, version: string) => {
    if (!confirm(`Are you sure you want to delete changelog ${version}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteChangelog(id);
      setSuccess(`Changelog ${version} deleted successfully`);
      await loadChangelogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete changelog');
    }
  };

  const handleTogglePublish = async (changelog: Changelog) => {
    const action = changelog.isPublished ? 'unpublish' : 'publish';
    if (!confirm(`Are you sure you want to ${action} changelog ${changelog.version}?`)) {
      return;
    }

    try {
      await updateChangelog(changelog.id, { isPublished: !changelog.isPublished });
      setSuccess(`Changelog ${changelog.version} ${action}ed successfully`);
      await loadChangelogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} changelog`);
    }
  };

  const getStatusBadge = (changelog: Changelog) => {
    if (changelog.isPublished) {
      return <div className="badge badge-success">Published</div>;
    }
    return <div className="badge badge-warning">Draft</div>;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Changelog Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="btn btn-ghost btn-sm"
          >
            ← Back to Admin
          </button>
          <button
            onClick={() => navigate('/admin/changelogs/create')}
            className="btn btn-primary btn-sm"
          >
            ➕ Create Changelog
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : changelogs.length === 0 ? (
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">No Changelogs</h3>
            <p className="text-base-content/60">
              Create your first changelog to get started.
            </p>
            <button
              onClick={() => navigate('/admin/changelogs/create')}
              className="btn btn-primary mt-4"
            >
              Create Changelog
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {changelogs.map((changelog) => (
            <div key={changelog.id} className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold">v{changelog.version}</h2>
                      {getStatusBadge(changelog)}
                      {changelog.notificationSent && (
                        <div className="badge badge-info">📧 Notified</div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{changelog.title}</h3>
                    {changelog.description && (
                      <p className="text-base-content/70 mb-3">{changelog.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-base-content/60 mb-4">
                      <span>📅 {formatReleaseDate(changelog.releaseDate)}</span>
                      {changelog.author && (
                        <span>👤 {changelog.author.name || changelog.author.email}</span>
                      )}
                      <span>📝 {changelog.entries.length} entries</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/admin/changelogs/${changelog.id}/edit`)}
                      className="btn btn-ghost btn-sm"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleTogglePublish(changelog)}
                      className={`btn btn-sm ${changelog.isPublished ? 'btn-warning' : 'btn-success'}`}
                    >
                      {changelog.isPublished ? '📤 Unpublish' : '📢 Publish'}
                    </button>
                    <button
                      onClick={() => handleDelete(changelog.id, changelog.version)}
                      className="btn btn-ghost btn-sm text-error"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Changelog Entries */}
                {changelog.entries.length > 0 && (
                  <div className="border-t border-base-200 pt-4">
                    <h4 className="font-semibold mb-3">Changes:</h4>
                    <div className="space-y-2">
                      {sortEntriesByCategory(changelog.entries).map((entry) => {
                        const categoryInfo = getCategoryInfo(entry.category);
                        return (
                          <div key={entry.id} className="flex items-start gap-3">
                            <div className={`badge badge-sm ${categoryInfo.color} ${categoryInfo.bgColor} border-0`}>
                              {categoryInfo.label}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{entry.title}</div>
                              <div className="text-xs text-base-content/60 mt-1">
                                {entry.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {changelog.entries.length === 0 && (
                  <div className="border-t border-base-200 pt-4">
                    <div className="text-center py-4 text-base-content/60">
                      <div className="text-2xl mb-2">📝</div>
                      <p>No entries added yet</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChangelogManagementPage;
