const SECRET_PATTERNS: RegExp[] = [
  /AKIA[0-9A-Z]{16}/,
  /ASIA[0-9A-Z]{16}/,
  /ghp_[0-9a-zA-Z]{36}/,
  /github_pat_[0-9a-zA-Z_]{60,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+/,
  /(password|passwd|pwd)\s*[=:]\s*['\"][^'\"]+['\"]/i,
  /(api[_-]?key|token|secret)\s*[=:]\s*['\"][^'\"]+['\"]/i,
  /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/
];

export function scanForSecrets(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}
