export function normalizePhoneDigits(phone?: string | null): string | undefined {
  if (!phone) {
    return undefined;
  }

  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  return digits.length > 0 ? digits : undefined;
}

export function formatPhoneNumber(phone?: string | null): string | undefined {
  const digits = normalizePhoneDigits(phone);
  if (!digits) {
    return undefined;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone?.trim() || undefined;
}

export function phoneHref(phone?: string | null): string | undefined {
  const digits = normalizePhoneDigits(phone);
  return digits ? `tel:+1${digits}` : undefined;
}
