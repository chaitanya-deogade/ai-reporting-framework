import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OktaAuth } from '@okta/okta-auth-js';
import { OKTA_CONFIG, ROLE_GROUPS } from '../utils/constants';

const AuthContext = createContext(null);

// Initialize Okta client
let oktaAuth;
try {
  oktaAuth = new OktaAuth(OKTA_CONFIG);
} catch (e) {
  console.warn('Okta initialization skipped (configure OKTA_CONFIG in constants.js):', e.message);
}

/**
 * Determine user role from Okta groups claim
 */
function getRoleFromGroups(groups = []) {
  if (groups.includes(ROLE_GROUPS.admin)) return 'admin';
  if (groups.includes(ROLE_GROUPS.buLead)) return 'bu_lead';
  return 'viewer';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for demo mode (when Okta is not configured)
  const isDemoMode = !oktaAuth || OKTA_CONFIG.clientId === 'YOUR_OKTA_CLIENT_ID';

  const checkAuth = useCallback(async () => {
    if (isDemoMode) {
      // Demo mode — simulate a logged-in user
      setUser({
        name: 'Demo User',
        email: 'demo@amplitude.com',
        role: 'admin', // Give demo user admin to see all features
        groups: [ROLE_GROUPS.admin],
        isDemo: true,
      });
      setLoading(false);
      return;
    }

    try {
      const isAuthenticated = await oktaAuth.isAuthenticated();
      if (isAuthenticated) {
        const userInfo = await oktaAuth.getUser();
        const groups = userInfo.groups || [];
        setUser({
          name: userInfo.name,
          email: userInfo.email,
          role: getRoleFromGroups(groups),
          groups,
          isDemo: false,
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle OAuth callback
  useEffect(() => {
    if (isDemoMode) return;

    const handleCallback = async () => {
      if (window.location.pathname.includes('/callback')) {
        try {
          await oktaAuth.handleLoginRedirect();
          await checkAuth();
          // Clean up URL
          window.history.replaceState({}, '', window.location.origin + '/ai-reporting-framework/');
        } catch (err) {
          setError(err.message);
        }
      }
    };
    handleCallback();
  }, [isDemoMode, checkAuth]);

  const login = async () => {
    if (isDemoMode) return;
    try {
      await oktaAuth.signInWithRedirect();
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = async () => {
    if (isDemoMode) {
      setUser(null);
      return;
    }
    try {
      await oktaAuth.signOut();
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Any logged-in user can certify — no group restrictions for now
  const canCertify = () => {
    return !!user;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      canCertify,
      isDemoMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
