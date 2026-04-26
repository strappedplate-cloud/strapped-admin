'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: '⊞' },
  { label: 'Ongoing Orders', href: '/orders/ongoing', icon: '📋' },
  { label: 'Past Orders', href: '/orders/past', icon: '📁' },
  { label: 'Packing List', href: '/packing', icon: '📦' },
  { label: 'Reseller List', href: '/resellers', icon: '👥' },
];

const FUTURE_ITEMS = [
  { label: 'Inventory', href: '/inventory', icon: '🏷️' },
  { label: 'Accounting', href: '/accounting', icon: '💰' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === '/login') return null;

  const user = session?.user as { name?: string; role?: string; username?: string } | undefined;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">S</div>
        <div>
          <div className="sidebar-title">Strapped</div>
          <div className="sidebar-subtitle">Admin Panel</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section-label">Coming Soon</div>
        {FUTURE_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
            <span className="badge">Soon</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-role">{user?.role || 'member'}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn btn-sm btn-secondary"
            style={{ marginLeft: 'auto' }}
            title="Logout"
          >
            ↗
          </button>
        </div>
      </div>
    </aside>
  );
}
