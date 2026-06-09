// English (ESPN feed) -> Faroese country names. Verified against fo.wikipedia
// and live Faroese press. Anything not in the map falls back to the original
// name unchanged, so knockout placeholders ("Winner Group A") are safe.
const MAP = {
  'united states': 'USA', usa: 'USA',
  mexico: 'Meksiko',
  canada: 'Kanada',
  brazil: 'Brasil',
  argentina: 'Argentina',
  france: 'Frakland',
  england: 'Ongland',
  spain: 'Spania',
  portugal: 'Portugal',
  germany: 'Týskland',
  netherlands: 'Niðurlond',
  belgium: 'Belgia',
  croatia: 'Kroatia',
  japan: 'Japan',
  'south korea': 'Suðurkorea', 'korea republic': 'Suðurkorea',
  'north korea': 'Norðurkorea', 'korea dpr': 'Norðurkorea',
  iran: 'Iran', 'ir iran': 'Iran',
  'saudi arabia': 'Saudi-Arábia',
  australia: 'Avstralia',
  morocco: 'Marokko',
  senegal: 'Senegal',
  tunisia: 'Tunesia',
  nigeria: 'Nigeria',
  ecuador: 'Ekvador',
  uruguay: 'Uruguay',
  colombia: 'Kolumbia',
  norway: 'Noreg',
  switzerland: 'Sveis',
  denmark: 'Danmark',
  italy: 'Italia',
  poland: 'Pólland',
  sweden: 'Svøríki',
  egypt: 'Egyptaland',
  cameroon: 'Kamerun',
  'ivory coast': 'Fílabeinsstrondin', "côte d'ivoire": 'Fílabeinsstrondin', "cote d'ivoire": 'Fílabeinsstrondin',
  'costa rica': 'Kosta Rika',
  paraguay: 'Paraguay',
  peru: 'Perú',
  qatar: 'Katar',
  greece: 'Grikkaland',
  turkey: 'Turkaland', 'türkiye': 'Turkaland', turkiye: 'Turkaland',
  austria: 'Eysturríki',
  serbia: 'Serbia',
  ukraine: 'Ukraina',
  'new zealand': 'Nýsæland',
  jamaica: 'Jamaika',
  panama: 'Panama',
  honduras: 'Honduras',
  'cape verde': 'Grønhøvdaoyggjar', 'cabo verde': 'Grønhøvdaoyggjar',
  'south africa': 'Suðurafrika',
  scotland: 'Skotland',
  wales: 'Wales',
  ireland: 'Írland', 'republic of ireland': 'Írland',
  'northern ireland': 'Norðurírland',
  china: 'Kina', 'china pr': 'Kina',
  iceland: 'Ísland',
  russia: 'Russland',
  finland: 'Finnland',
  hungary: 'Ungarn',
  romania: 'Rumenia',
  iraq: 'Irak',
  uzbekistan: 'Usbekistan',
};

export function foTeam(name) {
  if (!name) return name;
  return MAP[name.trim().toLowerCase()] || name;
}

// Translate a team object's display name, keeping flag/code and the original.
export function foTeamObj(team) {
  if (!team || !team.name) return team;
  return { ...team, name: foTeam(team.name), nameEn: team.name };
}
