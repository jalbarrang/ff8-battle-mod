// Card capture odds.
//
// Decompiled from the 2013 Steam FF8_EN.exe (`Battle_RollCardCommand` @ 0x48FBA0):
// the capture succeeds when
//
//   256 - floor(255 * currentHP / maxHP) >= rand(0..255)
//
// so the odds depend only on how much HP the target has lost. A separate roll
// (`rand(0..255) < 16`) upgrades the capture to a rare card, which does not
// affect whether Card lands.
export function cardSuccessChance(currentHealth: number, maxHealth: number): number | null {
  if (!Number.isFinite(currentHealth) || !Number.isFinite(maxHealth) || maxHealth <= 0) return null;
  const health = Math.min(Math.max(currentHealth, 0), maxHealth);
  const threshold = 256 - Math.floor((255 * health) / maxHealth);
  return Math.min(threshold + 1, 256) / 256;
}
