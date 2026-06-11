export function normalizeGitHubUsername(value) {
  if (typeof value !== 'string') {
    return 'HandyWote';
  }

  const input = value.trim();
  if (!input) {
    return 'HandyWote';
  }

  let source = input;
  try {
    const parsed = new URL(input);
    source = parsed.pathname;
  } catch {
    // keep original input when it is already a username
  }

  const withoutQuery = source.split('?')[0].split('#')[0];
  const segments = withoutQuery.split('/').filter(Boolean);
  return segments[segments.length - 1] || input;
}
