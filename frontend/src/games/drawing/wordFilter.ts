/**
 * 画板词表过滤（P1 提交链前端粗筛，工单 #9 T8）。
 *
 * 种子表，与后端 services/drawing_wordlist.go 对应，扩充走后续工单。
 * 归一化规则与后端对齐：小写化 → 非字母数字序列切分为空格分隔的词
 * （前端 TextDetector 识别英文场景为主，与 ASCII 词表匹配）。
 */

/** 种子词表（小写）：与后端 drawing_wordlist.go 同源。 */
const BLOCKED_WORDS: readonly string[] = [
	"fuck",
	"shit",
	"bitch",
	"asshole",
	"dick",
	"cunt",
	"nigger",
	"nigga",
	"penis",
	"vagina",
];

/**
 * 归一化：小写 + 非字母数字切分为空格分隔的词（连续非字母数字视为
 * 一个分隔符，如 "f,u,c,k" → "f u c k"）。
 */
export function normalizeForFilter(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

/** 命中任一种子词（全词匹配，归一化后按空格分词比对）。 */
export function containsBlockedWord(text: string): boolean {
	const normalized = normalizeForFilter(text);
	if (normalized.length === 0) return false;
	return normalized.split(" ").some((word) => BLOCKED_WORDS.includes(word));
}
