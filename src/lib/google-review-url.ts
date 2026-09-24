const GOOGLE_REVIEW_HOSTS = new Set([
  "share.google",
  "maps.app.goo.gl",
  "g.page",
  "google.com",
  "google.fr",
]);

export function isGoogleReviewUrl(value: string | null | undefined): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (GOOGLE_REVIEW_HOSTS.has(host) || host.endsWith(".google.com") || host.endsWith(".google.fr"))
    );
  } catch {
    return false;
  }
}
