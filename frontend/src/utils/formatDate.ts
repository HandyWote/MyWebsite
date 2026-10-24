/**
 * 格式化日期为本地化字符串。
 * 统一项目中多处重复的 formatDate 逻辑。
 */

/** 可被 `new Date()` 接受的日期来源（空值原样返回空串）。 */
export type DateInput = string | Date | null | undefined;

/**
 * 格式化为 `zh-CN` 日期字符串（默认 年/月/日）。
 *
 * @param dateString 日期字符串、时间戳或 Date 对象；空值返回空串
 * @param options 传给 toLocaleDateString 的选项（可选）
 */
export function formatDate(
  dateString: DateInput,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const defaults: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  };
  return date.toLocaleDateString('zh-CN', defaults);
}

/** 格式化日期（含时分）；空值返回空串。 */
export function formatDateTime(dateString: DateInput): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
}
