/**
 * 将 tags 统一转换为数组。
 * 后端可能返回逗号分隔字符串或数组，此工具统一归一化。
 *
 * @param {string|Array} tags
 * @returns {Array<string>}
 */
export function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.filter(t => t.trim());
  if (typeof tags === 'string') return tags.split(',').filter(t => t.trim());
  return [];
}
