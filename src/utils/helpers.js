import { FRESHNESS_THRESHOLDS } from './constants';

/**
 * Calculate how fresh a report's data is
 */
export function getFreshness(lastRefreshedAt) {
  if (!lastRefreshedAt) return { status: 'unknown', label: 'Unknown', daysAgo: null };

  const now = new Date();
  const refreshed = new Date(lastRefreshedAt);
  const diffMs = now - refreshed;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let label;
  if (diffHours < 1) {
    label = 'Just now';
  } else if (diffHours < 24) {
    label = `${diffHours}h ago`;
  } else if (diffDays === 1) {
    label = '1 day ago';
  } else {
    label = `${diffDays}d ago`;
  }

  let status;
  if (diffDays <= FRESHNESS_THRESHOLDS.fresh) {
    status = 'fresh';
  } else if (diffDays <= FRESHNESS_THRESHOLDS.recent) {
    status = 'recent';
  } else if (diffDays <= FRESHNESS_THRESHOLDS.stale) {
    status = 'aging';
  } else {
    status = 'stale';
  }

  return { status, label, daysAgo: diffDays };
}

/**
 * Get color classes for freshness status
 */
export function getFreshnessColor(status) {
  switch (status) {
    case 'fresh': return 'text-green-600';
    case 'recent': return 'text-yellow-600';
    case 'aging': return 'text-orange-600';
    case 'stale': return 'text-red-600';
    default: return 'text-gray-400';
  }
}

/**
 * Format a date string nicely
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get feedback from localStorage
 */
export function getFeedback(reportId) {
  try {
    const stored = localStorage.getItem(`feedback-${reportId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save feedback to localStorage
 */
export function saveFeedback(reportId, feedback) {
  localStorage.setItem(`feedback-${reportId}`, JSON.stringify({
    ...feedback,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Track a report view in localStorage
 */
export function trackView(reportId) {
  try {
    const key = `views-${reportId}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + 1));
    return current + 1;
  } catch {
    return 0;
  }
}

/**
 * Get view count from localStorage
 */
export function getViewCount(reportId) {
  try {
    return parseInt(localStorage.getItem(`views-${reportId}`) || '0', 10);
  } catch {
    return 0;
  }
}

/**
 * Get certification override from localStorage
 */
export function getCertificationOverride(reportId) {
  try {
    const stored = localStorage.getItem(`cert-${reportId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save certification override to localStorage
 */
export function saveCertificationOverride(reportId, certification) {
  localStorage.setItem(`cert-${reportId}`, JSON.stringify(certification));
}

/**
 * Group reports by a key
 */
export function groupBy(reports, key) {
  return reports.reduce((groups, report) => {
    const value = report[key] || 'Other';
    if (!groups[value]) groups[value] = [];
    groups[value].push(report);
    return groups;
  }, {});
}
