import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, Globe, LogOut, Camera, Mail, Lock, Check, Send } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';

interface SettingsProps {
  onSignOut?: () => void;
}

export default function Settings({ onSignOut }: SettingsProps) {
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
  ];

  const [profile, setProfile] = useState({
    name: 'Alex Rivera',
    email: 'alex.rivera@luminous.io',
    bio: 'Product Designer & Minimalist. Building the future of productivity.',
    photoUrl: null as string | null,
  });

  const [resetSent, setResetSent] = useState(false);

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="flex items-center gap-10">
              <div className="relative group">
                <div className="w-32 h-32 rounded-[48px] bg-ink flex items-center justify-center text-canvas text-4xl font-bold overflow-hidden shadow-2xl">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile.name.split(' ').map(n => n[0]).join('')
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-[48px] backdrop-blur-sm"
                >
                  <Camera size={32} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoChange} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tight uppercase">{profile.name}</h3>
                <p className="text-muted text-[11px] font-bold uppercase tracking-[0.3em] mt-1">Personal Account</p>
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-ink text-canvas rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-black/10"
                  >
                    Change Photo
                  </button>
                  <button 
                    onClick={() => setProfile({ ...profile, photoUrl: null })}
                    className="px-6 py-2 bg-white text-ink rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-colors border border-black/5"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted uppercase tracking-[0.3em] ml-1">{t('name')}</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-8 py-4 bg-white border border-black/5 rounded-3xl outline-none focus:ring-4 focus:ring-black/5 transition-all text-lg font-bold uppercase tracking-tight"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted uppercase tracking-[0.3em] ml-1">{t('email')}</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-8 py-4 bg-white border border-black/5 rounded-3xl outline-none focus:ring-4 focus:ring-black/5 transition-all text-lg font-bold uppercase tracking-tight"
                  />
                  <Mail size={20} className="absolute right-8 top-1/2 -translate-y-1/2 text-ink/20" />
                </div>
              </div>
              <div className="col-span-2 space-y-3">
                <label className="text-[11px] font-bold text-muted uppercase tracking-[0.3em] ml-1">{t('bio')}</label>
                <textarea 
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={4}
                  className="w-full px-8 py-4 bg-white border border-black/5 rounded-3xl outline-none focus:ring-4 focus:ring-black/5 transition-all text-lg font-medium resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-8 border-t border-black/5 flex justify-end">
              <button className="px-10 py-4 bg-ink text-canvas rounded-2xl font-bold text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-black/10 hover:scale-105 transition-transform">
                {t('save')}
              </button>
            </div>
          </motion.div>
        );
      case 'security':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <section>
              <h3 className="text-2xl font-bold uppercase tracking-tight mb-8">{t('security')}</h3>
              <div className="p-12 bg-white rounded-[48px] border border-black/5 shadow-xl shadow-black/5">
                <div className="flex items-center gap-8 mb-10">
                  <div className="w-20 h-20 rounded-3xl bg-ink flex items-center justify-center text-canvas shadow-2xl">
                    <Lock size={36} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold uppercase tracking-tight">Password Reset</h4>
                    <p className="text-[11px] font-bold text-muted uppercase tracking-widest mt-2 opacity-60">For your security, password changes are handled via email verification.</p>
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
                      <p className="text-lg text-ink/60 mb-10 leading-relaxed font-medium">
                        We will send a secure link to <span className="font-bold text-ink underline underline-offset-4 decoration-2">{profile.email}</span> to help you reset your password.
                      </p>
                      <button 
                        onClick={() => {
                          setResetSent(true);
                          setTimeout(() => setResetSent(false), 5000);
                        }}
                        className="w-full py-6 bg-ink text-canvas rounded-3xl font-bold text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-2xl shadow-black/10"
                      >
                        <Send size={20} />
                        {t('reset')}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reset-success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-8 text-center"
                    >
                      <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-emerald-200">
                        <Check size={40} strokeWidth={3} />
                      </div>
                      <p className="text-2xl font-bold text-emerald-600 uppercase tracking-tight">Email Sent!</p>
                      <p className="text-[11px] font-bold text-muted uppercase tracking-widest mt-2 opacity-60">Check your inbox for the reset link.</p>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="grid grid-cols-1 gap-12">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold uppercase tracking-tight">{t('language')}</h3>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-[0.3em] ml-1">{t('interface_lang')}</label>
                  <div className="relative">
                    <select 
                      value={localLanguage.selected}
                      onChange={(e) => handleLocalLanguageChange(e.target.value as Language)}
                      className="w-full px-8 py-4 bg-white border border-black/5 rounded-3xl outline-none focus:ring-4 focus:ring-black/5 transition-all text-lg font-bold uppercase tracking-tight appearance-none cursor-pointer"
                    >
                      <option>English (US)</option>
                      <option>English (UK)</option>
                      <option>Español</option>
                      <option>Français</option>
                      <option>Deutsch</option>
                      <option>日本語</option>
                    </select>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Globe size={20} className="text-ink/20" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-bold uppercase tracking-tight">{t('date_time')}</h3>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-[0.3em] ml-1">{t('timezone')}</label>
                  <div className="w-full px-8 py-4 bg-white border border-black/5 rounded-3xl text-lg font-bold uppercase tracking-tight text-ink/60 flex items-center gap-4">
                    <Globe size={20} className="text-ink/20" />
                    {localLanguage.timezone}
                  </div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest italic ml-1 opacity-40">{t('timezone_sync')}</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-ink/5 rounded-[32px] flex items-center gap-6 border border-black/5">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-black/5">
                <Globe size={24} className="text-ink/40" />
              </div>
              <p className="text-sm text-ink/60 leading-relaxed font-medium">
                {t('lang_update_note')}
              </p>
            </div>

            <div className="pt-8 border-t border-black/5 flex justify-end">
              <button 
                onClick={saveLanguageSettings}
                className="px-10 py-4 bg-ink text-canvas rounded-2xl font-bold text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-black/10 hover:scale-105 transition-transform"
              >
                {t('save')}
              </button>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-12 pt-4">
        <h1 className="text-5xl font-bold tracking-tight uppercase">{t('settings')}</h1>
        <p className="text-muted text-sm font-bold uppercase tracking-widest opacity-60 mt-2">Customize your luminous workspace.</p>
      </div>

      <div className="flex-1 flex gap-12 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex flex-col gap-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
                  isActive 
                    ? 'bg-ink text-canvas shadow-xl shadow-black/10 scale-105' 
                    : 'text-muted hover:bg-black/5 hover:text-ink'
                }`}
              >
                <Icon size={20} />
                {section.label}
              </button>
            );
          })}
          <button 
            onClick={onSignOut}
            className="mt-auto flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-[11px] uppercase tracking-[0.2em]"
          >
            <LogOut size={20} />
            {t('signout')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-surface/50 rounded-[48px] p-12 overflow-y-auto no-scrollbar border border-black/5 shadow-inner">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
