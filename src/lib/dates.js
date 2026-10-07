// YYYY-MM-DD in local time; toISOString() would give the UTC date
export function daysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
