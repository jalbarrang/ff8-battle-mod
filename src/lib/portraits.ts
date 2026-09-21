// Portraits that ship in `public/images`: the party-member mugshots, the 16
// junctionable Guardian Forces (captured from the PS1 mugshot sheet by CaSquall)
// and Odin/Gilgamesh, who never had menu mugshots so they use their Triple Triad
// cards instead. Only these names have artwork, so enemies and empty slots must
// not try to load a missing file.
const PORTRAIT_NAMES = new Set([
  'Squall',
  'Zell',
  'Irvine',
  'Quistis',
  'Rinoa',
  'Selphie',
  'Seifer',
  'Edea',
  'Quezacotl',
  'Shiva',
  'Ifrit',
  'Siren',
  'Brothers',
  'Diablos',
  'Carbuncle',
  'Leviathan',
  'Pandemona',
  'Cerberus',
  'Alexander',
  'Doomtrain',
  'Bahamut',
  'Cactuar',
  'Tonberry',
  'Eden',
  'Odin',
  'Gilgamesh'
]);

export function portraitUrl(name: string | undefined): string | null {
  return name && PORTRAIT_NAMES.has(name) ? `./images/${name}.png` : null;
}
