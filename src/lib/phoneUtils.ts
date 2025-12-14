/**
 * Masks a phone number to hide some digits
 * Example: +255712345678 -> +255 7** *** *78
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—';
  
  // Remove any spaces
  const cleanPhone = phone.replace(/\s/g, '');
  
  // For short numbers, just mask middle
  if (cleanPhone.length <= 6) {
    return cleanPhone.slice(0, 2) + '***' + cleanPhone.slice(-1);
  }
  
  // For standard phone numbers
  const visibleStart = cleanPhone.startsWith('+') ? 4 : 3;
  const visibleEnd = 2;
  
  const start = cleanPhone.slice(0, visibleStart);
  const end = cleanPhone.slice(-visibleEnd);
  const hiddenLength = cleanPhone.length - visibleStart - visibleEnd;
  const hidden = '*'.repeat(Math.max(hiddenLength, 3));
  
  return `${start} ${hidden.slice(0, 3)} ${hidden.slice(3, 6) || '***'} ${end}`;
}

/**
 * Formats a phone number for display (with or without masking)
 */
export function formatPhoneForDisplay(
  phone: string | null | undefined, 
  options: { masked: boolean } = { masked: true }
): string {
  if (!phone) return '—';
  
  if (options.masked) {
    return maskPhoneNumber(phone);
  }
  
  return phone;
}
