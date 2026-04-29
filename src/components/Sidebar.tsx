'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

const NAVIGATION = [
  {
    category: 'Sales',
    id: 'sales',
    items: [
      { label: 'Ongoing Orders', href: '/orders/ongoing', icon: '📋' },
      { label: 'Past Orders', href: '/orders/past', icon: '📁' },
      { label: 'Reseller List', href: '/resellers', icon: '👥' },
    ]
  },
  {
    category: 'Production',
    id: 'production',
    items: [
      { label: 'Production Parse', href: '/production-parse', icon: '🔍' },
      { label: 'Packing List', href: '/packing', icon: '📦' },
    ]
  },
  {
    category: 'Marketing',
    id: 'marketing',
    items: [
      { label: 'Content', href: '/marketing/content', icon: '📸' },
      { label: 'Photoshoot', href: '/marketing/photoshoot', icon: '📷' },
      { label: 'Copywriting AI', href: '/marketing/copywriting', icon: '✍️' },
      { label: 'Story Generator', href: '/marketing/generator', icon: '🎨' },
    ]
  },
  {
    category: 'Management',
    id: 'management',
    items: [
      { label: 'Accounts', href: '/team', icon: '🛡️', adminOnly: true },
    ]
  }
];

const FUTURE_ITEMS = [
  { label: 'Inventory', href: '/inventory', icon: '🏷️' },
  { label: 'Accounting', href: '/accounting', icon: '💰' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const user = session?.user as { name?: string; role?: string; username?: string; permissions?: string[] } | undefined;
  
  const hasAccess = (item: { href: string; adminOnly?: boolean }) => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (user?.role === 'admin') return true;
    return user?.permissions?.includes(item.href);
  };

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddOrder = () => {
    router.push('/dashboard?new=true');
    setIsOpen(false);
  };

  if (pathname === '/login') return null;

  return (
    <>
      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(false)}>
        <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
          <div className="mobile-menu-header">
            <div className="sidebar-logo">S</div>
            <div className="sidebar-title">Strapped Admin</div>
            <button className="mobile-menu-close" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="mobile-menu-list">
            <Link
              href="/dashboard"
              className={`mobile-menu-link ${pathname === '/dashboard' ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="icon">⊞</span>
              Dashboard
            </Link>

            {NAVIGATION.map(section => {
              const visibleItems = section.items.filter(item => hasAccess(item));
              if (visibleItems.length === 0) return null;
              const isCollapsed = collapsedSections[`mobile-${section.id}`];

              return (
                <div key={section.id} className="mobile-menu-section">
                  <button 
                    className="sidebar-section-header"
                    style={{ padding: '8px 16px' }}
                    onClick={() => toggleSection(`mobile-${section.id}`)}
                  >
                    <div className="sidebar-section-label" style={{ padding: 0 }}>{section.category}</div>
                    <span className={`chevron ${isCollapsed ? 'collapsed' : ''}`}>▾</span>
                  </button>
                  
                  {!isCollapsed && (
                    <div className="mobile-category-items">
                      {visibleItems.map(item => (
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
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className="sidebar-section-label" style={{ padding: '20px 16px 10px' }}>Lainnya</div>
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
          {/* Desktop Only items */}
          <div className="desktop-nav-items">
            <Link
              href="/dashboard"
              className={`sidebar-link ${pathname === '/dashboard' ? 'active' : ''}`}
            >
              <span className="icon">⊞</span>
              Dashboard
            </Link>

            {NAVIGATION.map(section => {
              const visibleItems = section.items.filter(item => hasAccess(item));
              if (visibleItems.length === 0) return null;
              
              const isCollapsed = collapsedSections[section.id];

              return (
                <div key={section.id} className="sidebar-category">
                  <button 
                    className="sidebar-section-header"
                    onClick={() => toggleSection(section.id)}
                  >
                    <span className="sidebar-section-label">{section.category}</span>
                    <span className={`chevron ${isCollapsed ? 'collapsed' : ''}`}>▾</span>
                  </button>
                  
                  {!isCollapsed && (
                    <div className="sidebar-category-items">
                      {visibleItems.map(item => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                        >
                          <span className="icon">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Bottom Nav items */}
          <div className="mobile-bottom-nav">
            <Link
              href="/dashboard"
              className={`sidebar-link ${pathname === '/dashboard' ? 'active' : ''}`}
            >
              <span className="icon">⊞</span>
              Dashboard
            </Link>
            
            <button className="sidebar-link" onClick={handleAddOrder}>
              <span className="icon">✚</span>
              Order Baru
            </button>

            <button className="sidebar-link mobile-nav-trigger" onClick={() => setIsOpen(true)}>
              <span className="icon">☰</span>
              Menu
            </button>
          </div>

          <div className="sidebar-section-label desktop-nav-items">Coming Soon</div>
          {FUTURE_ITEMS.map(item => (
            <div
              key={item.href}
              className="sidebar-link disabled desktop-nav-items"
              style={{ opacity: 0.6, cursor: 'default' }}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
              <span className="badge">Soon</span>
            </div>
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
