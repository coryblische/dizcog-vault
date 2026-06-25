export const PIN_LENGTH = 7;

export interface Rune {
  id: string;
  name: string;
}

/** Dethek letters on the vault pinpad */
export const PINPAD_RUNES: Rune[] = [
  { id: "a", name: "Anvil" },
  { id: "c", name: "Cog" },
  { id: "d", name: "Delve" },
  { id: "e", name: "Ether" },
  { id: "f", name: "Forge" },
  { id: "h", name: "Hammer" },
  { id: "k", name: "Keystone" },
  { id: "l", name: "Lode" },
  { id: "n", name: "North" },
  { id: "o", name: "Ore" },
  { id: "r", name: "Rivet" },
  { id: "s", name: "Shaft" },
];

/** Vault key: forkarl */
export const VAULT_PIN_IDS = ["f", "o", "r", "k", "a", "r", "l"] as const;

export function sequenceToPassword(ids: string[]): string {
  return ids.join("");
}

export function getRuneById(id: string): Rune | undefined {
  return PINPAD_RUNES.find((r) => r.id === id);
}

export const VAULT_PASSWORD = sequenceToPassword([...VAULT_PIN_IDS]);
export const VAULT_PIN_LETTERS = "FORKARL";
