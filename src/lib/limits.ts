export const LIMITS = {
  notebooks: 20,
  notesPerNotebook: 50,
  quickNotes: 15,
  pdfs: 10,
  pdfFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  pdfFileSizeMB: 10,
} as const;

export function limitError(item: string, max: number): string {
  return `You've reached the limit of ${max} ${item}. Delete some to make room.`;
}
