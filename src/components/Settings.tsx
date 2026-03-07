import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, Globe, LogOut, Camera, Mail, Lock, Check, Send } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';

export default function Settings() {
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
            className="space-y-10"
          >
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="w-24 h-24 rounded-[32px] bg-black flex items-center justify-center text-white text-3xl font-display font-bold overflow-hidden">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile.name.split(' ').map(n => n[0]).join('')
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-[32px]"
                >
                  <Camera size={24} />
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
                <h3 className="text-xl font-display font-bold">{profile.name}</h3>
                <p className="text-black/40 text-sm">Personal Account</p>
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-1.5 bg-black text-white rounded-xl text-xs font-bold hover:scale-105 transition-transform"
                  >
                    Change Photo
                  </button>
                  <button 
                    onClick={() => setProfile({ ...profile, photoUrl: null })}
                    className="px-4 py-1.5 bg-black/5 text-black/60 rounded-xl text-xs font-bold hover:bg-black/10 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">{t('name')}</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-5 py-3 bg-black/5 border-none rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">{t('email')}</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-5 py-3 bg-black/5 border-none rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm font-medium"
                  />
                  <Mail size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black/20" />
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">{t('bio')}</label>
                <textarea 
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  className="w-full px-5 py-3 bg-black/5 border-none rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm font-medium resize-none"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-black/5 flex justify-end">
              <button className="px-8 py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-lg shadow-black/10 hover:scale-105 transition-transform">
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
            className="space-y-10"
          >
            <section>
              <h3 className="text-lg font-display font-bold mb-6">{t('security')}</h3>
              <div className="p-8 bg-black/5 rounded-[32px] border border-black/5">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center text-white shadow-lg">
                    <Lock size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold">Password Reset</h4>
                    <p className="text-xs text-black/40 mt-1">For your security, password changes are handled via email verification.</p>
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
                      <p className="text-sm text-black/60 mb-6 leading-relaxed">
                        We will send a secure link to <span className="font-bold text-black">{profile.email}</span> to help you reset your password.
                      </p>
                      <button 
                        onClick={() => {
                          setResetSent(true);
                          setTimeout(() => setResetSent(false), 5000);
                        }}
                        className="w-full py-4 bg-black text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-black/10"
                      >
                        <Send size={18} />
                        {t('reset')}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reset-success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-4 text-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4">
                        <Check size={24} />
                      </div>
                      <p className="font-bold text-emerald-600">Email Sent!</p>
                      <p className="text-xs text-black/40 mt-1">Check your inbox for the reset link.</p>
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
            className="space-y-10"
          >
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-display font-bold">{t('language')}</h3>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">{t('interface_lang')}</label>
                  <select 
                    value={localLanguage.selected}
                    onChange={(e) => handleLocalLanguageChange(e.target.value as Language)}
                    className="w-full px-5 py-3 bg-black/5 border-none rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm font-medium appearance-none"
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

              <div className="space-y-4">
                <h3 className="text-lg font-display font-bold">{t('date_time')}</h3>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">{t('timezone')}</label>
                  <div className="w-full px-5 py-3 bg-black/5 border-none rounded-2xl text-sm font-medium text-black/60 flex items-center gap-3">
                    <Globe size={16} className="text-black/20" />
                    {localLanguage.timezone}
                  </div>
                  <p className="text-[10px] text-black/20 italic ml-1">{t('timezone_sync')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 glass-card rounded-3xl flex items-center gap-4">
              <Globe size={20} className="text-black/20" />
              <p className="text-xs text-black/40 leading-relaxed">
                {t('lang_update_note')}
              </p>
            </div>

            <div className="pt-6 border-t border-black/5 flex justify-end">
              <button 
                onClick={saveLanguageSettings}
                className="px-8 py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-lg shadow-black/10 hover:scale-105 transition-transform"
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
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight">{t('settings')}</h1>
        <p className="text-black/40 text-sm mt-1">Customize your luminous workspace.</p>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex flex-col gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-black text-white shadow-lg shadow-black/10 scale-105' 
                    : 'text-black/40 hover:bg-black/5 hover:text-black'
                }`}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
          <button className="mt-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all font-medium text-sm">
            <LogOut size={18} />
            {t('signout')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 glass-panel rounded-[40px] p-10 overflow-y-auto no-scrollbar border border-black/5">
          <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
