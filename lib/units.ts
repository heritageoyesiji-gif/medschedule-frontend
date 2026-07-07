// Per-unit colors. "unit" is a free-form string (LTN, LTC, ICU, …), so rather
// than maintain a lookup we hash the name into a fixed palette: every distinct
// unit gets a stable, consistent color with no config, and new units are colored
// automatically. Palette colors are all dark enough for white text on top.
export const UNIT_COLOR_PALETTE = [
  "#0F766E", // teal
  "#B45309", // amber
  "#6D28D9", // violet
  "#BE185D", // pink
  "#1D4ED8", // blue
  "#15803D", // green
  "#B91C1C", // red
  "#0E7490", // cyan
  "#7C2D12", // sienna
  "#4338CA", // indigo
  "#9333EA", // purple
  "#0369A1", // sky
  "#A16207", // gold
  "#DB2777", // rose
];

const NO_UNIT_COLOR = "#6B7280"; // neutral grey for shifts with no unit set

export function getUnitColor(unit: string | null | undefined): string {
  if (!unit) return NO_UNIT_COLOR;
  let hash = 0;
  for (let i = 0; i < unit.length; i++) {
    hash = (hash * 31 + unit.charCodeAt(i)) >>> 0;
  }
  return UNIT_COLOR_PALETTE[hash % UNIT_COLOR_PALETTE.length];
}
