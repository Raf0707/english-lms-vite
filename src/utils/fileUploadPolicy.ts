export type AppRole = 'student' | 'teacher' | 'admin';

const ALWAYS_BLOCKED = new Set([
  'exe', 'msi', 'msp', 'com', 'scr', 'pif', 'cpl', 'dll', 'sys', 'drv',
  'bat', 'cmd', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'hta',
  'jar', 'apk', 'appx', 'appxbundle', 'msix', 'msixbundle', 'reg', 'lnk', 'scf'
]);

const STUDENT_BLOCKED = new Set([
  'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'tbz', 'xz', 'txz', 'cab', 'arj', 'iso', 'img', 'dmg',
  'docm', 'dotm', 'xlsm', 'xltm', 'xlam', 'pptm', 'potm', 'ppam', 'ppsm', 'sldm'
]);

export const SAFE_STUDENT_ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,audio/*,video/*';
export const STAFF_ATTACHMENT_ACCEPT = 'image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.zip,.rar,.7z,audio/*,video/*';

export function attachmentAcceptForRole(role: AppRole) {
  return role === 'student' ? SAFE_STUDENT_ATTACHMENT_ACCEPT : STAFF_ATTACHMENT_ACCEPT;
}

export function validateAttachmentForRole(file: File, role: AppRole): string | null {
  const extension = file.name.toLowerCase().split('.').pop()?.replace(/[^a-z0-9]/g, '') ?? '';
  if (ALWAYS_BLOCKED.has(extension)) return 'Исполняемые файлы и скрипты запрещены на платформе.';
  if (role === 'student' && STUDENT_BLOCKED.has(extension)) {
    return 'Ученикам нельзя отправлять архивы, образы дисков и документы с макросами. Используйте PDF, фото или обычный документ Office.';
  }
  return null;
}
