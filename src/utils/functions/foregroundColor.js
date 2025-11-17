export function foregroundColor(hexColor) {
  let hex = hexColor.replace(/^#/, "");

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const luma = (r * 299 + g * 587 + b * 114) / 1000;

  return luma > 128 ? "#000000" : "#ffffff";
}