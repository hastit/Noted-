export function normalizeSubjectTitle(title: string): string {
  return title
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s*\.\s*/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}
