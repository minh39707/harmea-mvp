let legacyWarningLogged = false;

export function configuredAppUrl() {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured;

  const legacy = process.env.APP_ORIGIN?.trim();
  if (!legacy) return undefined;

  if (!legacyWarningLogged) {
    process.stderr.write(
      `${JSON.stringify({
        level: 'warn',
        code: 'APP_ORIGIN_DEPRECATED',
        message: 'APP_ORIGIN is deprecated; configure APP_URL.'
      })}\n`
    );
    legacyWarningLogged = true;
  }

  return legacy;
}

export function configuredAppOrigin(value = configuredAppUrl()) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}
