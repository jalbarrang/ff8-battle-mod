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

// EXP that separates two GF levels. Kept in one place so it can be corrected if
// live testing disagrees.
export const GUARDIAN_EXP_PER_LEVEL = 1000;

// FF8 does not store a GF level; it is derived from the GF's accumulated EXP the
// same way character levels are derived elsewhere in this app (1000 EXP per
// level). Kept in one place so it can be corrected if live testing disagrees.
export function guardianLevel(exp: number | undefined): number {
  if (!exp || exp <= 0) return 1;
  return Math.min(Math.floor(exp / GUARDIAN_EXP_PER_LEVEL) + 1, MAX_GUARDIAN_LEVEL);
}

/** EXP still needed to reach the next level, or null once the GF is at the cap. */
export function guardianExpToNextLevel(exp: number | undefined): number | null {
  if (guardianLevel(exp) >= MAX_GUARDIAN_LEVEL) return null;
  return GUARDIAN_EXP_PER_LEVEL - ((exp ?? 0) % GUARDIAN_EXP_PER_LEVEL);
}
