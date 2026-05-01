/** Encode l'ID carnet + corps (JSON blocs ou texte) pour la colonne unique `content`. */
export function packNoteContent(notebookId: string, body: string): string {
  return JSON.stringify({v: 1, notebookId, body});
}

export function unpackNoteContent(raw: string): {notebookId: string; body: string} {
  try {
    const o = JSON.parse(raw) as {v?: number; notebookId?: string; body?: string};
    if (o && typeof o.notebookId === 'string' && typeof o.body === 'string') {
      return {notebookId: o.notebookId, body: o.body};
    }
  } catch {
    /* legacy */
  }
  return {notebookId: 'default', body: raw};
}
