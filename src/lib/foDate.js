// Faroese date + time formatting. Intl has patchy 'fo' support, so we format
// by hand with Faroese weekday and month names.
const WD = ['sunnudagur', 'mánadagur', 'týsdagur', 'mikudagur', 'hósdagur', 'fríggjadagur', 'leygardagur'];
const WD_S = ['sun', 'mán', 'týs', 'mik', 'hós', 'frí', 'ley'];
const MO = ['januar', 'februar', 'mars', 'apríl', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const MO_S = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const p2 = (n) => String(n).padStart(2, '0');

export function foLong(ts) {
  const d = new Date(ts);
  return `${WD[d.getDay()]} ${d.getDate()}. ${MO[d.getMonth()]}`;
}
export function foDayShort(ts) {
  const d = new Date(ts);
  return `${WD_S[d.getDay()]} ${d.getDate()}. ${MO_S[d.getMonth()]}`;
}
export function foDateShort(ts) {
  const d = new Date(ts);
  return `${d.getDate()}. ${MO_S[d.getMonth()]}`;
}
export function foTime(ts) {
  const d = new Date(ts);
  return `${p2(d.getHours())}.${p2(d.getMinutes())}`;
}
export function foDateTime(ts) {
  const d = new Date(ts);
  return `${WD_S[d.getDay()]} ${d.getDate()}. ${MO_S[d.getMonth()]} kl. ${foTime(ts)}`;
}
export function foDayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
export function sameDay(ts, ref = Date.now()) {
  const a = new Date(ts); const b = new Date(ref);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
