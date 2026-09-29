export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
export const RESUME_ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type ResumeSelection = { name: string; size: number; format: 'pdf' | 'docx' };
type FileMetadata = { name: string; size: number; type: string };
type SelectionResult = { ok: true; selection: ResumeSelection } | { ok: false; error: string };

// Advisory picker validation only. The future engine parser must independently
// validate bytes and resource limits before accepting any document.
export function validateResumeSelection(file: FileMetadata): SelectionResult {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'pdf' && extension !== 'docx') {
    return { ok: false, error: 'Choose a PDF (.pdf) or Word document (.docx). Older .doc files are not supported.' };
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return { ok: false, error: 'This file is empty or its size could not be checked. Choose another copy.' };
  }
  if (file.size > MAX_RESUME_BYTES) {
    return { ok: false, error: 'This file is larger than 10 MiB. Choose a smaller PDF or Word document.' };
  }
  const expected = extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (file.type && file.type !== 'application/octet-stream' && file.type !== expected) {
    return { ok: false, error: 'The file type does not match its extension. Export a new PDF or .docx copy and try again.' };
  }
  return { ok: true, selection: { name: file.name, size: file.size, format: extension } };
}
