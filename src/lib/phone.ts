/**
 * Supabase Phone Auth (Twilio) only accepts E.164 numbers, while the admin UI
 * collects local 11-digit numbers such as 08012345678.
 */
export const DEFAULT_PHONE_COUNTRY_CODE =
  process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY_CODE?.trim() || '+234';

export function toE164(rawPhone: string, countryCode = DEFAULT_PHONE_COUNTRY_CODE) {
  const trimmed = rawPhone.trim();

  if (!trimmed) {
    return null;
  }

  const dialCode = countryCode.replace(/\D/g, '');
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  if (!hasPlus) {
    if (digits.startsWith('0')) {
      digits = `${dialCode}${digits.replace(/^0+/, '')}`;
    } else if (!digits.startsWith(dialCode)) {
      digits = `${dialCode}${digits}`;
    }
  }

  if (digits.length < 8 || digits.length > 15) {
    return null;
  }

  return `+${digits}`;
}

export function maskPhoneNumber(phone: string) {
  if (phone.length <= 6) {
    return phone;
  }

  return `${phone.slice(0, 4)}${'*'.repeat(phone.length - 6)}${phone.slice(-2)}`;
}
