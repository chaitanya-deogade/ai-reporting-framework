import { SearchX } from 'lucide-react';

export default function EmptyState({ onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="p-4 rounded-full bg-gray-100 mb-4">
        <SearchX className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No reports found</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-sm text-center">
        Try adjusting your search or filters to find what you&apos;re looking for.
      </p>
      <button
        onClick={onClear}
        className="px-4 py-2 rounded-lg bg-[#863bff] text-white text-sm font-medium hover:bg-[#6b21c8] transition-colors"
      >
        Clear all filters
      </button>
    </div>
  );
}
