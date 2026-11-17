/** Build an internal link that works both on the preview address and on cheming.site. */
export function url(path = '') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return `${base}/${clean}`;
}
