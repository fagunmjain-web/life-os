export const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
export const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getDayName(date) {
  return DAY_NAMES[date.getDay()].toLowerCase()
}

export function isFriday(date) {
  return date.getDay() === 5
}

export function isToday(date) {
  const today = new Date()
  return toDateStr(date) === toDateStr(today)
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function getFridaysInMonth(year, month) {
  const days = getDaysInMonth(year, month)
  const fridays = []
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month, d).getDay() === 5) fridays.push(d)
  }
  return fridays
}
