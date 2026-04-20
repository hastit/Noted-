import React, {lazy, Suspense, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {motion} from 'motion/react';
import {Eye, EyeOff, Lock, Mail, User} from 'lucide-react';
import {useAuth} from '../context/AuthContext';

const ShaderHeroBackground = lazy(() => import('../pages/ShaderHeroBackground'));

type AuthScreenProps = {
  initialMode?: 'login' | 'signup';
};

const pillInput =
  'h-12 w-full rounded-[50px] border-[1.5px] border-[#E5E5E5] bg-[#FAFAFA] text-sm text-neutral-900 placeholder:text-[#AAAAAA] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#0D0D0D] focus:shadow-[0_0_0_3px_rgba(13,13,13,0.12)]';

const staggerContainer = {
  hidden: {opacity: 0},
  show: {
    opacity: 1,
    transition: {staggerChildren: 0.08, delayChildren: 0.06},
  },
};

const staggerItem = {
  hidden: {opacity: 0, y: 14},
  show: {
    opacity: 1,
    y: 0,
    transition: {duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number]},
  },
};

/** Liste de champs : enfants directs pour le stagger (motion.form). */
const formStagger = {
  hidden: {},
  show: {
    transition: {staggerChildren: 0.08, delayChildren: 0.04},
  },
};

function GoogleMark({className}: {className?: string}) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function passwordStrength(pw: string): {fill: number; tier: 'weak' | 'medium' | 'strong'} {
  if (!pw) return {fill: 0, tier: 'weak'};
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const fill = Math.min(100, (score / 5) * 100);
  const tier: 'weak' | 'medium' | 'strong' = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  return {fill, tier};
}

function AuthBrandingPanel({mode}: {mode: 'login' | 'signup'}) {
  const tagline =
    mode === 'login' ? 'Welcome back. Your space is waiting.' : 'Your calm workspace starts here.';

  return (
    <aside className="relative flex h-[200px] w-full shrink-0 flex-col overflow-hidden border-b border-black/[0.06] md:h-auto md:min-h-screen md:w-1/2 md:border-b-0 md:border-r md:border-black/[0.06]">
      <Suspense
        fallback={<div className="absolute inset-0 bg-gradient-to-br from-[#F57799] via-[#dbba95] to-[#FAAC68]" aria-hidden />}
      >
        <ShaderHeroBackground />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/35 md:from-black/20" aria-hidden />

      {/* Colonne max-w-[380px] : texte uniquement (logo Noted uniquement à droite sur le formulaire) */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-6 pb-10 pt-12 md:px-12 md:pb-20 md:pt-24">
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col items-start text-left">
          {/* justify-start + items-start : pas de centrage vertical qui déplace le bloc entre login/signup */}
          <div className="flex min-h-0 flex-1 flex-col justify-start gap-5 md:gap-6">
            <div className="flex h-[3.5rem] w-full shrink-0 items-start justify-start md:h-[11rem] lg:h-[12rem]">
              <h2 className="w-full font-display text-xl font-semibold leading-snug tracking-tight text-white drop-shadow-md md:text-3xl md:leading-[1.15] lg:text-4xl lg:leading-[1.12]">
                {tagline}
              </h2>
            </div>

            <div className="hidden w-full shrink-0 flex-wrap items-start justify-start gap-2 md:flex">
              {['Notes', 'Tasks', 'Calendar'].map(label => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-md"
                >
                  <span className="text-[10px]">✦</span> {label}
                </span>
              ))}
            </div>

            <p className="hidden w-full text-left text-xs leading-relaxed text-white/60 md:block">
              Built for students & creators · Free forever
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function AuthScreen({initialMode = 'login'}: AuthScreenProps) {
  const mode = initialMode;
  const {signIn, signUp, signInWithGoogle, resetPasswordForEmail, configured} = useAuth();
  /** Activer explicitement après configuration du provider Google dans Supabase. */
  const googleOAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_OAUTH === 'true';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const strengthColor =
    strength.tier === 'weak' ? 'bg-red-500' : strength.tier === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === 'signup') {
      if (fullName.trim().length < 2) {
        setError('Please enter your name (at least 2 characters).');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setPending(true);
    try {
      if (mode === 'login') {
        const {error: err} = await signIn(email.trim(), password);
        if (err) setError(err.message);
      } else {
        const {error: err} = await signUp(email.trim(), password, fullName.trim());
        if (err) setError(err.message);
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    const {error: err} = await resetPasswordForEmail(email);
    if (err) setError(err.message);
    else setInfo('Check your email for a reset link.');
  };

  const handleGoogle = async () => {
    if (!googleOAuthEnabled) return;
    setError(null);
    setGooglePending(true);
    try {
      const {error: err} = await signInWithGoogle();
      if (err) setError(err.message);
    } finally {
      setGooglePending(false);
    }
  };

  if (!configured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-display text-2xl font-bold">Noted</h1>
          <p className="text-sm leading-relaxed text-black/50">
            Configure <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{' '}
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">.env.local</code>, then restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white md:min-h-screen md:flex-row">
      <AuthBrandingPanel mode={mode} />

      {/* justify-start : évite le centrage vertical qui déplace le header selon la hauteur du formulaire (login vs signup) */}
      <div className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto overscroll-y-contain px-6 pb-10 pt-6 md:px-12 md:pb-20 md:pt-10">
        <div className="mx-auto flex w-full max-w-[380px] flex-col gap-6 pb-4">
          {/* En-tête statique : alignement identique login / signup (gauche, même grille que le panneau gradient) */}
          <div className="flex shrink-0 flex-col gap-4">
            <div className="flex h-11 shrink-0 justify-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 shadow-sm">
                <div className="h-4 w-4 rotate-45 rounded-sm bg-white" />
              </div>
            </div>
            <div className="min-h-[8.25rem] shrink-0 text-left md:min-h-[7.5rem]">
              <h1 className="min-h-[4rem] text-[28px] font-bold leading-[1.15] tracking-tight text-neutral-900 md:min-h-[3.25rem]">
                {mode === 'login' ? 'Sign in' : 'Create your account'}
              </h1>
              <p className="mt-2 min-h-[3.5rem] text-sm leading-snug text-neutral-500 md:min-h-[3.25rem]">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <Link to="/signup" className="font-semibold text-rose-600 transition hover:text-rose-700">
                      Create one →
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-rose-600 transition hover:text-rose-700">
                      Sign in →
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>

          <motion.div
            key={mode}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex min-h-0 flex-col gap-4"
          >
            {mode === 'login' ? (
              <>
                <motion.form variants={formStagger} initial="hidden" animate="show" onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <motion.div variants={staggerItem} className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email"
                      className={`${pillInput} pl-11 pr-4`}
                    />
                  </motion.div>

                  <motion.div variants={staggerItem} className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      className={`${pillInput} pl-11 pr-12`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-black/[0.05] hover:text-neutral-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </motion.div>

                  <motion.div variants={staggerItem} className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleForgotPassword()}
                      className="text-xs font-medium text-neutral-400 transition hover:text-neutral-600"
                    >
                      Forgot password?
                    </button>
                  </motion.div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm leading-snug text-rose-800"
                    >
                      {error}
                    </div>
                  )}
                  {info && (
                    <div
                      role="status"
                      className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm leading-snug text-emerald-900"
                    >
                      {info}
                    </div>
                  )}

                  <motion.div variants={staggerItem}>
                    <motion.button
                      type="submit"
                      disabled={pending}
                      whileHover={{scale: 1.02}}
                      whileTap={{scale: 0.99}}
                      transition={{type: 'spring', stiffness: 400, damping: 25}}
                      className="flex h-12 w-full items-center justify-center rounded-[50px] bg-[#0D0D0D] text-sm font-semibold text-white shadow-md transition-shadow duration-200 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50"
                    >
                      {pending ? 'Please wait…' : 'Sign in'}
                    </motion.button>
                  </motion.div>
                </motion.form>

                <motion.div variants={staggerItem} className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-neutral-200" />
                  <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-neutral-400">or continue with</span>
                  <div className="h-px flex-1 bg-neutral-200" />
                </motion.div>

                <motion.div variants={staggerItem}>
                  <motion.button
                    type="button"
                    disabled={!googleOAuthEnabled || googlePending}
                    whileHover={googleOAuthEnabled ? {scale: 1.02} : {}}
                    whileTap={googleOAuthEnabled ? {scale: 0.99} : {}}
                    transition={{type: 'spring', stiffness: 400, damping: 25}}
                    onClick={() => void handleGoogle()}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-[50px] border-[1.5px] border-[#E5E5E5] bg-white text-sm font-semibold text-neutral-800 shadow-sm transition-shadow duration-200 hover:border-neutral-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      !googleOAuthEnabled
                        ? 'Set VITE_ENABLE_GOOGLE_OAUTH=true and enable the Google provider in Supabase.'
                        : undefined
                    }
                  >
                    <GoogleMark className="h-5 w-5 shrink-0" />
                    {googlePending ? 'Redirecting…' : 'Continue with Google'}
                  </motion.button>
                </motion.div>
              </>
            ) : (
              <>
                <motion.form variants={formStagger} initial="hidden" animate="show" onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <motion.div variants={staggerItem} className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Full name"
                      className={`${pillInput} pl-11 pr-4`}
                    />
                  </motion.div>

                  <motion.div variants={staggerItem} className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email"
                      className={`${pillInput} pl-11 pr-4`}
                    />
                  </motion.div>

                  <motion.div variants={staggerItem} className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      className={`${pillInput} pl-11 pr-12`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-black/[0.05] hover:text-neutral-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </motion.div>

                  {password.length > 0 && (
                    <motion.div variants={staggerItem} className="space-y-1.5">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                          style={{width: `${strength.fill}%`}}
                        />
                      </div>
                      <p className="text-[11px] font-medium capitalize text-neutral-400">
                        Password strength: <span className="text-neutral-600">{strength.tier}</span>
                      </p>
                    </motion.div>
                  )}

                  <motion.div variants={staggerItem} className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className={`${pillInput} pl-11 pr-12`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-black/[0.05] hover:text-neutral-600"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </motion.div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm leading-snug text-rose-800"
                    >
                      {error}
                    </div>
                  )}

                  <motion.div variants={staggerItem}>
                    <motion.button
                      type="submit"
                      disabled={pending}
                      whileHover={{scale: 1.02}}
                      whileTap={{scale: 0.99}}
                      transition={{type: 'spring', stiffness: 400, damping: 25}}
                      className="flex h-12 w-full items-center justify-center rounded-[50px] bg-[#0D0D0D] text-sm font-semibold text-white shadow-md transition-shadow duration-200 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50"
                    >
                      {pending ? 'Please wait…' : 'Create account →'}
                    </motion.button>
                  </motion.div>

                  <motion.p variants={staggerItem} className="text-center text-[11px] leading-relaxed text-neutral-400">
                    By signing up you agree to our{' '}
                    <a href="#" className="font-medium text-neutral-500 underline-offset-2 hover:underline">
                      Terms of Service
                    </a>
                    .
                  </motion.p>
                </motion.form>

                <motion.div variants={staggerItem} className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-neutral-200" />
                  <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-neutral-400">or continue with</span>
                  <div className="h-px flex-1 bg-neutral-200" />
                </motion.div>

                <motion.div variants={staggerItem}>
                  <motion.button
                    type="button"
                    disabled={!googleOAuthEnabled || googlePending}
                    whileHover={googleOAuthEnabled ? {scale: 1.02} : {}}
                    whileTap={googleOAuthEnabled ? {scale: 0.99} : {}}
                    transition={{type: 'spring', stiffness: 400, damping: 25}}
                    onClick={() => void handleGoogle()}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-[50px] border-[1.5px] border-[#E5E5E5] bg-white text-sm font-semibold text-neutral-800 shadow-sm transition-shadow duration-200 hover:border-neutral-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      !googleOAuthEnabled
                        ? 'Set VITE_ENABLE_GOOGLE_OAUTH=true and enable the Google provider in Supabase.'
                        : undefined
                    }
                  >
                    <GoogleMark className="h-5 w-5 shrink-0" />
                    {googlePending ? 'Redirecting…' : 'Continue with Google'}
                  </motion.button>
                </motion.div>
              </>
            )}
          </motion.div>

          <p className="mt-8 shrink-0 text-left text-xs text-neutral-400">
            <Link to="/" className="font-medium transition hover:text-neutral-600">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
