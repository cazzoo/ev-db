import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAdminCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  CustomField
} from '../../services/api';
import DataTable, { Column } from '../../components/DataTable';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface CustomFieldFormData {
  name: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'BOOLEAN' | 'URL';
  validationRules?: any;
  isVisibleOnCard: boolean;
  isVisibleOnDetails: boolean;
  displayOrder: number;
}

const CustomFieldsManagementPage: React.FC = () => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingField, setDeletingField] = useState<CustomField | null>(null);

  // Form state
  const [formData, setFormData] = useState<CustomFieldFormData>({
    name: '',
    fieldType: 'TEXT',
    validationRules: null,
    isVisibleOnCard: false,
    isVisibleOnDetails: true,
    displayOrder: 0
  });
  const [formLoading, setFormLoading] = useState(false);

  // Load custom fields
  const loadCustomFields = async () => {
    try {
      setLoading(true);
      const response = await fetchAdminCustomFields('usageCount', 'desc');
      setCustomFields(response.fields);
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomFields();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle create field
  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await createCustomField(formData);
      setSuccessMessage('Custom field created successfully');
      setShowCreateModal(false);
      resetForm();
      await loadCustomFields();
    } catch (err) {
      setError((err as Error).message || 'Failed to create custom field');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle edit field
  const handleEditField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField) return;

    setFormLoading(true);

    try {
      await updateCustomField(editingField.id, formData);
      setSuccessMessage('Custom field updated successfully');
      setShowEditModal(false);
      setEditingField(null);
      resetForm();
      await loadCustomFields();
    } catch (err) {
      setError((err as Error).message || 'Failed to update custom field');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete field
  const handleDeleteField = async () => {
    if (!deletingField) return;

    setFormLoading(true);

    try {
      await deleteCustomField(deletingField.id);
      setSuccessMessage('Custom field deleted successfully');
      setShowDeleteModal(false);
      setDeletingField(null);
      await loadCustomFields();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete custom field');
    } finally {
      setFormLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      fieldType: 'TEXT',
      validationRules: null,
      isVisibleOnCard: false,
      isVisibleOnDetails: true,
      displayOrder: 0
    });
  };

  // Open edit modal
  const openEditModal = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      fieldType: field.fieldType,
      validationRules: field.validationRules,
      isVisibleOnCard: field.isVisibleOnCard,
      isVisibleOnDetails: field.isVisibleOnDetails,
      displayOrder: field.displayOrder
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (field: CustomField) => {
    setDeletingField(field);
    setShowDeleteModal(true);
  };

  // Table columns
  const columns: Column<CustomField>[] = [
    {
      key: 'name',
      header: 'Field Name',
      accessor: 'name',
      sortable: true,
      render: (value, field) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-base-content/60">Key: {field.key}</div>
        </div>
      )
    },
    {
      key: 'fieldType',
      header: 'Type',
      accessor: 'fieldType',
      sortable: true,
      render: (value) => (
        <div className="badge badge-outline">{value}</div>
      )
    },
    {
      key: 'usageCount',
      header: 'Usage',
      accessor: 'usageCount',
      sortable: true,
      render: (value) => (
        <div className="text-center">
          <div className="font-medium">{value}</div>
          <div className="text-xs text-base-content/60">times used</div>
        </div>
      )
    },
    {
      key: 'visibility',
      header: 'Visibility',
      render: (_, field) => (
        <div className="space-y-1">
          {field.isVisibleOnCard && (
            <div className="badge badge-success badge-sm">Card</div>
          )}
          {field.isVisibleOnDetails && (
            <div className="badge badge-info badge-sm">Details</div>
          )}
        </div>
      )
    },
    {
      key: 'displayOrder',
      header: 'Order',
      accessor: 'displayOrder',
      sortable: true,
      render: (value) => <span className="font-mono">{value}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, field) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(field)}
            className="btn btn-ghost btn-sm"
            title="Edit field"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => openDeleteModal(field)}
            className="btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content"
            title="Delete field"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="btn btn-ghost btn-sm">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Admin
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TagIcon className="h-8 w-8" />
              Custom Fields Management
            </h1>
            <p className="text-base-content/70 mt-1">
              Manage custom fields for vehicle data
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5" />
          Create Field
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="alert alert-success mb-4">
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Custom Fields Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <DataTable
            data={customFields}
            columns={columns}
            loading={loading}
            emptyMessage="No custom fields found"
            searchable={true}
            searchPlaceholder="Search custom fields..."
          />
        </div>
      </div>

      {/* Create Field Modal */}
      <dialog className={`modal ${showCreateModal ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create Custom Field</h3>

          <form onSubmit={handleCreateField} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Field Name *</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input input-bordered"
                placeholder="e.g., Warranty Period"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Field Type</span>
              </label>
              <select
                value={formData.fieldType}
                onChange={(e) => setFormData({ ...formData, fieldType: e.target.value as any })}
                className="select select-bordered"
              >
                <option value="TEXT">Text</option>
                <option value="NUMBER">Number</option>
                <option value="DATE">Date</option>
                <option value="DROPDOWN">Dropdown</option>
                <option value="BOOLEAN">Boolean</option>
                <option value="URL">URL</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Display Order</span>
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                className="input input-bordered"
                min="0"
              />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Visible on Vehicle Card</span>
                <input
                  type="checkbox"
                  checked={formData.isVisibleOnCard}
                  onChange={(e) => setFormData({ ...formData, isVisibleOnCard: e.target.checked })}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Visible on Vehicle Details</span>
                <input
                  type="checkbox"
                  checked={formData.isVisibleOnDetails}
                  onChange={(e) => setFormData({ ...formData, isVisibleOnDetails: e.target.checked })}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="btn btn-ghost"
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={formLoading}
              >
                {formLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  'Create Field'
                )}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Edit Field Modal */}
      <dialog className={`modal ${showEditModal ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Edit Custom Field</h3>

          <form onSubmit={handleEditField} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Field Name *</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input input-bordered"
                placeholder="e.g., Warranty Period"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Field Type</span>
              </label>
              <select
                value={formData.fieldType}
                onChange={(e) => setFormData({ ...formData, fieldType: e.target.value as any })}
                className="select select-bordered"
              >
                <option value="TEXT">Text</option>
                <option value="NUMBER">Number</option>
                <option value="DATE">Date</option>
                <option value="DROPDOWN">Dropdown</option>
                <option value="BOOLEAN">Boolean</option>
                <option value="URL">URL</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Display Order</span>
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                className="input input-bordered"
                min="0"
              />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Visible on Vehicle Card</span>
                <input
                  type="checkbox"
                  checked={formData.isVisibleOnCard}
                  onChange={(e) => setFormData({ ...formData, isVisibleOnCard: e.target.checked })}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Visible on Vehicle Details</span>
                <input
                  type="checkbox"
                  checked={formData.isVisibleOnDetails}
                  onChange={(e) => setFormData({ ...formData, isVisibleOnDetails: e.target.checked })}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingField(null);
                  resetForm();
                }}
                className="btn btn-ghost"
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={formLoading}
              >
                {formLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Updating...
                  </>
                ) : (
                  'Update Field'
                )}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Delete Field Modal */}
      <dialog className={`modal ${showDeleteModal ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Delete Custom Field</h3>

          {deletingField && (
            <div className="space-y-4">
              <p>
                Are you sure you want to delete the custom field <strong>"{deletingField.name}"</strong>?
              </p>

              {deletingField.usageCount > 0 && (
                <div className="alert alert-warning">
                  <span>
                    This field is currently used in {deletingField.usageCount} vehicles.
                    Deleting it will remove all associated data.
                  </span>
                </div>
              )}

              <div className="modal-action">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingField(null);
                  }}
                  className="btn btn-ghost"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteField}
                  className="btn btn-error"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete Field'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
};

export default CustomFieldsManagementPage;
