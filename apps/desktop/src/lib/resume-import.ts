import { invoke, isTauri } from '@tauri-apps/api/core';

export const MAX_REVIEW_CHARACTERS = 200_000;
export interface ExtractedDocument { text: string; page_count: number | null; empty_pages: number[] }

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const errors: Record<string, string> = {
  invalid_docx: 'This file could not be read as a Word document. Export a new DOCX and try again.',
  complex_docx: 'This Word document exceeds the local reader limits. Export a simpler copy.',
  encrypted_docx: 'Export an unlocked Word document to read it locally.',
  no_docx_text: 'No readable body text was found in this Word document. Images and embedded documents are not extracted.',
  empty_file: 'This document is empty. Choose another copy.',
  too_large: 'This document is larger than 10 MiB. Export a smaller copy and try again.',
  invalid_pdf: 'This file could not be read as a PDF. Export a new PDF and try again.',
  encrypted_pdf: 'This PDF is password protected. Export an unlocked copy to read it locally.',
  no_pages: 'This PDF has no pages. Choose another copy.',
  too_many_pages: 'Choose a PDF with 10 pages or fewer.',
  too_much_text: 'This document contains too much text to review here. Export just the resume pages.',
  complex_pdf: 'This PDF is too complex to read within the local limits. Export a simpler copy.',
  no_text: 'No readable text was found. This PDF may be scanned or image-only. Export a text-based PDF; local OCR is not available yet.',
  timeout: 'Reading this document took too long. Try again or export a simpler copy.',
  cancelled: 'Extraction cancelled. You can try again.',
  busy: 'Another local import is finishing. Wait a moment, then try again.',
  expired: 'The import expired. Try extracting the text again.',
  worker_unavailable: 'The local document reader could not start or finish. Try again or restart JobScout.',
};

async function request(action: 'start' | 'extract' | 'cancel', id?: string, file?: File, signal?: AbortSignal): Promise<unknown> {
  const format = file?.name.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf';
  if (isTauri()) {
    let data: string | undefined;
    if (file) data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      const abort = () => reader.abort();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('This file could not be read. Choose it again.'));
      reader.onabort = () => reject(new DOMException('Cancelled', 'AbortError'));
      reader.onloadend = () => signal?.removeEventListener('abort', abort);
      signal?.addEventListener('abort', abort, { once: true });
      reader.readAsDataURL(file);
      if (signal?.aborted) reader.abort();
    });
    signal?.throwIfAborted();
    return invoke('resume_import', { action, id, data, format });
  }
  const suffix = id ? `/${id}${action === 'extract' ? `/${format}` : ''}` : '';
  const response = await fetch(`/engine/imports${suffix}`, {
    method: action === 'start' ? 'POST' : action === 'cancel' ? 'DELETE' : 'PUT',
    headers: { 'X-JobScout-Import': '1', ...(file ? { 'Content-Type': format === 'docx' ? DOCX_MIME : 'application/pdf' } : {}) },
    body: file, cache: 'no-store', redirect: 'error', credentials: 'omit',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(50_000)]) : AbortSignal.timeout(5000),
  });
  return response.json();
}

function checked(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') throw new Error('The local engine returned an unreadable response. Try again.');
  const value = data as Record<string, unknown>;
  if ('error' in value) throw new Error(errors[String(value.error)] ?? 'The local document reader could not finish. Try again.');
  return value;
}

export async function extractResume(file: File, signal: AbortSignal): Promise<ExtractedDocument> {
  let id: string | undefined;
  let cancel: (() => void) | undefined;
  try {
    // Receive the reservation ID so cancellation during startup can clean it up.
    const reservation = checked(await request('start'));
    if (typeof reservation.id !== 'string' || !/^[0-9a-f-]{36}$/.test(reservation.id)) {
      throw new Error('The local engine could not start an import. Try again.');
    }
    id = reservation.id;
    cancel = () => { void request('cancel', id).catch(() => {}); };
    signal.addEventListener('abort', cancel, { once: true });
    signal.throwIfAborted();
    const result = checked(await request('extract', id, file, signal));
    signal.throwIfAborted();
    if (typeof result.text !== 'string' || result.text.length > MAX_REVIEW_CHARACTERS ||
        (file.name.toLowerCase().endsWith('.docx') ? result.page_count !== null : (!Number.isInteger(result.page_count) || Number(result.page_count) < 1 || Number(result.page_count) > 50)) ||
        !Array.isArray(result.empty_pages) || result.empty_pages.some(n => !Number.isInteger(n) || n < 1 || n > Number(result.page_count))) {
      throw new Error('The local engine returned an unreadable result. Try again.');
    }
    return result as unknown as ExtractedDocument;
  } finally {
    if (cancel) signal.removeEventListener('abort', cancel);
    if (id) void request('cancel', id).catch(() => {});
  }
}
