// Faroese date + time formatting, always rendered in Faroe Islands time
// (Atlantic/Faroe: GMT in winter, GMT+1 in summer). We extract the zoned
// parts via Intl so the output is correct no matter what timezone the
// viewer's device is set to. Intl has patchy 'fo' support, so the weekday
// and month names are applied by hand.
const TZ = 'Atlantic/Faroe';

const WD = ['sunnudagur', 'mánadagur', 'týsdagur', 'mikudagur', 'hósdagur', 'fríggjadagur', 'leygardagur'];
const WD_S = ['sun', 'mán', 'týs', 'mik', 'hós', 'frí', 'ley'];
const MO = ['januar', 'februar', 'mars', 'apríl', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const MO_S = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const WD_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const p2 = (n) => String(n).padStart(2, '0');

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, weekday: 'short', year: 'numeric', month: '2-digit',
  day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

// Break a timestamp into Faroe-zoned calendar parts.
function fo(ts) {
  const o = {};
  for (const p of fmt.formatToParts(ts)) o[p.type] = p.value;
  return {
    year: +o.year,
    month: +o.month,          // 1-12
    day: +o.day,              // 1-31
    hour: (+o.hour) % 24,     // normalise the 24:00 edge some engines emit
    minute: +o.minute,
    wd: WD_INDEX[o.weekday],  // 0 = Sunday
  };
}

export function foLong(ts) {
  const d = fo(ts);
  return `${WD[d.wd]} ${d.day}. ${MO[d.month - 1]}`;
}
export function foDayShort(ts) {
  const d = fo(ts);
  return `${WD_S[d.wd]} ${d.day}. ${MO_S[d.month - 1]}`;
}
export function foDateShort(ts) {
  const d = fo(ts);
  return `${d.day}. ${MO_S[d.month - 1]}`;
}
export function foTime(ts) {
  const d = fo(ts);
  return `${p2(d.hour)}.${p2(d.minute)}`;
}
export function foDateTime(ts) {
  const d = fo(ts);
  return `${WD_S[d.wd]} ${d.day}. ${MO_S[d.month - 1]} kl. ${p2(d.hour)}.${p2(d.minute)}`;
}
export function foDayKey(ts) {
  const d = fo(ts);
  return `${d.year}-${p2(d.month)}-${p2(d.day)}`;
}
export function sameDay(ts, ref = Date.now()) {
  return foDayKey(ts) === foDayKey(ref);
}
