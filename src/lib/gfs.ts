// Guardian Force roster order, matching the in-memory roster/stats arrays and
// the battle GF slots. Index 0 is Quezacotl and index 15 is Eden.
export const GUARDIAN_FORCES = [
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
  'Eden'
] as const;

export const MAX_GUARDIAN_LEVEL = 100;

// FF8 does not store a GF level; it is derived from the GF's accumulated EXP the
// same way character levels are derived elsewhere in this app (1000 EXP per
// level). Kept in one place so it can be corrected if live testing disagrees.
export function guardianLevel(exp: number | undefined): number {
  if (!exp || exp <= 0) return 1;
  return Math.min(Math.floor(exp / 1000) + 1, MAX_GUARDIAN_LEVEL);
}

/** Progress through the current level, 0..1, based on the same 1000 EXP step. */
export function guardianLevelProgress(exp: number | undefined): number {
  if (!exp || exp <= 0) return 0;
  if (guardianLevel(exp) >= MAX_GUARDIAN_LEVEL) return 1;
  return (exp % 1000) / 1000;
}
