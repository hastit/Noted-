import type {AuthError} from '@supabase/supabase-js';

/** Wrong password vs unknown email cannot be distinguished (enumeration). */
const INVALID_LOGIN =
  'Incorrect email or password. Double-check both fields, or use Forgot password? if you need a new password.';

/**
 * User-facing copy for Supabase Auth errors (sign-in / sign-up).
 * Maps server codes and common messages to clear feedback.
 */
export function formatAuthErrorMessage(error: AuthError): string {
  const code = error.code;
  const raw = error.message?.trim() || '';
  const lower = raw.toLowerCase();

  if (code === 'invalid_credentials' || lower.includes('invalid login credentials')) {
    return INVALID_LOGIN;
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in. Check your inbox for the confirmation link.';
  }
  if (code === 'user_banned') {
    return 'This account is disabled. Contact support if you think this is a mistake.';
  }
  if (code === 'over_request_rate_limit') {
    return 'Too many sign-in attempts. Please wait a minute and try again.';
  }
  if (code === 'email_exists' || lower.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'weak_password') {
    return raw || 'This password is too weak. Choose a longer, stronger password.';
  }
  if (code === 'signup_disabled') {
    return 'New sign-ups are currently disabled.';
  }

  return raw || 'Something went wrong. Please try again.';
}
