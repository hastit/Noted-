import type {User} from '@supabase/supabase-js';

/** Clé utilisée avec `signUp` / `updateUser` (Supabase `raw_user_meta_data`) */
export const USER_METADATA_FULL_NAME = 'full_name';

export function getDisplayName(user: User | null | undefined): string {
  if (!user) return 'there';
  const raw = user.user_metadata?.[USER_METADATA_FULL_NAME];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  const email = user.email;
  if (email) {
    const local = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim();
    if (local) return local.replace(/\b\w/g, c => c.toUpperCase());
  }
  return 'there';
}

/** Initiales pour l’avatar (1–2 caractères). */
export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase() || '?';
}
