import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import FilterBar from './components/FilterBar';
import ReportGroup from './components/ReportGroup';
import EmptyState from './components/EmptyState';
import { useReports } from './hooks/useReports';
import { Loader2 } from 'lucide-react';

function Dashboard() {
  const { groupedReports, metadata, stats, loading, error, filters } = useReports();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#863bff] animate-spin" />
          <p className="text-sm text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <p className="text-sm text-red-700 font-medium mb-1">Failed to load reports</p>
          <p className="text-xs text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    filters.setSearchQuery('');
    filters.setSelectedBU('all');
    filters.setSelectedSource('all');
    filters.setSelectedCertification('all');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <FilterBar filters={filters} metadata={metadata} />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-900">{stats.filtered}</span> of{' '}
          <span className="font-medium text-gray-900">{stats.total}</span> reports
        </p>
      </div>

      {/* Report Groups */}
      {groupedReports.length > 0 ? (
        <div className="space-y-8">
          {groupedReports.map(([groupName, reports]) => (
            <ReportGroup
              key={groupName}
              groupName={groupName}
              reports={reports}
              groupByField={filters.groupByField}
            />
          ))}
        </div>
      ) : (
        <EmptyState onClear={clearFilters} />
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 pt-6 pb-8 text-center">
        <p className="text-xs text-gray-400">
          AI Reporting Hub &middot; Amplitude &middot; Report data refreshed from{' '}
          <code className="px-1 py-0.5 bg-gray-100 rounded text-[11px]">reports.json</code>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          To add a report, submit a PR to update the registry &middot;{' '}
          <a href="#" className="text-[#863bff] hover:underline">Documentation</a>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Dashboard />
      </div>
    </AuthProvider>
  );
}
