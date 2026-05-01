import React, {useEffect, useMemo, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {motion} from 'motion/react';
import {Eye, EyeOff, Lock} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';

const pillInput =
  'h-12 w-full rounded-[50px] border-[1.5px] border-[#E5E5E5] bg-[#FAFAFA] text-sm text-neutral-900 placeholder:text-[#AAAAAA] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#0D0D0D] focus:shadow-[0_0_0_3px_rgba(13,13,13,0.12)]';

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

export default function ResetPasswordScreen() {
  const {configured, updatePassword, session: authSession, loading: authLoading} = useAuth();
  const navigate = useNavigate();
  const [linkResolved, setLinkResolved] = useState(false);
  /** True when `getSession()` saw a session (storage can update before React context). */
  const [sessionConfirmed, setSessionConfirmed] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const strengthColor =
    strength.tier === 'weak' ? 'bg-red-500' : strength.tier === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';

  useEffect(() => {
    let cancelled = false;

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled || !nextSession) return;
      if (
        event === 'PASSWORD_RECOVERY' ||
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION'
      ) {
        setSessionConfirmed(true);
      }
    });

    const run = async () => {
      // Always wait up to 10 seconds — the SDK clears the hash before the
      // component mounts, so hadRecoveryHash is unreliable as a signal.
      const maxWaitMs = 10000;
      const stepMs = 200;
      const deadline = Date.now() + maxWaitMs;

      while (!cancelled && Date.now() < deadline) {
        const {data} = await supabase.auth.getSession();
        if (data.session) {
          setSessionConfirmed(true);
          setLinkResolved(true);
          return;
        }
        await new Promise(r => setTimeout(r, stepMs));
      }

      if (!cancelled) setLinkResolved(true);
    };

    void run();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setPending(true);
    try {
      const {error: err} = await updatePassword(password);
      if (err) {
        setError(err.message);
        return;
      }
      navigate('/app', {replace: true});
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };

  if (!configured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-6">
        <p className="text-center text-sm text-black/50">Supabase is not configured.</p>
      </div>
    );
  }

  const session = authSession;
  const canReset = Boolean(session) || sessionConfirmed;
  /** Until `linkResolved`, we poll; keep spinner while auth context hydrates if we already know there is a session. */
  const verifying = !linkResolved || (sessionConfirmed && authLoading && !session);

  if (verifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <p className="text-sm text-neutral-500">Verifying your reset link…</p>
      </div>
    );
  }

  if (linkError || !canReset) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-[380px] space-y-4 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 shadow-sm">
            <div className="h-4 w-4 rotate-45 rounded-sm bg-white" />
          </div>
          <h1 className="font-display text-xl font-bold text-neutral-900">Link invalid or expired</h1>
          <p className="text-sm leading-relaxed text-neutral-500">
            {linkError ??
              'Request a new reset email from the sign-in page. If the link opened inside an email app, try “Open in browser” so the full address is preserved.'}
          </p>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-[50px] bg-[#0D0D0D] px-8 text-sm font-semibold text-white"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-white px-6 py-12 md:min-h-screen md:px-12 md:py-20">
      <div className="mx-auto w-full max-w-[380px]">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 shadow-sm">
            <div className="h-4 w-4 rotate-45 rounded-sm bg-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-neutral-900">Set a new password</h1>
            <p className="mt-2 text-sm text-neutral-500">Choose a strong password you have not used elsewhere.</p>
          </div>
        </div>

        <motion.form
          initial={{opacity: 0, y: 8}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.35, ease: [0.16, 1, 0.3, 1]}}
          onSubmit={e => void handleSubmit(e)}
          className="flex flex-col gap-4"
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
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
          </div>

          {password.length > 0 && (
            <div className="space-y-1.5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                  style={{width: `${strength.fill}%`}}
                />
              </div>
              <p className="text-[11px] font-medium capitalize text-neutral-400">
                Password strength: <span className="text-neutral-600">{strength.tier}</span>
              </p>
            </div>
          )}

          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400" />
            <input
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm new password"
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
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm leading-snug text-rose-800"
            >
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={pending}
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.99}}
            transition={{type: 'spring', stiffness: 400, damping: 25}}
            className="flex h-12 w-full items-center justify-center rounded-[50px] bg-[#0D0D0D] text-sm font-semibold text-white shadow-md transition-shadow duration-200 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Update password'}
          </motion.button>
        </motion.form>

        <p className="mt-8 text-left text-xs text-neutral-400">
          <Link to="/login" className="font-medium transition hover:text-neutral-600">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}