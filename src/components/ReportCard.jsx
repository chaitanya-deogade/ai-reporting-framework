import { useState } from 'react';
import { ExternalLink, Lock, RefreshCw, Eye, User, ThumbsUp, ThumbsDown, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { SOURCE_CONFIG, CERTIFICATION_CONFIG } from '../utils/constants';
import { getFreshness, getFreshnessColor, formatDate, trackView, getViewCount, saveFeedback, getFeedback, getCertificationOverride, saveCertificationOverride } from '../utils/helpers';
import { persistCertification, isCertifyApiEnabled } from '../utils/github';
import { useAuth } from '../contexts/AuthContext';

export default function ReportCard({ report }) {
  const { user, canCertify } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showCertifyMenu, setShowCertifyMenu] = useState(false);
  const [certifying, setCertifying] = useState(false);   // in-flight API call
  const [certToast, setCertToast] = useState(null);       // { type: 'success'|'error', msg }
  const [viewCount, setViewCount] = useState(() => getViewCount(report.id));
  const [feedback, setFeedbackState] = useState(() => getFeedback(report.id));

  // Certification: prefer server value from reports.json; local override as fallback
  const certOverride = getCertificationOverride(report.id);
  const currentCert = certOverride || report.certification;
  const [certStatus, setCertStatus] = useState(currentCert.status);

  const source = SOURCE_CONFIG[report.source] || SOURCE_CONFIG.other;
  const cert = CERTIFICATION_CONFIG[certStatus] || CERTIFICATION_CONFIG.none;
  const freshness = getFreshness(report.last_refreshed_at);
  const freshnessColor = getFreshnessColor(freshness.status);

  const handleCardClick = () => {
    if (showCertifyMenu) { setShowCertifyMenu(false); return; }
    if (report.access.restricted) {
      setShowModal(true);
    } else {
      const count = trackView(report.id);
      setViewCount(count);
      window.open(report.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCertify = async (newStatus) => {
    setShowCertifyMenu(false);
    const certification = {
      status: newStatus,
      certified_by: user?.email || 'anonymous',
      certified_at: new Date().toISOString().split('T')[0],
    };

    // Optimistic UI update immediately
    setCertStatus(newStatus);
    saveCertificationOverride(report.id, certification);

    if (!isCertifyApiEnabled()) {
      // No token configured — show a friendly note
      setCertToast({ type: 'info', msg: 'Visible to you now. Ask an admin to configure VITE_GITHUB_TOKEN to make it permanent.' });
      setTimeout(() => setCertToast(null), 5000);
      return;
    }

    // Persist to reports.json via GitHub API
    setCertifying(true);
    try {
      await persistCertification(report.id, certification);
      setCertToast({ type: 'success', msg: '✓ Saved — deploying now, live in ~1 min' });
    } catch (err) {
      // Revert optimistic update on failure
      setCertStatus(currentCert.status);
      saveCertificationOverride(report.id, currentCert);
      setCertToast({ type: 'error', msg: `Failed: ${err.message}` });
    } finally {
      setCertifying(false);
      setTimeout(() => setCertToast(null), 5000);
    }
  };

  const handleFeedback = (type) => {
    const fb = { type, user: user?.email || 'anonymous' };
    saveFeedback(report.id, fb);
    setFeedbackState(fb);
  };

  return (
    <>
      <div
        className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#863bff]/30 transition-all duration-200 cursor-pointer flex flex-col"
        onClick={handleCardClick}
      >
        {/* Thumbnail */}
        <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {report.thumbnail ? (
            <img
              src={`${import.meta.env.BASE_URL || '/'}${report.thumbnail}`}
              alt={report.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`${report.thumbnail ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}
          >
            <span className="text-5xl opacity-50">{source.icon}</span>
          </div>

          {/* Source badge */}
          <div className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${source.bgLight} ${source.textColor} ${source.borderColor} border backdrop-blur-sm`}>
            <span>{source.icon}</span>
            {source.label}
          </div>

          {/* Restricted indicator */}
          {report.access.restricted && (
            <div className="absolute top-2 right-2 p-1.5 rounded-full bg-red-50 border border-red-200">
              <Lock className="w-3.5 h-3.5 text-red-500" />
            </div>
          )}

          {/* Open icon on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-2 rounded-full shadow-sm">
              <ExternalLink className="w-5 h-5 text-[#863bff]" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          {/* Title & Certification */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">
              {report.name}
            </h3>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (canCertify() && !certifying) setShowCertifyMenu(!showCertifyMenu);
                }}
                disabled={certifying}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cert.bgColor} ${cert.color} ${cert.borderColor} border ${canCertify() && !certifying ? 'hover:ring-2 hover:ring-[#863bff]/20 cursor-pointer' : 'opacity-80'} transition-all`}
                title={canCertify() ? 'Click to change certification' : 'Sign in to certify'}
              >
                {certifying
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <span className="text-xs">{cert.icon}</span>
                }
                {certifying ? 'Saving…' : cert.shortLabel}
              </button>

              {/* Toast notification */}
              {certToast && (
                <div className={`absolute right-0 top-full mt-1 z-40 px-3 py-2 rounded-lg text-xs shadow-lg whitespace-nowrap border ${
                  certToast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
                  certToast.type === 'error'   ? 'bg-red-50 text-red-800 border-red-200' :
                                                 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {certToast.msg}
                </div>
              )}

              {/* Certification dropdown */}
              {showCertifyMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg border border-gray-200 shadow-lg py-1 w-52">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Set Certification
                  </div>
                  {Object.entries(CERTIFICATION_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={(e) => { e.stopPropagation(); handleCertify(key); }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors ${certStatus === key ? 'bg-gray-50 font-medium' : ''}`}
                    >
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                      {certStatus === key && (
                        <ShieldCheck className="w-3 h-3 ml-auto text-[#863bff]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
            {report.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {report.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                {tag}
              </span>
            ))}
            {report.tags.length > 3 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-400">
                +{report.tags.length - 3}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-[11px] text-gray-500 truncate max-w-[100px]">{report.owner.name}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* View count */}
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] text-gray-500">{viewCount}</span>
              </div>

              {/* Freshness */}
              <div className={`flex items-center gap-1 ${freshnessColor}`}>
                <RefreshCw className={`w-3 h-3 ${freshness.status === 'stale' ? 'animate-none' : ''}`} />
                <span className="text-[11px] font-medium">{freshness.label}</span>
              </div>
            </div>
          </div>

          {/* Feedback row */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400">Added {formatDate(report.created_at)}</span>
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {feedback ? (
                <span className="text-[11px] text-gray-500">
                  {feedback.type === 'up' ? '👍' : '👎'} Feedback sent
                </span>
              ) : (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFeedback('up'); }}
                    className="p-1 hover:bg-green-50 rounded transition-colors"
                    title="Helpful"
                  >
                    <ThumbsUp className="w-3 h-3 text-gray-400 hover:text-green-600" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFeedback('down'); }}
                    className="p-1 hover:bg-red-50 rounded transition-colors"
                    title="Not helpful"
                  >
                    <ThumbsDown className="w-3 h-3 text-gray-400 hover:text-red-600" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Access Restricted Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-full bg-red-50">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Access Restricted</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>{report.name}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {report.access.restricted_message || 'This report has restricted access. Contact the report owner for access.'}
            </p>
            <div className="flex items-center gap-3">
              <a
                href={`mailto:${report.owner.email}?subject=Access Request: ${report.name}`}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#863bff] text-white text-sm font-medium hover:bg-[#6b21c8] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Request Access
              </a>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
