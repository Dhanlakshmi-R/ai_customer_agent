import React from 'react';
import { User as UserIcon, Shield, Mail, Calendar, Award } from 'lucide-react';
import { useStore } from '../store/useStore';

export const ProfilePage: React.FC = () => {
  const { user } = useStore();

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">User Profile</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your support coach credentials and role access settings.</p>
      </div>

      <div className="max-w-xl p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center font-bold text-2xl text-white shadow-xl">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">{user?.full_name || 'Support Agent'}</h2>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold uppercase bg-indigo-950 text-indigo-400 border border-indigo-800/40">
              {user?.role || 'agent'}
            </span>
          </div>
        </div>

        <div className="space-y-4 text-xs border-t border-slate-800 pt-6">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" /> Email Address
            </span>
            <span className="font-semibold text-slate-200">{user?.email || 'agent@coach.ai'}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> RBAC Permissions
            </span>
            <span className="font-semibold text-emerald-400">Full Coaching Console Access</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" /> Performance Level
            </span>
            <span className="font-semibold text-purple-400">Tier 1 Support Specialist</span>
          </div>
        </div>
      </div>
    </div>
  );
};
