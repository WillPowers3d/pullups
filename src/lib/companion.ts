/**
 * Optional outbound link to Pullups With Friends (video grading / leaderboard).
 * This repo must not import that app's code or share its database.
 *
 * Set NEXT_PUBLIC_COMPANION_ORIGIN (e.g. https://example.com) to enable.
 * returnTo is an absolute URL back to *this* app when possible.
 */

export function companionOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_COMPANION_ORIGIN?.trim();
  return raw ? raw.replace(/\/$/, "") : undefined;
}

export function publicAppOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  return raw ? raw.replace(/\/$/, "") : undefined;
}

export function companionRecordUrl(opts: {
  trainSetId: string;
  sessionId: string;
}): string | null {
  const origin = companionOrigin();
  if (!origin) return null;
  const url = new URL("/record", origin);
  url.searchParams.set("exercise", "pull-up");
  url.searchParams.set("trainSet", opts.trainSetId);
  const app = publicAppOrigin();
  const returnPath = `/session/${opts.sessionId}`;
  url.searchParams.set("returnTo", app ? `${app}${returnPath}` : returnPath);
  return url.toString();
}
