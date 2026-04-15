import { BarChart3, CheckCircle, Building2, AlertTriangle } from 'lucide-react';

export default function StatsBar({ stats }) {
  const items = [
    {
      label: 'Total Reports',
      value: stats.total,
      icon: BarChart3,
      color: 'text-[#863bff]',
      bg: 'bg-purple-50',
    },
    {
      label: 'Enterprise Certified',
      value: stats.certified,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'BU Certified',
      value: stats.buCertified,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Ungoverned',
      value: stats.ungoverned,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3"
        >
          <div className={`${item.bg} p-2.5 rounded-lg`}>
            <item.icon className={`w-5 h-5 ${item.color}`} />
          </div>
          <div className="text-left">
            <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
