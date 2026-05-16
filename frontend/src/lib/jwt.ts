interface JwtPayload {
  sub: string
  email: string
  exp?: number
}

export function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '==='.slice((base64.length + 3) % 4)
    return JSON.parse(atob(padded)) as JwtPayload
  } catch {
    return null
  }
}

export function nameFromEmail(email: string): string {
  const local = email.split('@')[0]
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(' ')
}
