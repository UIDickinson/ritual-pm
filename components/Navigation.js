'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Home, PlusCircle, Wallet, LogOut, Shield } from 'lucide-react';

export default function Navigation() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Markets', icon: Home },
    { href: '/create', label: 'Create', icon: PlusCircle },
    { href: '/predictions', label: 'My Predictions', icon: Wallet },
  ];

  if (isAdmin) {
    navLinks.push({ href: '/admin', label: 'Admin', icon: Shield });
  }

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 glass-heavy border-b border-primary-emerald/20 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
              <Image 
                src="/logo.png" 
                alt="Ritual Logo" 
                width={40} 
                height={40}
                className="w-10 h-10"
              />
            </div>
            <div className="hidden md:block">
              <span className="text-white font-bold text-lg">Ritual</span>
              <span className="text-slate-gray text-xs block leading-none">Prediction Market</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2
                    ${active 
                      ? 'gradient-primary text-white shadow-md shadow-emerald' 
                      : 'text-slate-gray hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Balance Display */}
            <div className="hidden md:flex items-center gap-2 glass-dark px-4 py-2 rounded-xl border border-primary-emerald/20">
              <Wallet className="w-4 h-4 text-bright-lime" />
              <span className="text-bright-lime font-bold font-mono text-sm">
                {user?.points_balance || 0}
              </span>
              <span className="text-slate-gray text-xs">pts</span>
            </div>

            {/* User Avatar & Logout */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 glass-dark px-3 py-2 rounded-xl border border-primary-emerald/20">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-white font-medium text-sm hidden sm:inline">
                  {user?.username}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-xl text-slate-gray hover:text-hot-coral hover:bg-hot-coral/10 transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
