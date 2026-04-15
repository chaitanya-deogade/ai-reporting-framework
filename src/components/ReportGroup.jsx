import ReportCard from './ReportCard';
import { SOURCE_CONFIG } from '../utils/constants';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function ReportGroup({ groupName, reports, groupByField }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get display name based on grouping
  let displayName = groupName;
  if (groupByField === 'source' && SOURCE_CONFIG[groupName]) {
    displayName = `${SOURCE_CONFIG[groupName].icon} ${SOURCE_CONFIG[groupName].label}`;
  }

  return (
    <div className="space-y-4">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full group"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <h2 className="text-base font-semibold text-gray-900">{displayName}</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {reports.length} {reports.length === 1 ? 'report' : 'reports'}
        </span>
        <div className="flex-1 border-t border-gray-200 ml-3" />
      </button>

      {/* Report Cards Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
