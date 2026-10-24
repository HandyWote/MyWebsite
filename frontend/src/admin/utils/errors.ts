/**
 * 后台页族的 catch 分支文案工具。
 *
 * `catch (cause)` 在 strict 下是 unknown，而页族既有文案是
 * `前缀: <原始错误 message>`（例如 "上传失败: network down"）。这里把「从
 * unknown 里取可读 message」收成一处，避免每个页族各写一遍窄化逻辑。
 */
export function describeError(cause: unknown): string {
  const message = (cause as { message?: unknown } | null | undefined)?.message;
  if (typeof message === 'string' && message) return message;
  return String(cause);
}
