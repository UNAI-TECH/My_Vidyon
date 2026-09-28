/**
 * Logs full technical error details to the terminal/developer console
 * while sanitizing the message for end-user popups, modals, and toasts.
 */
export function sanitizeAndLogError(
  title: string, 
  error: any, 
  fallbackMessage: string = 'An unexpected error occurred. Please try again.'
): string {
  const rawMessage = typeof error === 'string' ? error : (error?.message || error?.error_description || '');
  
  // ALWAYS print full technical details to the terminal
  console.error(`\n================== [TERMINAL ERROR] ==================`);
  console.error(`Action/Title : ${title}`);
  console.error(`Error Details:`, error);
  if (error?.stack) {
    console.error(`Stack:`, error.stack);
  }
  console.error(`======================================================\n`);

  const lower = (rawMessage || '').toLowerCase();
  const isTechnical = 
    lower.includes('mime type') ||
    lower.includes('not supported') ||
    lower.includes('network request failed') ||
    lower.includes('referenceerror') ||
    lower.includes('syntaxerror') ||
    lower.includes('typeerror') ||
    lower.includes('postgrest') ||
    lower.includes('violates') ||
    lower.includes('foreign key') ||
    lower.includes('null value') ||
    lower.includes('jwt') ||
    lower.includes('column') ||
    lower.includes('relation') ||
    lower.includes('database error') ||
    lower.includes('status code') ||
    lower.includes('internal server error') ||
    lower.includes('fetch failed');

  if (isTechnical || !rawMessage) {
    if (title.toLowerCase().includes('upload') || lower.includes('mime') || lower.includes('upload')) {
      return 'Unable to upload file. Please check the file and try again.';
    }
    return fallbackMessage;
  }

  return rawMessage;
}
