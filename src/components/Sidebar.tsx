'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';


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
  const [isOpen, setIsOpen] = useState(false);


  if (pathname === '/login') return null;

  const user = session?.user as { name?: string; role?: string; username?: string; permissions?: string[] } | undefined;
  
  const hasAccess = (href: string) => {
    if (user?.role === 'admin') return true;
    return user?.permissions?.includes(href);
  };

  return (
    <>
      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(false)}>

        <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
          <div className="mobile-menu-header">
            <div className="sidebar-logo">S</div>
            <div className="sidebar-title">Menu Utama</div>
            <button className="mobile-menu-close" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="mobile-menu-list">
            {NAV_ITEMS.filter(item => hasAccess(item.href)).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-menu-link ${pathname === item.href ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link 
                href="/team" 
                className={`mobile-menu-link ${pathname === '/team' ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="icon">🛡️</span>
                Team Management
              </Link>
            )}
            
            <div className="sidebar-section-label" style={{ padding: '20px 0 10px' }}>Lainnya</div>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="mobile-menu-link"
              style={{ color: 'var(--status-red)' }}
            >
              <span className="icon">↗</span>
              Logout
            </button>
          </div>
        </div>
      </div>

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
          {NAV_ITEMS.filter(item => hasAccess(item.href)).map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {user?.role === 'admin' && (
            <Link href="/team" className={`sidebar-link nav-item-team ${pathname === '/team' ? 'active' : ''}`}>
              <span className="icon">🛡️</span>
              Team Management
            </Link>
          )}

          <button className="sidebar-link mobile-nav-trigger" onClick={() => setIsOpen(true)}>
            <span className="icon">☰</span>
            Menu
          </button>


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
    </>
  );

}
