/**
 * 格式化日期为本地化字符串。
 * 统一项目中多处重复的 formatDate 逻辑。
 *
 * @param {string|Date} dateString - 日期字符串或 Date 对象
 * @param {object} options - 传给 toLocaleString 的选项（可选）
 * @returns {string}
 */
export function formatDate(dateString, options) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const defaults = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(options || {}),
  };
  return date.toLocaleDateString('zh-CN', defaults);
}

/**
 * 格式化日期（含时分）。
 *
 * @param {string|Date} dateString
 * @returns {string}
 */
export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
}
