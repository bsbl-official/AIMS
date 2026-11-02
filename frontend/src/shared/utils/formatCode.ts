export function formatCode(value: string | number, width = 2) {
  return String(value).padStart(width, '0')
}
