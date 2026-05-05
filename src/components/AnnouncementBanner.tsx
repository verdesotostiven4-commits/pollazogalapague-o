import { useAdmin } from '../context/AdminContext';
import { Bell } from 'lucide-react';

export default function AnnouncementBanner() {
  const { announcement } = useAdmin();

  if (!announcement.trim()) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5"
      style={{
        background: 'linear-gradient(135deg, #E67E22 0%, #f97316 50%, #fbbf24 100%)',
        backgroundSize: '200% 200%',
        animation: 'bg-drift 6s ease infinite',
      }}
    >
      <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
        <Bell size={11} className="text-white" />
      </div>
      <p className="text-white text-xs font-bold leading-snug flex-1 truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        {announcement}
      </p>
      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
    </div>
  );
}
