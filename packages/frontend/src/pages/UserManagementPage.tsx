import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchAdminUsers,
  deleteAdminUser,
  bulkAdminUserAction,
  AdminUser,
  AdminUsersResponse
} from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import UserEditModal from '../components/UserEditModal';
import Avatar from '../components/Avatar';
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const UserManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Search and filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
  const [sortBy] = useState(searchParams.get('sortBy') || 'id');
  const [sortOrder] = useState(searchParams.get('sortOrder') || 'asc');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      // Load all users at once and let DataTable handle pagination
      const data: AdminUsersResponse = await fetchAdminUsers(
        1,
        1000, // Large page size to get all users
        search || undefined,
        (roleFilter as any) || undefined,
        sortBy,
        sortOrder as 'asc' | 'desc'
      );
      setUsers(data.users);
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (sortBy !== 'id') params.set('sortBy', sortBy);
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);
    setSearchParams(params);
  }, [search, roleFilter, sortBy, sortOrder, setSearchParams]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleRoleFilter = (role: string) => {
    setRoleFilter(role);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to delete user "${user.email}"?`)) {
      return;
    }

    try {
      await deleteAdminUser(user.id);
      await loadUsers();
    } catch (err) {
      alert((err as Error).message || 'Failed to delete user');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} selected users?`)) {
      return;
    }

    try {
      await bulkAdminUserAction('delete', selectedUsers);
      setSelectedUsers([]);
      await loadUsers();
    } catch (err) {
      alert((err as Error).message || 'Failed to delete users');
    }
  };

  const handleBulkRoleChange = async (role: string) => {
    if (selectedUsers.length === 0) return;

    if (!confirm(`Are you sure you want to change the role of ${selectedUsers.length} selected users to ${role}?`)) {
      return;
    }

    try {
      await bulkAdminUserAction('updateRole', selectedUsers, { role });
      setSelectedUsers([]);
      await loadUsers();
    } catch (err) {
      alert((err as Error).message || 'Failed to update user roles');
    }
  };

  const handleUserUpdated = () => {
    setShowEditModal(false);
    setEditingUser(null);
    loadUsers();
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          className="checkbox"
          checked={selectedUsers.length === users.length && users.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUsers(users.map(u => u.id));
            } else {
              setSelectedUsers([]);
            }
          }}
        />
      ),
      render: (_, user) => (
        <input
          type="checkbox"
          className="checkbox"
          checked={selectedUsers.includes(user.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUsers([...selectedUsers, user.id]);
            } else {
              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
            }
          }}
        />
      ),
    },
    {
      key: 'avatar',
      header: '',
      render: (_, user) => <Avatar user={user} size="sm" />,
    },
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      render: (_, user) => <span className="font-mono text-sm">{user.id}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (_, user) => <span className="font-medium">{user.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (_, user) => (
        <div className={`badge ${
          user.role === 'ADMIN' ? 'badge-error' :
          user.role === 'MODERATOR' ? 'badge-warning' :
          'badge-info'
        }`}>
          {user.role}
        </div>
      ),
    },
    {
      key: 'appCurrencyBalance',
      header: 'Credits',
      sortable: true,
      render: (_, user) => (
        <span className="font-mono">{user.appCurrencyBalance}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, user) => (
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => handleEditUser(user)}
            title="Edit user"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            className="btn btn-ghost btn-sm text-error"
            onClick={() => handleDeleteUser(user)}
            title="Delete user"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-base-content/70 mt-2">Manage user accounts and permissions</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="form-control">
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="input input-bordered flex-1"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  <button className="btn btn-square">
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="form-control">
              <select
                className="select select-bordered"
                value={roleFilter}
                onChange={(e) => handleRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="MODERATOR">Moderator</option>
                <option value="MEMBER">Member</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="alert alert-info mb-6">
          <div className="flex-1">
            <span>{selectedUsers.length} users selected</span>
          </div>
          <div className="flex gap-2">
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-sm">
                Change Role
              </label>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><button onClick={() => handleBulkRoleChange('MEMBER')}>Member</button></li>
                <li><button onClick={() => handleBulkRoleChange('MODERATOR')}>Moderator</button></li>
                <li><button onClick={() => handleBulkRoleChange('ADMIN')}>Admin</button></li>
              </ul>
            </div>
            <button
              className="btn btn-sm btn-error"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <DataTable<AdminUser>
            data={users}
            columns={columns}
            loading={loading}
            emptyMessage="No users found"
            sortable={true}
            paginated={true}
            pageSize={10}
            searchable={true}
            searchPlaceholder="Search by email or ID..."
            searchFields={['email', 'id']}
          />


        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setShowEditModal(false)}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
};

export default UserManagementPage;
