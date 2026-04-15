import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield } from 'lucide-react';

export default function Header() {
  const { user, login, logout, isDemoMode } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8" viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" fill="#863bff"/>
              </svg>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 leading-tight">AI Reporting Hub</h1>
                <p className="text-xs text-gray-500 leading-tight">Amplitude</p>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {isDemoMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <Shield className="w-3 h-3" />
                Demo Mode
              </span>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
                  <User className="w-4 h-4 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-700 leading-tight">{user.name}</p>
                    <p className="text-xs text-gray-500 leading-tight capitalize">{user.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-[#863bff] text-white text-sm font-medium hover:bg-[#6b21c8] transition-colors"
              >
                Sign in with Okta
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
