import {supabase} from './supabase';
import type {PDFFile} from '../types';
import {LIMITS, limitError} from './limits';

const BUCKET = 'pdfs';

type PdfRow = {
  id: string;
  title: string;
  url: string;
  storage_path: string;
  folder_id: string;
  uploaded_at: string;
};

export async function getPdfs(): Promise<PDFFile[]> {
  const {data, error} = await supabase
    .from('pdf_files')
    .select('id,title,url,storage_path,folder_id,uploaded_at')
    .order('uploaded_at', {ascending: false});
  if (error) throw error;
  return (data as PdfRow[]).map(row => ({
    id: row.id,
    title: row.title,
    url: row.url,
    folderId: row.folder_id,
    uploadedAt: row.uploaded_at,
  }));
}

export async function uploadPdf(file: File, folderId: string): Promise<PDFFile> {
  if (file.size > LIMITS.pdfFileSizeBytes)
    throw new Error(`File is too large. Maximum size is ${LIMITS.pdfFileSizeMB} MB.`);

  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const {count} = await supabase.from('pdf_files').select('id', {count: 'exact', head: true}).eq('user_id', user.id);
  if ((count ?? 0) >= LIMITS.pdfs)
    throw new Error(limitError('PDFs', LIMITS.pdfs));

  const id = crypto.randomUUID();
  const storagePath = `${user.id}/${id}/${file.name}`;

  const {error: uploadError} = await supabase.storage.from(BUCKET).upload(storagePath, file);
  if (uploadError) throw uploadError;

  const {
    data: {publicUrl},
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const uploadedAt = new Date().toISOString();
  const {error: dbError} = await supabase.from('pdf_files').insert({
    id,
    user_id: user.id,
    title: file.name,
    storage_path: storagePath,
    url: publicUrl,
    folder_id: folderId,
    uploaded_at: uploadedAt,
  });
  if (dbError) throw dbError;

  return {id, title: file.name, url: publicUrl, folderId, uploadedAt};
}

export async function deletePdf(id: string): Promise<void> {
  const {data} = await supabase
    .from('pdf_files')
    .select('storage_path')
    .eq('id', id)
    .single();
  if (data?.storage_path) {
    await supabase.storage.from(BUCKET).remove([data.storage_path]);
  }
  const {error} = await supabase.from('pdf_files').delete().eq('id', id);
  if (error) throw error;
}
