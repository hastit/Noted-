import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, Globe, LogOut, Camera, Mail, Lock, Check, Send, Bell, Database, Download, AlertTriangle, Trash2, ExternalLink, FileText, Scale } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getDisplayName, initialsFromDisplayName } from '../lib/displayName';

/** Public legal URLs — also used for App Store Connect / Guideline 3.1.2 compliance. */
const PRIVACY_POLICY_URL = 'https://noted-phi-sand.vercel.app/privacy';
const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

type SettingsProps = {
  dashboardTheme?: string;
  onDashboardThemeChange?: (theme: string) => void;
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:outline-none ${
        checked ? 'bg-black' : 'bg-black/[0.14]'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-black/[0.05] last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] sm:text-sm font-semibold text-black/80 leading-snug">{label}</p>
        <p className="text-[11px] sm:text-xs text-black/35 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

const NOTIF_KEY = 'noted_notifications';
const defaultNotifications = {
  dailyDigest: true,
  taskReminders: true,
  weeklyReview: false,
  schedulerUpdates: true,
};

function loadNotifications() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return { ...defaultNotifications, ...JSON.parse(raw) };
  } catch {}
  return defaultNotifications;
}

export default function Settings({ dashboardTheme, onDashboardThemeChange }: SettingsProps) {
  const { user, signOut, updateDisplayName } = useAuth();
  const { language: globalLanguage, timezone: globalTimezone, setLanguage: setGlobalLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localLanguage, setLocalLanguage] = useState({
    selected: globalLanguage,
    timezone: globalTimezone,
  });

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: 'Building the future of productivity.',
    photoUrl: null as string | null,
  });

  const [resetSent, setResetSent] = useState(false);
  const [profileSavePending, setProfileSavePending] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState(loadNotifications);
  const [notifSaved, setNotifSaved] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile(p => ({ ...p, name: getDisplayName(user), email: user.email ?? '' }));
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfile({ ...profile, photoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleLocalLanguageChange = (lang: Language) => {
    setLocalLanguage({
      selected: lang,
      timezone:
        lang === '日本語' ? 'Japan Standard Time (JST)' :
        lang === 'Español' || lang === 'Français' || lang === 'Deutsch' ? 'Central European Time (CET)' :
        lang === 'English (UK)' ? 'Greenwich Mean Time (GMT)' : 'Pacific Time (PT)',
    });
  };

  const saveLanguageSettings = () => setGlobalLanguage(localLanguage.selected);

  const toggleNotif = (key: keyof typeof defaultNotifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveNotifications = () => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      email: profile.email,
      note: 'Full data export — import coming soon.',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noted-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  };

  const sections = [
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'language', label: t('language'), icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: Database },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 sm:space-y-10"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 min-w-0">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-[32px] bg-black flex items-center justify-center text-white text-2xl sm:text-3xl font-bold overflow-hidden">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    initialsFromDisplayName(profile.name)
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 z-[1] bg-black/40 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center text-white rounded-2xl sm:rounded-[32px]"
                  aria-label="Change photo"
                >
                  <Camera size={20} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold truncate">{profile.name}</h3>
                <p className="text-black/40 text-[13px] sm:text-sm mt-0.5">Personal Account</p>
                <div className="flex flex-wrap gap-2 mt-2.5 sm:mt-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-black text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold hover:opacity-80 transition-opacity min-h-9"
                  >
                    Change Photo
                  </button>
                  <button
                    onClick={() => setProfile({ ...profile, photoUrl: null })}
                    className="px-3.5 py-2 bg-black/5 text-black/60 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold hover:bg-black/10 transition-colors min-h-9"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[10px] font-semibold text-black/35 uppercase tracking-widest block">{t('name')}</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-black/[0.04] border-none rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-black/10 transition-all text-[13px] sm:text-sm font-medium min-h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[10px] font-semibold text-black/35 uppercase tracking-widest block">{t('email')}</label>
                <div className="relative">
                  <input
                    type="email"
                    readOnly
                    value={profile.email}
                    title={t('email_readonly_hint')}
                    className="w-full px-4 py-2.5 sm:px-5 sm:py-3 pr-11 bg-black/[0.03] border-none rounded-xl sm:rounded-2xl outline-none text-[13px] sm:text-sm font-medium min-h-11 text-black/45 cursor-default"
                  />
                  <Mail size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20" />
                </div>
              </div>
              <div className="md:col-span-2 space-y-1.5 sm:space-y-2">
                <label className="text-[10px] font-semibold text-black/35 uppercase tracking-widest block">{t('bio')}</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-black/[0.04] border-none rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-black/10 transition-all text-[13px] sm:text-sm font-medium resize-none"
                />
              </div>
            </div>

            <div className="pt-4 sm:pt-6 border-t border-black/[0.06] flex flex-col gap-3 items-stretch md:items-end">
              {profileSaveError && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 md:text-right md:max-w-md md:ml-auto">{profileSaveError}</p>
              )}
              <button
                type="button"
                disabled={profileSavePending || !profile.name.trim()}
                onClick={async () => {
                  setProfileSaveError(null);
                  setProfileSavePending(true);
                  try {
                    const { error } = await updateDisplayName(profile.name);
                    if (error) setProfileSaveError(error.message);
                  } finally {
                    setProfileSavePending(false);
                  }
                }}
                className="w-full md:w-auto min-h-11 sm:min-h-12 px-6 sm:px-8 py-2.5 sm:py-3 bg-black text-white rounded-xl sm:rounded-2xl font-semibold text-[13px] sm:text-sm shadow-lg shadow-black/10 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {profileSavePending ? '…' : t('save')}
              </button>
            </div>
          </motion.div>
        );

      case 'security':
        return (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 sm:space-y-10"
          >
            <section>
              <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6">{t('security')}</h3>
              <div className="p-4 sm:p-8 bg-black/[0.03] rounded-2xl sm:rounded-[32px] border border-black/[0.06]">
                <div className="flex items-start sm:items-center gap-3 sm:gap-6 mb-4 sm:mb-6 min-w-0">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-black flex items-center justify-center text-white shadow-lg shrink-0">
                    <Lock size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-[15px] sm:text-base">Password Reset</h4>
                    <p className="text-[11px] sm:text-xs text-black/40 mt-1 leading-snug">For your security, password changes are handled via email verification.</p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {!resetSent ? (
                    <motion.div key="reset-button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <p className="text-[13px] sm:text-sm text-black/60 mb-4 sm:mb-6 leading-relaxed">
                        We will send a secure link to <span className="font-bold text-black break-all">{profile.email}</span> to reset your password.
                      </p>
                      <button
                        onClick={() => { setResetSent(true); setTimeout(() => setResetSent(false), 5000); }}
                        className="w-full min-h-11 py-3 sm:py-4 bg-black text-white rounded-xl sm:rounded-2xl font-semibold text-[13px] sm:text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-opacity shadow-xl shadow-black/10"
                      >
                        <Send size={16} />
                        {t('reset')}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reset-success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-3 sm:py-4 text-center"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3">
                        <Check size={20} />
                      </div>
                      <p className="font-bold text-[15px] sm:text-base text-emerald-600">Email Sent!</p>
                      <p className="text-[11px] sm:text-xs text-black/40 mt-1">Check your inbox for the reset link.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            <section>
              <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6">Active Sessions</h3>
              <div className="rounded-2xl border border-black/[0.07] overflow-hidden">
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4 bg-black/[0.01]">
                  <div className="min-w-0">
                    <p className="text-[13px] sm:text-sm font-semibold">Current session</p>
                    <p className="text-[11px] sm:text-xs text-black/35 mt-0.5">{navigator.userAgent.includes('Mac') ? 'macOS' : navigator.userAgent.includes('Win') ? 'Windows' : 'Unknown'} · {new Date().toLocaleDateString()}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">Active</span>
                </div>
              </div>
            </section>
          </motion.div>
        );

      case 'language':
        return (
          <motion.div
            key="language"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 sm:space-y-10"
          >
            <div className="grid grid-cols-1 gap-5 sm:gap-8">
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-bold">{t('language')}</h3>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-semibold text-black/35 uppercase tracking-widest block">{t('interface_lang')}</label>
                  <select
                    value={localLanguage.selected}
                    onChange={(e) => handleLocalLanguageChange(e.target.value as Language)}
                    className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-black/[0.04] border-none rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-black/10 transition-all text-[13px] sm:text-sm font-medium appearance-none min-h-11"
                  >
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Español</option>
                    <option>Français</option>
                    <option>Deutsch</option>
                    <option>日本語</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-bold">{t('date_time')}</h3>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-semibold text-black/35 uppercase tracking-widest block">{t('timezone')}</label>
                  <div className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-black/[0.04] border-none rounded-xl sm:rounded-2xl text-[13px] sm:text-sm font-medium text-black/55 flex items-center gap-2.5 sm:gap-3 min-h-11 min-w-0">
                    <Globe size={15} className="text-black/20 shrink-0" />
                    <span className="truncate">{localLanguage.timezone}</span>
                  </div>
                  <p className="text-[10px] text-black/25 italic leading-snug">{t('timezone_sync')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl border border-black/[0.07] flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 bg-black/[0.01]">
              <Globe size={16} className="text-black/20 shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-[11px] sm:text-xs text-black/40 leading-relaxed min-w-0">{t('lang_update_note')}</p>
            </div>

            <div className="pt-4 sm:pt-6 border-t border-black/[0.06] flex justify-end">
              <button
                type="button"
                onClick={saveLanguageSettings}
                className="w-full md:w-auto min-h-11 sm:min-h-12 px-6 sm:px-8 py-2.5 sm:py-3 bg-black text-white rounded-xl sm:rounded-2xl font-semibold text-[13px] sm:text-sm shadow-lg shadow-black/10 active:scale-[0.99] transition-all"
              >
                {t('save')}
              </button>
            </div>
          </motion.div>
        );

      case 'notifications':
        return (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <section className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold mb-1">Email Notifications</h3>
              <p className="text-[12px] sm:text-sm text-black/40 mb-5 leading-relaxed">
                Choose what you hear about. All emails go to <span className="font-semibold text-black/60">{profile.email}</span>.
              </p>
              <div className="rounded-2xl border border-black/[0.07] overflow-hidden divide-y divide-black/[0.05]">
                <div className="px-5 py-1">
                  <ToggleRow
                    label="Daily Digest"
                    description="A brief summary of your day — tasks, notes, and schedule — delivered each morning."
                    checked={notifications.dailyDigest}
                    onChange={() => toggleNotif('dailyDigest')}
                  />
                  <ToggleRow
                    label="Task Reminders"
                    description="Get reminded when a task deadline is approaching."
                    checked={notifications.taskReminders}
                    onChange={() => toggleNotif('taskReminders')}
                  />
                  <ToggleRow
                    label="Weekly Review"
                    description="A Monday summary of your previous week's activity and upcoming goals."
                    checked={notifications.weeklyReview}
                    onChange={() => toggleNotif('weeklyReview')}
                  />
                  <ToggleRow
                    label="AI Scheduler Updates"
                    description="Get notified when your AI-generated schedule changes or a conflict is detected."
                    checked={notifications.schedulerUpdates}
                    onChange={() => toggleNotif('schedulerUpdates')}
                  />
                </div>
              </div>
            </section>

            <div className="pt-4 sm:pt-6 border-t border-black/[0.06] flex flex-col gap-3 items-stretch md:items-end">
              <AnimatePresence>
                {notifSaved && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[12px] font-semibold text-emerald-600 flex items-center gap-1.5 md:justify-end"
                  >
                    <Check size={13} />
                    Preferences saved
                  </motion.p>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={saveNotifications}
                className="w-full md:w-auto min-h-11 sm:min-h-12 px-6 sm:px-8 py-2.5 sm:py-3 bg-black text-white rounded-xl sm:rounded-2xl font-semibold text-[13px] sm:text-sm shadow-lg shadow-black/10 active:scale-[0.99] transition-all"
              >
                Save Preferences
              </button>
            </div>
          </motion.div>
        );

      case 'data':
        return (
          <motion.div
            key="data"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <section className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold">Export Your Data</h3>
                <p className="text-[12px] sm:text-sm text-black/40 mt-1 leading-relaxed">
                  Download a copy of everything in your workspace — notes, tasks, calendar events, and settings.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-black/[0.08] bg-black/[0.01] hover:bg-black/[0.04] hover:border-black/[0.14] transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex items-center justify-center shrink-0 group-hover:bg-black/[0.08] transition-colors">
                    <Download size={17} className="text-black/55" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] sm:text-sm">Export as JSON</p>
                    <p className="text-[10px] sm:text-[11px] text-black/35 mt-0.5">Complete workspace data</p>
                  </div>
                  {exportDone && (
                    <Check size={14} className="text-emerald-500 ml-auto shrink-0" />
                  )}
                </button>
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-black/[0.06] bg-black/[0.01] text-left opacity-50 cursor-not-allowed">
                  <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex items-center justify-center shrink-0">
                    <Download size={17} className="text-black/40" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] sm:text-sm">Export Calendar (ICS)</p>
                    <p className="text-[10px] sm:text-[11px] text-black/30 mt-0.5">Coming soon</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold">Privacy</h3>
                <p className="text-[12px] sm:text-sm text-black/40 mt-1 leading-relaxed">
                  Your data is stored securely and never shared with third parties. Notes and tasks are end-to-end associated with your account.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Encrypted at rest', desc: 'All data is encrypted in storage' },
                  { label: 'No ads, ever', desc: 'Your data is never used for advertising' },
                  { label: 'GDPR compliant', desc: 'Full right to deletion on request' },
                ].map(item => (
                  <div key={item.label} className="p-3.5 rounded-xl border border-black/[0.06] bg-black/[0.01]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <p className="text-[12px] sm:text-[13px] font-semibold">{item.label}</p>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-black/35 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={PRIVACY_POLICY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-2xl border border-black/[0.08] bg-black/[0.01] hover:bg-black/[0.04] hover:border-black/[0.14] transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex items-center justify-center shrink-0 group-hover:bg-black/[0.08] transition-colors">
                    <FileText size={17} className="text-black/55" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[13px] sm:text-sm">Privacy Policy</p>
                    <p className="text-[10px] sm:text-[11px] text-black/35 mt-0.5">How we collect and use your data</p>
                  </div>
                  <ExternalLink size={14} className="text-black/30 shrink-0" aria-hidden />
                </a>
                <a
                  href={TERMS_OF_USE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-2xl border border-black/[0.08] bg-black/[0.01] hover:bg-black/[0.04] hover:border-black/[0.14] transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex items-center justify-center shrink-0 group-hover:bg-black/[0.08] transition-colors">
                    <Scale size={17} className="text-black/55" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[13px] sm:text-sm">Terms of Use</p>
                    <p className="text-[10px] sm:text-[11px] text-black/35 mt-0.5">License agreement (EULA)</p>
                  </div>
                  <ExternalLink size={14} className="text-black/30 shrink-0" aria-hidden />
                </a>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-rose-600">Danger Zone</h3>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 overflow-hidden">
                <div className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] sm:text-sm text-rose-800">Delete Account</p>
                    <p className="text-[11px] sm:text-xs text-rose-500/80 mt-0.5 leading-snug">
                      Permanently remove your account and all associated data. This cannot be undone.
                    </p>
                  </div>
                  {!deleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(true)}
                      className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-semibold text-rose-600 border border-rose-200 bg-white hover:bg-rose-50 transition-colors min-h-9"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  ) : (
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(false)}
                        className="px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold text-black/50 border border-black/10 bg-white hover:bg-black/[0.04] transition-colors min-h-9"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        className="px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors min-h-9"
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-x-hidden">
      <div className="mb-4 sm:mb-8 shrink-0 min-w-0">
        <h1 className="text-[22px] sm:text-3xl font-bold tracking-tight truncate">{t('settings')}</h1>
        <p className="text-black/40 text-[13px] sm:text-sm mt-1 leading-snug">Manage your account, preferences and privacy.</p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 sm:gap-5 lg:gap-8 md:items-stretch">
        {/* Mobile: horizontal pill tabs */}
        <div className="md:hidden shrink-0 -mx-0.5 px-0.5">
          <div className="flex flex-nowrap items-stretch gap-2 overflow-x-auto overflow-y-hidden pb-1.5 [scrollbar-width:thin] overscroll-x-contain touch-pan-x snap-x snap-mandatory">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-pressed={isActive}
                  className={`snap-start flex shrink-0 items-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors active:scale-[0.98] ${
                    isActive
                      ? 'bg-black text-white shadow-md shadow-black/15'
                      : 'bg-black/[0.06] text-black/55 active:bg-black/10'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {section.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => void signOut()}
              className="snap-start flex shrink-0 items-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-rose-600 bg-rose-50/90 active:bg-rose-100 border border-rose-100"
            >
              <LogOut size={16} className="shrink-0" />
              {t('signout')}
            </button>
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-52 lg:w-60 shrink-0 flex-col gap-1 min-h-0">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full min-h-11 items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-left transition-all ${
                  isActive
                    ? 'bg-black text-white shadow-lg shadow-black/10 scale-[1.02]'
                    : 'text-black/40 hover:bg-black/[0.05] hover:text-black'
                }`}
              >
                <Icon size={17} className="shrink-0" />
                {section.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-auto flex w-full min-h-11 items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-rose-500 hover:bg-rose-50 transition-colors text-left"
          >
            <LogOut size={17} className="shrink-0" />
            {t('signout')}
          </button>
        </aside>

        {/* Content panel */}
        <div className="flex-1 min-h-0 min-w-0 glass-panel rounded-2xl sm:rounded-[40px] p-4 sm:p-8 lg:p-10 overflow-y-auto overflow-x-hidden border border-black/[0.05] [scrollbar-width:thin] relative z-0">
          <div className="w-full max-w-2xl mx-auto min-w-0 max-md:max-w-none">
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
