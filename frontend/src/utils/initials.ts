export function getInitials(firstName?: string, lastName?: string, email?: string): string {
  const f = firstName?.trim() || ''
  const l = lastName?.trim() || ''

  if (f && l) {
    return (f[0] + l[0]).toUpperCase()
  }

  if (f) {
    const parts = f.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return f.substring(0, 2).toUpperCase()
  }

  if (l) {
    return l.substring(0, 2).toUpperCase()
  }

  if (email) {
    const username = email.split('@')[0] || ''
    return username.substring(0, 2).toUpperCase()
  }

  return 'U'
}
