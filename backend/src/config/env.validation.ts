const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'GEMINI_API_KEY',
] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim() === '';
  });
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
  if (String(config.JWT_SECRET) === String(config.JWT_REFRESH_SECRET)) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must differ');
  }
  return config;
}
