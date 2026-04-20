import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, Globe, LogOut, Camera, Mail, Lock, Check, Send } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getDisplayName, initialsFromDisplayName } from '../lib/displayName';
import { DASHBOARD_THEMES, DashboardThemeId, getDashboardTheme } from '../lib/dashboardThemes';

type SettingsProps = {
  dashboardTheme: DashboardThemeId;
  onDashboardThemeChange: (theme: DashboardThemeId) => void;
};

export default function Settings({dashboardTheme, onDashboardThemeChange}: SettingsProps) {
  const { user, signOut, updateDisplayName } = useAuth();
  const { language: globalLanguage, timezone: globalTimezone, setLanguage: setGlobalLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [localLanguage, setLocalLanguage] = useState({
    selected: globalLanguage,
    timezone: globalTimezone,
  });

  const sections = [
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'language', label: t('language'), icon: Globe },
    { id: 'appearance', label: 'Appearance', icon: Camera },
  ];

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: 'Product Designer & Minimalist. Building the future of productivity.',
    photoUrl: null as string | null,
  });

  const [resetSent, setResetSent] = useState(false);
  const [profileSavePending, setProfileSavePending] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setProfile(p => ({
      ...p,
      name: getDisplayName(user),
      email: user.email ?? '',
    }));
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocalLanguageChange = (lang: Language) => {
    // We update local state first, but timezone is tied to language in our config
    // In a real app, we might fetch the timezone for that language
    // For now, we'll just update the local state
    setLocalLanguage({
      selected: lang,
      timezone: lang === '日本語' ? 'Japan Standard Time (JST)' : 
                lang === 'Español' || lang === 'Français' || lang === 'Deutsch' ? 'Central European Time (CET)' :
                lang === 'English (UK)' ? 'Greenwich Mean Time (GMT)' : 'Pacific Time (PT)'
    });
  };

  const saveLanguageSettings = () => {
    setGlobalLanguage(localLanguage.selected);
  };

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
            className="space-y-6 max-md:space-y-6 sm:space-y-10"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 max-md:gap-4 sm:gap-8 min-w-0">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 max-md:w-20 max-md:h-20 sm:w-24 sm:h-24 rounded-2xl max-md:rounded-2xl sm:rounded-[32px] bg-black flex items-center justify-center text-white text-2xl max-md:text-2xl sm:text-3xl font-display font-bold overflow-hidden">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    initialsFromDisplayName(profile.name)
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 z-[1] bg-black/40 opacity-0 md:opacity-0 md:group-hover:opacity-100 max-md:opacity-0 max-md:active:opacity-100 max-md:focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white rounded-2xl max-md:rounded-2xl sm:rounded-[32px] pointer-events-auto"
                  aria-label="Change photo"
                >
                  <Camera size={20} className="max-md:w-5 max-md:h-5 sm:w-6 sm:h-6" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoChange} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg max-md:text-lg sm:text-xl font-display font-bold truncate">{profile.name}</h3>
                <p className="text-black/40 text-[13px] max-md:mt-0.5 sm:text-sm">Personal Account</p>
                <div className="flex flex-wrap gap-2 max-md:gap-2 mt-2.5 max-md:mt-2.5 sm:mt-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 max-md:px-3 py-2 max-md:py-1.5 bg-black text-white rounded-lg max-md:rounded-lg sm:rounded-xl text-[11px] max-md:text-[11px] sm:text-xs font-bold hover:scale-105 transition-transform min-h-9 max-md:min-h-9"
                  >
                    Change Photo
                  </button>
                  <button 
                    onClick={() => setProfile({ ...profile, photoUrl: null })}
                    className="px-3.5 max-md:px-3 py-2 max-md:py-1.5 bg-black/5 text-black/60 rounded-lg max-md:rounded-lg sm:rounded-xl text-[11px] max-md:text-[11px] sm:text-xs font-bold hover:bg-black/10 transition-colors min-h-9 max-md:min-h-9"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-md:gap-4 sm:gap-6">
              <div className="space-y-1.5 max-md:space-y-1.5 sm:space-y-2">
                <label className="text-[10px] max-md:text-[10px] sm:text-xs font-bold text-black/40 uppercase tracking-widest ml-0.5 sm:ml-1">{t('name')}</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 max-md:px-4 py-2.5 max-md:py-2.5 sm:px-5 sm:py-3 bg-black/5 border-none rounded-xl max-md:rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all text-[13px] max-md:text-[13px] sm:text-sm font-medium min-h-11 max-md:min-h-11"
                />
              </div>
              <div className="space-y-1.5 max-md:space-y-1.5 sm:space-y-2">
                <label className="text-[10px] max-md:text-[10px] sm:text-xs font-bold text-black/40 uppercase tracking-widest ml-0.5 sm:ml-1">{t('email')}</label>
                <div className="relative">
                  <input 
                    type="email" 
                    readOnly
                    value={profile.email}
                    title={t('email_readonly_hint')}
                    className="w-full px-4 max-md:px-4 py-2.5 max-md:py-2.5 sm:px-5 sm:py-3 pr-11 max-md:pr-10 bg-black/[0.04] border-none rounded-xl max-md:rounded-xl sm:rounded-2xl outline-none text-[13px] max-md:text-[13px] sm:text-sm font-medium min-h-11 max-md:min-h-11 text-black/50 cursor-default"
                  />
                  <Mail size={15} className="absolute right-4 max-md:right-3.5 top-1/2 -translate-y-1/2 text-black/20 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="md:col-span-2 space-y-1.5 max-md:space-y-1.5 sm:space-y-2">
                <label className="text-[10px] max-md:text-[10px] sm:text-xs font-bold text-black/40 uppercase tracking-widest ml-0.5 sm:ml-1">{t('bio')}</label>
                <textarea 
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 max-md:px-4 py-2.5 max-md:py-2.5 sm:px-5 sm:py-3 bg-black/5 border-none rounded-xl max-md:rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all text-[13px] max-md:text-[13px] sm:text-sm font-medium resize-none min-h-[5.5rem] max-md:min-h-[5.25rem]"
                />
              </div>
            </div>

            <div className="pt-4 max-md:pt-4 sm:pt-6 border-t border-black/5 flex flex-col gap-3 items-stretch md:items-end">
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
                    const {error} = await updateDisplayName(profile.name);
                    if (error) setProfileSaveError(error.message);
                  } finally {
                    setProfileSavePending(false);
                  }
                }}
                className="w-full md:w-auto min-h-11 max-md:min-h-11 sm:min-h-12 px-6 max-md:px-6 sm:px-8 py-2.5 max-md:py-2.5 sm:py-3 bg-black text-white rounded-xl max-md:rounded-xl sm:rounded-2xl font-bold text-[13px] max-md:text-[13px] sm:text-sm shadow-lg shadow-black/10 active:scale-[0.99] transition-transform disabled:opacity-50 disabled:pointer-events-none"
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
            className="space-y-6 max-md:space-y-6 sm:space-y-10"
          >
            <section>
              <h3 className="text-base max-md:text-base sm:text-lg font-display font-bold mb-4 max-md:mb-4 sm:mb-6">{t('security')}</h3>
              <div className="p-4 max-md:p-4 sm:p-8 bg-black/5 rounded-2xl max-md:rounded-2xl sm:rounded-[32px] border border-black/5">
                <div className="flex items-start sm:items-center gap-3 max-md:gap-3 sm:gap-6 mb-4 max-md:mb-4 sm:mb-6 min-w-0">
                  <div className="w-11 h-11 max-md:w-11 max-md:h-11 sm:w-14 sm:h-14 rounded-xl max-md:rounded-xl sm:rounded-2xl bg-black flex items-center justify-center text-white shadow-lg shrink-0">
                    <Lock size={22} className="max-md:w-[22px] max-md:h-[22px] sm:w-7 sm:h-7" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-[15px] max-md:text-[15px] sm:text-base">Password Reset</h4>
                    <p className="text-[11px] max-md:text-[11px] sm:text-xs text-black/40 mt-1 leading-snug">For your security, password changes are handled via email verification.</p>
                  </div>
                </div>
                
                <AnimatePresence mode="wait">
                  {!resetSent ? (
                    <motion.div
                      key="reset-button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <p className="text-[13px] max-md:text-[13px] sm:text-sm text-black/60 mb-4 max-md:mb-4 sm:mb-6 leading-relaxed">
                        We will send a secure link to <span className="font-bold text-black break-all">{profile.email}</span> to help you reset your password.
                      </p>
                      <button 
                        onClick={() => {
                          setResetSent(true);
                          setTimeout(() => setResetSent(false), 5000);
                        }}
                        className="w-full min-h-11 max-md:min-h-11 py-3 max-md:py-3 sm:py-4 bg-black text-white rounded-xl max-md:rounded-xl sm:rounded-2xl font-bold text-[13px] max-md:text-[13px] sm:text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-black/10"
                      >
                        <Send size={17} className="max-md:w-[17px] max-md:h-[17px] sm:w-[18px] sm:h-[18px]" />
                        {t('reset')}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reset-success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-3 max-md:py-3 sm:py-4 text-center"
                    >
                      <div className="w-10 h-10 max-md:w-10 max-md:h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 max-md:mb-3 sm:mb-4">
                        <Check size={20} className="max-md:w-5 max-md:h-5 sm:w-6 sm:h-6" />
                      </div>
                      <p className="font-bold text-[15px] max-md:text-[15px] sm:text-base text-emerald-600">Email Sent!</p>
                      <p className="text-[11px] max-md:text-[11px] sm:text-xs text-black/40 mt-1">Check your inbox for the reset link.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
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
            className="space-y-6 max-md:space-y-6 sm:space-y-10"
          >
            <div className="grid grid-cols-1 gap-5 max-md:gap-5 sm:gap-8">
              <div className="space-y-3 max-md:space-y-3 sm:space-y-4">
                <h3 className="text-base max-md:text-base sm:text-lg font-display font-bold">{t('language')}</h3>
                <div className="space-y-1.5 max-md:space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-0.5 sm:ml-1">{t('interface_lang')}</label>
                  <select 
                    value={localLanguage.selected}
                    onChange={(e) => handleLocalLanguageChange(e.target.value as Language)}
                    className="w-full px-4 max-md:px-4 py-2.5 max-md:py-2.5 sm:px-5 sm:py-3 bg-black/5 border-none rounded-xl max-md:rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all text-[13px] max-md:text-[13px] sm:text-sm font-medium appearance-none min-h-11 max-md:min-h-11"
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

              <div className="space-y-3 max-md:space-y-3 sm:space-y-4">
                <h3 className="text-base max-md:text-base sm:text-lg font-display font-bold">{t('date_time')}</h3>
                <div className="space-y-1.5 max-md:space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-0.5 sm:ml-1">{t('timezone')}</label>
                  <div className="w-full px-4 max-md:px-4 py-2.5 max-md:py-2.5 sm:px-5 sm:py-3 bg-black/5 border-none rounded-xl max-md:rounded-xl sm:rounded-2xl text-[13px] max-md:text-[13px] sm:text-sm font-medium text-black/60 flex items-center gap-2.5 max-md:gap-2.5 sm:gap-3 min-h-11 max-md:min-h-11 min-w-0">
                    <Globe size={15} className="text-black/20 shrink-0 max-md:w-[15px] max-md:h-[15px]" />
                    <span className="truncate">{localLanguage.timezone}</span>
                  </div>
                  <p className="text-[10px] text-black/20 italic ml-0.5 sm:ml-1 leading-snug">{t('timezone_sync')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 max-md:p-4 sm:p-6 glass-card rounded-2xl max-md:rounded-2xl sm:rounded-3xl flex items-start sm:items-center gap-3 max-md:gap-3 sm:gap-4 min-w-0">
              <Globe size={18} className="text-black/20 shrink-0 max-md:w-[18px] max-md:h-[18px] sm:w-5 sm:h-5 mt-0.5 sm:mt-0" />
              <p className="text-[11px] max-md:text-[11px] sm:text-xs text-black/40 leading-relaxed min-w-0">
                {t('lang_update_note')}
              </p>
            </div>

            <div className="pt-4 max-md:pt-4 sm:pt-6 border-t border-black/5 flex justify-end">
              <button 
                type="button"
                onClick={saveLanguageSettings}
                className="w-full md:w-auto min-h-11 max-md:min-h-11 sm:min-h-12 px-6 max-md:px-6 sm:px-8 py-2.5 max-md:py-2.5 sm:py-3 bg-black text-white rounded-xl max-md:rounded-xl sm:rounded-2xl font-bold text-[13px] max-md:text-[13px] sm:text-sm shadow-lg shadow-black/10 active:scale-[0.99] transition-transform"
              >
                {t('save')}
              </button>
            </div>
          </motion.div>
        );
      case 'appearance':
        return (
          <motion.div
            key="appearance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 max-md:space-y-6 sm:space-y-10"
          >
            <section className="space-y-4">
              <h3 className="text-base max-md:text-base sm:text-lg font-display font-bold">Dashboard gradient</h3>
              <p className="text-[12px] sm:text-sm text-black/45 leading-relaxed">
                Choose the style used for your dashboard background and Daily Spark card.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {DASHBOARD_THEMES.map(theme => {
                  const selected = theme.id === dashboardTheme;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onDashboardThemeChange(theme.id)}
                      className={`relative rounded-2xl border p-3 text-left transition-all ${
                        selected
                          ? 'border-black/20 ring-2 ring-black/10'
                          : 'border-black/10 hover:border-black/20'
                      }`}
                    >
                      <div
                        className="h-20 w-full rounded-xl"
                        style={{ background: theme.gradient }}
                        aria-hidden
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-black/80">{theme.name}</span>
                        {selected && (
                          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="p-4 sm:p-5 rounded-2xl border border-black/10 bg-black/[0.02]">
              <p className="text-[11px] sm:text-xs text-black/45">
                Current: <span className="font-semibold text-black/70">{getDashboardTheme(dashboardTheme).name}</span>
              </p>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-x-hidden">
      <div className="mb-4 max-md:mb-4 sm:mb-8 shrink-0 min-w-0">
        <h1 className="text-[22px] max-md:leading-tight sm:text-3xl font-display font-bold tracking-tight truncate">{t('settings')}</h1>
        <p className="text-black/40 text-[13px] max-md:mt-1.5 sm:text-sm mt-1 leading-snug">Customize your luminous workspace.</p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 max-md:gap-3 sm:gap-5 lg:gap-8 md:items-stretch">
        {/* Mobile: horizontal pill tabs (scroll) — évite les boutons empilés difficiles à activer */}
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
                  <Icon size={17} className="shrink-0" />
                  {section.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => void signOut()}
              className="snap-start flex shrink-0 items-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-rose-600 bg-rose-50/90 active:bg-rose-100 border border-rose-100"
            >
              <LogOut size={17} className="shrink-0" />
              {t('signout')}
            </button>
          </div>
        </div>

        {/* Desktop / tablet ≥768px: sidebar verticale comme la maquette */}
        <aside className="hidden md:flex md:w-56 lg:w-64 shrink-0 flex-col gap-2 min-h-0">
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
                    : 'text-black/40 hover:bg-black/5 hover:text-black'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {section.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-auto flex w-full min-h-11 items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-rose-500 hover:bg-rose-50 transition-colors text-left"
          >
            <LogOut size={18} className="shrink-0" />
            {t('signout')}
          </button>
        </aside>

        {/* Content */}
        <div className="flex-1 min-h-0 min-w-0 glass-panel rounded-2xl max-md:rounded-2xl sm:rounded-[40px] p-4 max-md:p-4 sm:p-8 lg:p-10 overflow-y-auto overflow-x-hidden border border-black/5 [scrollbar-width:thin] relative z-0">
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
