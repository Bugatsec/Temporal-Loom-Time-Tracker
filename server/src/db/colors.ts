// A fixed rotation of distinct, readable-on-dark colors. Auto-assigned
// when a project or tag is created without an explicit color (e.g. typed
// straight into the timer's combobox instead of set up on the Projects
// page), so nothing ever renders as an uncolored/blank dot.
export const COLOR_PALETTE = [
  "#e06c75", // rose
  "#61afef", // blue
  "#98c379", // green
  "#e5c07b", // amber
  "#c678dd", // violet
  "#56b6c2", // cyan
  "#d19a66", // orange
  "#4fb0a5", // teal
  "#e06c9f", // pink
  "#7f9cf5", // periwinkle
];

/** Deterministic pick based on an existing count, so sequential creations
 *  cycle through the palette rather than clustering on one color. */
export function nextColor(existingCount: number): string {
  return COLOR_PALETTE[existingCount % COLOR_PALETTE.length];
}
