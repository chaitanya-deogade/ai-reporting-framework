export const SOURCE_CONFIG = {
  tableau: {
    label: 'Tableau',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: '📊',
  },
  lovable: {
    label: 'Lovable',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: '💜',
  },
  claude: {
    label: 'Claude',
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: '🤖',
  },
  github_pages: {
    label: 'GitHub Pages',
    color: 'bg-gray-700',
    textColor: 'text-gray-700',
    bgLight: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: '🐙',
  },
  other: {
    label: 'Other',
    color: 'bg-slate-500',
    textColor: 'text-slate-700',
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: '📋',
  },
};

export const CERTIFICATION_CONFIG = {
  enterprise_certified: {
    label: 'Enterprise Certified',
    shortLabel: 'Certified',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '✅',
  },
  bu_certified: {
    label: 'BU Certified',
    shortLabel: 'BU Cert',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: '🏢',
  },
  none: {
    label: 'Ungoverned',
    shortLabel: 'Ungoverned',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: '⚠️',
  },
};

export const FRESHNESS_THRESHOLDS = {
  fresh: 1,       // days — green
  recent: 3,      // days — yellow
  stale: 7,       // days — red
};

export const OKTA_CONFIG = {
  issuer: 'https://amplitude.okta.com/oauth2/default',
  clientId: 'YOUR_OKTA_CLIENT_ID',  // Replace with actual Okta SPA client ID
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/ai-reporting-framework/callback` : '',
  scopes: ['openid', 'profile', 'email', 'groups'],
  pkce: true,
};

// Okta groups that map to roles
export const ROLE_GROUPS = {
  admin: 'report-hub-admin',
  buLead: 'report-hub-bu-lead',
  viewer: 'report-hub-viewer',
};
