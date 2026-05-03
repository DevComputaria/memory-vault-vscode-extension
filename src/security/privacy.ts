const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const IPV4_REGEX = /\b((25[0-5]|2[0-4]\d|[0-1]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[0-1]?\d\d?)\b/g;

export function applyPrivacyRules(content: string): string {
  return content
    .replace(EMAIL_REGEX, '[redacted-email]')
    .replace(IPV4_REGEX, '[redacted-ip]')
    .trim();
}
