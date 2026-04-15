import { useState, useEffect, useMemo } from 'react';

export function useReports() {
  const [reports, setReports] = useState([]);
  const [metadata, setMetadata] = useState({ categories: [], business_units: [], sources: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBU, setSelectedBU] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedCertification, setSelectedCertification] = useState('all');
  const [groupByField, setGroupByField] = useState('bu');

  useEffect(() => {
    async function loadReports() {
      try {
        // In production, this would be fetched from the JSON file in the repo
        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(`${basePath}data/reports.json`);
        if (!response.ok) throw new Error('Failed to load reports');
        const data = await response.json();
        setReports(data.reports);
        setMetadata({
          categories: data.categories,
          business_units: data.business_units,
          sources: data.sources,
        });
      } catch (err) {
        console.error('Failed to load reports:', err);
        setError(err.message);
        // Fallback: try loading from relative path
        try {
          const response = await fetch('./data/reports.json');
          if (response.ok) {
            const data = await response.json();
            setReports(data.reports);
            setMetadata({
              categories: data.categories,
              business_units: data.business_units,
              sources: data.sources,
            });
            setError(null);
          }
        } catch {
          // Keep original error
        }
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          report.name.toLowerCase().includes(query) ||
          report.description.toLowerCase().includes(query) ||
          report.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          report.owner.name.toLowerCase().includes(query) ||
          report.category.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // BU filter
      if (selectedBU !== 'all' && report.bu !== selectedBU) return false;

      // Source filter
      if (selectedSource !== 'all' && report.source !== selectedSource) return false;

      // Certification filter
      if (selectedCertification !== 'all' && report.certification.status !== selectedCertification) return false;

      return true;
    });
  }, [reports, searchQuery, selectedBU, selectedSource, selectedCertification]);

  const groupedReports = useMemo(() => {
    const groups = {};
    filteredReports.forEach((report) => {
      const key = report[groupByField] || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(report);
    });

    // Sort groups alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredReports, groupByField]);

  const stats = useMemo(() => ({
    total: reports.length,
    filtered: filteredReports.length,
    certified: reports.filter((r) => r.certification.status === 'enterprise_certified').length,
    buCertified: reports.filter((r) => r.certification.status === 'bu_certified').length,
    ungoverned: reports.filter((r) => r.certification.status === 'none').length,
    bySource: Object.fromEntries(
      ['tableau', 'lovable', 'claude', 'github_pages'].map((s) => [
        s,
        reports.filter((r) => r.source === s).length,
      ])
    ),
  }), [reports, filteredReports]);

  return {
    reports: filteredReports,
    groupedReports,
    metadata,
    stats,
    loading,
    error,
    filters: {
      searchQuery, setSearchQuery,
      selectedBU, setSelectedBU,
      selectedSource, setSelectedSource,
      selectedCertification, setSelectedCertification,
      groupByField, setGroupByField,
    },
  };
}
