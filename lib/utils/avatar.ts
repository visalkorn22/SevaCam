/**
 * Resolve an avatar_url value to a displayable URL.
 * - Absolute URLs (Google profile photos) are used as-is.
 * - Relative paths (/uploads/...) are prefixed with NEXT_PUBLIC_API_URL.
 * - null/undefined returns null (caller shows initials fallback).
 * - cacheBust appends ?v=<number> to bust same-path overwrites.
 */
export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  cacheBust?: number,
): string | null {
  if (!avatarUrl) return null;

  const base =
    avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")
      ? avatarUrl
      : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${avatarUrl}`;

  return cacheBust ? `${base}?v=${cacheBust}` : base;
}
