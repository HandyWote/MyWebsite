/**
 * 将 tags 统一转换为数组。
 * 后端可能返回逗号分隔字符串或数组，此工具统一归一化。
 */

/** 归一化后的标签：只丢掉空白项，其余原样保留（与后端字段一致）。 */
export function normalizeTags(tags?: string | string[] | null): string[] {
  if (Array.isArray(tags)) return tags.filter((t) => t.trim());
  if (typeof tags === 'string') return tags.split(',').filter((t) => t.trim());
  return [];
}
