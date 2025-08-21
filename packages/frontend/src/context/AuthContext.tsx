import { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { loginUser as apiLogin, getCurrentUser } from '../services/api';

interface User {
  userId: number;
  email: string;
  role: string;
  appCurrencyBalance: number;
  avatarUrl?: string | null;
  theme?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  userRole?: string | null;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  setToken: () => {},
  login: async () => {},
  logout: () => {},
  updateUser: () => {},
  userRole: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
    setTokenState(newToken);
  };

  useEffect(() => {
    const loadUserData = async () => {
      if (token) {
        try {
          // First try to get fresh user data from the backend
          const userData = await getCurrentUser();
          setUser({
            userId: userData.id,
            email: userData.email,
            role: userData.role,
            appCurrencyBalance: userData.appCurrencyBalance,
            avatarUrl: userData.avatarUrl,
            theme: userData.theme
          });
        } catch (error) {
          console.error('Failed to fetch fresh user data, falling back to JWT:', error);
          // Fallback to JWT token if API call fails
          try {
            const decoded: User = jwtDecode(token);
            setUser(decoded);
          } catch (jwtError) {
            console.error('Failed to decode token:', jwtError);
            setToken(null);
          }
        }
      } else {
        setUser(null);
      }
    };

    loadUserData();
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setToken(data.token);
  };

  const logout = () => {
    setToken(null);
    // Clear localStorage theme when logging out so it doesn't interfere with other users
    localStorage.removeItem('theme');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, setToken, login, logout, updateUser, userRole: user?.role ?? null }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
