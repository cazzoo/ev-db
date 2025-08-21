import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getPublicChangelogs,
  getPublicChangelogByVersion,
  getLatestChangelog,
  Changelog,
  getCategoryInfo,
  formatReleaseDate,
  sortEntriesByCategory
} from '../services/changelogApi';

const ChangelogPage: React.FC = () => {
  const { version } = useParams<{ version?: string }>();
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [selectedChangelog, setSelectedChangelog] = useState<Changelog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (version) {
      loadSpecificChangelog(version);
    } else {
      loadChangelogs();
    }
  }, [version]);

  const loadChangelogs = async (page = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getPublicChangelogs(page, 10);
      setChangelogs(result.changelogs);
      setCurrentPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      
      // If no specific version is selected, show the latest
      if (result.changelogs.length > 0 && !selectedChangelog) {
        setSelectedChangelog(result.changelogs[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load changelogs');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSpecificChangelog = async (version: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const changelog = await getPublicChangelogByVersion(version);
      setSelectedChangelog(changelog);
      
      // Also load the list for navigation
      const result = await getPublicChangelogs(1, 10);
      setChangelogs(result.changelogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load changelog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangelogSelect = (changelog: Changelog) => {
    setSelectedChangelog(changelog);
    // Update URL without page reload
    window.history.pushState({}, '', `/changelog/${changelog.version}`);
  };

  const handlePageChange = (page: number) => {
    loadChangelogs(page);
  };

  if (isLoading && !selectedChangelog) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error && !selectedChangelog) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">📋 Changelog</h1>
        <div className="text-sm text-base-content/60">
          Stay updated with the latest features and improvements
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Changelog List */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-sm border border-base-200 sticky top-4">
            <div className="card-body p-4">
              <h2 className="font-semibold mb-4">Versions</h2>
              
              {changelogs.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm">No changelogs available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {changelogs.map((changelog) => (
                    <button
                      key={changelog.id}
                      onClick={() => handleChangelogSelect(changelog)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedChangelog?.id === changelog.id
                          ? 'bg-primary text-primary-content'
                          : 'hover:bg-base-200'
                      }`}
                    >
                      <div className="font-medium">v{changelog.version}</div>
                      <div className="text-xs opacity-70">
                        {formatReleaseDate(changelog.releaseDate)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <div className="join">
                    <button
                      className="join-item btn btn-xs"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      «
                    </button>
                    <button className="join-item btn btn-xs">
                      {currentPage} / {totalPages}
                    </button>
                    <button
                      className="join-item btn btn-xs"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Selected Changelog */}
        <div className="lg:col-span-3">
          {selectedChangelog ? (
            <div className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body">
                {/* Header */}
                <div className="border-b border-base-200 pb-6 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-3xl font-bold">v{selectedChangelog.version}</h1>
                    <div className="badge badge-success">Published</div>
                  </div>
                  <h2 className="text-xl font-semibold mb-3">{selectedChangelog.title}</h2>
                  {selectedChangelog.description && (
                    <p className="text-base-content/70 mb-4">{selectedChangelog.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-base-content/60">
                    <span>📅 Released {formatReleaseDate(selectedChangelog.releaseDate)}</span>
                    {selectedChangelog.author && (
                      <span>👤 By {selectedChangelog.author.name || selectedChangelog.author.email}</span>
                    )}
                    <span>📝 {selectedChangelog.entries.length} changes</span>
                  </div>
                </div>

                {/* Changelog Entries */}
                {selectedChangelog.entries.length > 0 ? (
                  <div className="space-y-6">
                    {sortEntriesByCategory(selectedChangelog.entries).reduce((acc, entry) => {
                      const categoryInfo = getCategoryInfo(entry.category);
                      let categoryGroup = acc.find(group => group.category === entry.category);
                      
                      if (!categoryGroup) {
                        categoryGroup = {
                          category: entry.category,
                          categoryInfo,
                          entries: []
                        };
                        acc.push(categoryGroup);
                      }
                      
                      categoryGroup.entries.push(entry);
                      return acc;
                    }, [] as Array<{ category: string; categoryInfo: any; entries: any[] }>).map((group) => (
                      <div key={group.category}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`badge ${group.categoryInfo.color} ${group.categoryInfo.bgColor} border-0`}>
                            {group.categoryInfo.label}
                          </div>
                          <div className="text-sm text-base-content/60">
                            {group.entries.length} {group.entries.length === 1 ? 'change' : 'changes'}
                          </div>
                        </div>
                        <div className="space-y-3 ml-4">
                          {group.entries.map((entry) => (
                            <div key={entry.id} className="border-l-2 border-base-300 pl-4">
                              <h4 className="font-medium mb-1">{entry.title}</h4>
                              <p className="text-sm text-base-content/70">{entry.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-base-content/60">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-semibold mb-2">No Changes Listed</h3>
                    <p>This changelog doesn't have any entries yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold mb-2">No Changelog Selected</h3>
                <p className="text-base-content/60">
                  Select a version from the sidebar to view its changelog.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangelogPage;
