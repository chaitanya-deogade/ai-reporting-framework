import { Search, SlidersHorizontal } from 'lucide-react';
import { SOURCE_CONFIG } from '../utils/constants';

export default function FilterBar({ filters, metadata }) {
  const {
    searchQuery, setSearchQuery,
    selectedBU, setSelectedBU,
    selectedSource, setSelectedSource,
    selectedCertification, setSelectedCertification,
    groupByField, setGroupByField,
  } = filters;

  const hasActiveFilters = selectedBU !== 'all' || selectedSource !== 'all' || selectedCertification !== 'all' || searchQuery;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBU('all');
    setSelectedSource('all');
    setSelectedCertification('all');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search reports by name, description, tag, or owner..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#863bff]/20 focus:border-[#863bff] transition-colors"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <SlidersHorizontal className="w-4 h-4 text-gray-400" />

        {/* BU Filter */}
        <select
          value={selectedBU}
          onChange={(e) => setSelectedBU(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#863bff]/20 focus:border-[#863bff] cursor-pointer"
        >
          <option value="all">All Business Units</option>
          {metadata.business_units.map((bu) => (
            <option key={bu} value={bu}>{bu}</option>
          ))}
        </select>

        {/* Source Filter */}
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#863bff]/20 focus:border-[#863bff] cursor-pointer"
        >
          <option value="all">All Sources</option>
          {metadata.sources.map((src) => (
            <option key={src} value={src}>{SOURCE_CONFIG[src]?.label || src}</option>
          ))}
        </select>

        {/* Certification Filter */}
        <select
          value={selectedCertification}
          onChange={(e) => setSelectedCertification(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#863bff]/20 focus:border-[#863bff] cursor-pointer"
        >
          <option value="all">All Certification</option>
          <option value="enterprise_certified">Enterprise Certified</option>
          <option value="bu_certified">BU Certified</option>
          <option value="none">Ungoverned</option>
        </select>

        {/* Group By */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">Group by:</span>
          <select
            value={groupByField}
            onChange={(e) => setGroupByField(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#863bff]/20 focus:border-[#863bff] cursor-pointer"
          >
            <option value="bu">Business Unit</option>
            <option value="category">Category</option>
            <option value="source">Source</option>
          </select>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-xs font-medium text-[#863bff] hover:bg-purple-50 rounded-lg transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
