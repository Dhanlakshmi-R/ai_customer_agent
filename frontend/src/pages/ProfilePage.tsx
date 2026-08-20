import React from 'react';
import { User as UserIcon, Shield, Mail, Calendar, Award, BadgeCheck, UserCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export const ProfilePage: React.FC = () => {
  const { user } = useStore();

  return (
    <div className="ui-page p-5 md:p-8 space-y-7 min-h-screen">
      <div>
        <p className="ui-eyebrow text-[11px] uppercase tracking-[.16em] font-semibold flex items-center gap-1.5">
          <UserCircle className="w-3 h-3" /> Account & access
        </p>
        <h1 className="ui-header-title page-heading text-2xl md:text-3xl font-bold mt-1">User Profile</h1>
        <p className="ui-subtext text-xs mt-2">Manage your support coach credentials and role access settings.</p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Profile Hero Card */}
        <div className="ui-card p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-[var(--brand)]/20 via-[var(--brand)]/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-5 relative pt-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[var(--brand)] via-[var(--info)] to-[var(--success)] flex items-center justify-center font-bold text-3xl text-white shadow-lg ring-4 ring-[var(--brand)]/15 shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold ui-header-title">{user?.full_name || 'Support Agent'}</h2>
              <div className="flex items-center flex-wrap gap-2">
                <span className="ui-chip ui-chip-indigo">{user?.role || 'agent'}</span>
                <span className="ui-chip ui-chip-emerald flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" /> Verified Console Access
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Credentials / Access Rows */}
        <div className="ui-card p-5 rounded-2xl space-y-3">
          <div className="ui-icon-tile w-9 h-9">
            <UserIcon className="w-4 h-4" />
          </div>
          <h3 className="ui-header-title text-sm font-bold -mt-1">Agent Credentials & Access</h3>

          <div className="space-y-2.5 pt-1 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl ui-card-raised border-[var(--border-subtle)]">
              <span className="ui-subtext flex items-center gap-2">
                <Mail className="w-4 h-4" style={{ color: 'var(--brand)' }} /> Email Address
              </span>
              <span className="font-semibold ui-header-title">{user?.email || 'agent@coach.ai'}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl ui-card-raised border-[var(--border-subtle)]">
              <span className="ui-subtext flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: 'var(--success)' }} /> RBAC Permissions
              </span>
              <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
                <Award className="w-3.5 h-3.5" /> Full Coaching Console Access
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl ui-card-raised border-[var(--border-subtle)]">
              <span className="ui-subtext flex items-center gap-2">
                <Award className="w-4 h-4" style={{ color: 'var(--info)' }} /> Performance Level
              </span>
              <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--info)' }}>
                <Calendar className="w-3.5 h-3.5" /> Tier 1 Support Specialist
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};