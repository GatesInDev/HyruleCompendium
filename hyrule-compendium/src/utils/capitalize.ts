/**
 * Capitalizes the first letter of each word in a string.
 * "breath of the wild" → "Breath Of The Wild"
 * "creatures" → "Creatures"
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Capitalizes only the very first letter of the string.
 * "breath of the wild" → "Breath of the wild"
 * "creatures" → "Creatures"
 */
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
