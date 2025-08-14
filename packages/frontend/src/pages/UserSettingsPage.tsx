import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../hooks/useToast';
import AvatarUpload from '../components/AvatarUpload';

const UserSettingsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();
  const { showSuccess, showError, showWarning } = useToast();

  const handleThemeChange = async (newTheme: string) => {
    try {
      await setTheme(newTheme);
      showSuccess('Theme updated successfully!');
    } catch (err) {
      showError((err as Error).message || 'Failed to update theme');
    }
  };

  if (!isAuthenticated) {
    showWarning('Please log in to access your settings.');
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <span>Please log in to access your settings.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings & Preferences</h1>

      {/* Avatar Section */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Profile Picture</h2>
          <AvatarUpload />
        </div>
      </div>

      {/* User Information Section */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                value={user?.email || ''}
                className="input input-bordered w-full"
                disabled
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">Role</span>
              </label>
              <input
                type="text"
                value={user?.role || ''}
                className="input input-bordered w-full"
                disabled
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">App Currency Balance</span>
              </label>
              <input
                type="number"
                value={user?.appCurrencyBalance || 0}
                className="input input-bordered w-full"
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* Theme Selection Section */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Appearance</h2>
          <div className="form-control w-full max-w-xs">
            <label className="label">
              <span className="label-text">Theme</span>
            </label>
            <select
              className="select select-bordered w-full max-w-xs"
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
            >
              {availableThemes.map((themeOption) => (
                <option key={themeOption.value} value={themeOption.value}>
                  {themeOption.label}
                </option>
              ))}
            </select>
            <label className="label">
              <span className="label-text-alt">Choose your preferred theme</span>
            </label>
          </div>
        </div>
      </div>

      {/* Application Preferences Section */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Application Preferences</h2>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Email notifications for contribution updates</span>
                <input type="checkbox" className="checkbox" defaultChecked />
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Show detailed vehicle specifications by default</span>
                <input type="checkbox" className="checkbox" defaultChecked />
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable keyboard shortcuts</span>
                <input type="checkbox" className="checkbox" defaultChecked />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy & Security Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Privacy & Security</h2>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Make my contributions public</span>
                <input type="checkbox" className="checkbox" defaultChecked />
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Allow others to see my profile</span>
                <input type="checkbox" className="checkbox" defaultChecked />
              </label>
            </div>
            <div className="divider"></div>
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>For API key management and advanced security settings, visit your <a href="/dashboard" className="link">Dashboard</a>.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsPage;
