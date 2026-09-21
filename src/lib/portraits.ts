// Portraits that ship in `public/images`. Only these characters have artwork, so
// enemies and empty slots must not try to load a missing file.
const PORTRAIT_NAMES = new Set([
  'Squall',
  'Zell',
  'Irvine',
  'Quistis',
  'Rinoa',
  'Selphie',
  'Seifer',
  'Edea'
]);

export function portraitUrl(name: string | undefined): string | null {
  return name && PORTRAIT_NAMES.has(name) ? `./images/${name}.png` : null;
}
