package services

// 画布投稿 OCR 通道的敏感词表(种子表,扩充走后续工单)。小写精确匹配:
// 转录文本按非字母数字切词后与词表全等比较,不取子串,避免误杀正常英文
// 单词;真正需要防规避(分隔符、变体)属于后续工单的增强,不在 T5 范围。

import "strings"

// DrawingWordlist 供词表命中测试导出;扩表只改这里。
var DrawingWordlist = []string{
	// 色情/性
	"sex", "porn", "nude", "fuck", "dick", "cock", "cunt", "ass", "tits",
	// 仇恨/歧视
	"nigger", "nigga", "faggot", "kike", "spic", "chink",
	// 毒品
	"meth", "heroin", "cocaine",
	// 政治敏感符号的字母缩写写法
	"nazi", "hitler", "isis", "fuckccp",
}

// MatchDrawingWordlist 返回转录文本命中的第一个词表词;无命中返回空串。
// 词表按小写精确词匹配:转录先整体小写,再按非字母数字切词。
func MatchDrawingWordlist(transcript string) string {
	normalized := strings.ToLower(strings.TrimSpace(transcript))
	if normalized == "" {
		return ""
	}
	// 按非字母数字切词,保证整词全等而不是子串包含。
	fields := strings.FieldsFunc(normalized, func(r rune) bool {
		return !(r >= 'a' && r <= 'z' || r >= '0' && r <= '9')
	})
	banned := make(map[string]struct{}, len(DrawingWordlist))
	for _, word := range DrawingWordlist {
		banned[strings.ToLower(strings.TrimSpace(word))] = struct{}{}
	}
	for _, field := range fields {
		if _, hit := banned[field]; hit {
			return field
		}
	}
	return ""
}
