import { useState, useEffect, useContext } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { fetchUsers, loginUser } from '../services/api';
import { AuthContext } from '../context/AuthContext';

interface User {
  id: number;
  email: string;
  role: string;
}

const UserSwitcher = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { setToken } = useContext(AuthContext);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await fetchUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error('Failed to fetch users for switcher:', error);
      }
    };
    loadUsers();
  }, []);

  const handleUserSwitch = async (email: string) => {
    try {
      console.log(`Attempting to switch to user: ${email}`);

      // For development, we assume a default password for all users.
      const { token } = await loginUser(email, 'password');

      console.log(`Login successful for ${email}, setting token...`);
      setToken(token);

      // Use a small delay before reload to ensure token is set
      setTimeout(() => {
        window.location.reload();
      }, 100);

    } catch (error) {
      console.error(`Failed to switch to user ${email}:`, error);

      // Provide more detailed error information
      let errorMessage = 'Failed to switch user.';
      if (error instanceof Error) {
        errorMessage += ` Error: ${error.message}`;
      }

      alert(errorMessage + ' Check the console for details.');
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-secondary btn-sm">
        Switch User
        <ChevronDownIcon className="h-4 w-4 ml-1" />
      </label>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
        {users.map((user) => (
          <li key={user.id}>
            <a onClick={() => handleUserSwitch(user.email)}>
              {user.email} ({user.role})
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserSwitcher;
