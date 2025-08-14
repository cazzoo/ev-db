import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../context/AuthContext';
import UserSwitcher from './UserSwitcher';
import UserDropdown from './UserDropdown';

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
                  <Link to="/admin/users" className="text-primary">
                    Manage Users
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
          <li><Link to="/api-docs">API Documentation</Link></li>
          {token && <li><Link to="/dashboard">My Dashboard</Link></li>}
          {user?.role === 'ADMIN' && (
            <li>
              <details>
                <summary className="text-primary">
                  <Cog6ToothIcon className="h-4 w-4" />
                  Admin
                </summary>
                <ul className="p-2 bg-base-100 rounded-t-none">
                  <li><Link to="/admin/dashboard">Dashboard</Link></li>
                  <li><Link to="/admin/users">Manage Users</Link></li>
                </ul>
              </details>
            </li>
          )}
        </ul>
      </div>
      <div className="navbar-end">
        {isDevelopment && (
          <div className="mr-2"><UserSwitcher /></div>
        )}
        {token ? (
          <UserDropdown />
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
