import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../context/AuthContext';
import UserSwitcher from './UserSwitcher';
import UserDropdown from './UserDropdown';
import NotificationBell from './NotificationBell';

const AppNavbar = () => {
  const { token, user } = useContext(AuthContext);

  const isDevelopment = (import.meta as { env: { MODE: string } }).env?.MODE === 'development';


  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <Bars3Icon className="h-5 w-5" />
          </label>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><Link to="/vehicles">Vehicles</Link></li>
            <li><Link to="/contributions/browse">Browse Contributions</Link></li>
            <li><Link to="/contribute">Contribute</Link></li>
            <li><Link to="/changelog">Changelog</Link></li>
            <li><Link to="/api-docs">API Documentation</Link></li>
            {token && <li><Link to="/dashboard">My Dashboard</Link></li>}
            {user?.role === 'ADMIN' && (
              <>
                <li><div className="divider my-1"></div></li>
                <li>
                  <Link to="/admin/dashboard" className="text-primary">
                    <Cog6ToothIcon className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/admin/settings" className="text-primary">
                    <Cog6ToothIcon className="h-4 w-4" />
                    Admin Settings
                  </Link>
                </li>
                <li>
                  <Link to="/admin/users" className="text-primary">
                    Manage Users
                  </Link>
                </li>
                <li>
                  <Link to="/admin/notifications" className="text-primary">
                    Notifications
                  </Link>
                </li>
                <li>
                  <Link to="/admin/notifications/compose" className="text-primary">
                    Compose Notification
                  </Link>
                </li>
                <li>
                  <Link to="/admin/notifications/templates" className="text-primary">
                    Notification Templates
                  </Link>
                </li>
                <li>
                  <Link to="/admin/changelogs" className="text-primary">
                    Changelogs
                  </Link>
                </li>
                <li>
                  <Link to="/admin/changelogs/create" className="text-primary">
                    Create Changelog
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
        <Link to="/" className="btn btn-ghost text-xl">EV Database</Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link to="/vehicles">Vehicles</Link></li>
          <li><Link to="/contributions/browse">Browse Contributions</Link></li>
          <li><Link to="/contribute">Contribute</Link></li>
          <li><Link to="/changelog">Changelog</Link></li>
          <li><Link to="/api-docs">API Documentation</Link></li>
          {token && <li><Link to="/dashboard">My Dashboard</Link></li>}
          {user?.role === 'ADMIN' && (
            <li>
              <div className="dropdown dropdown-hover">
                <div tabIndex={0} role="button" className="text-primary flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-base-200">
                  <Cog6ToothIcon className="h-4 w-4" />
                  Admin
                </div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64">
                  <li><Link to="/admin/dashboard">Dashboard</Link></li>
                  <li><Link to="/admin/settings">Settings</Link></li>
                  <li><Link to="/admin/users">Manage Users</Link></li>
                  <li><div className="divider my-1"></div></li>
                  <li><Link to="/admin/notifications">Notifications</Link></li>
                  <li><Link to="/admin/notifications/compose">Compose Notification</Link></li>
                  <li><Link to="/admin/notifications/templates">Notification Templates</Link></li>
                  <li><div className="divider my-1"></div></li>
                  <li><Link to="/admin/changelogs">Changelogs</Link></li>
                  <li><Link to="/admin/changelogs/create">Create Changelog</Link></li>
                </ul>
              </div>
            </li>
          )}
        </ul>
      </div>
      <div className="navbar-end">
        {isDevelopment && (
          <div className="mr-2"><UserSwitcher /></div>
        )}
        {token ? (
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserDropdown />
          </div>
        ) : (
          <div className="flex gap-2">
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppNavbar;
