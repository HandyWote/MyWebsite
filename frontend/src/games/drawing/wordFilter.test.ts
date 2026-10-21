import { describe, expect, it } from "vitest";
import { containsBlockedWord, normalizeForFilter } from "./wordFilter";

describe("normalizeForFilter", () => {
	it("lowercases and splits on non-alphanumeric runs", () => {
		expect(normalizeForFilter("F,u.Ck")).toBe("f u ck");
		expect(normalizeForFilter("  Hello, World!  ")).toBe("hello world");
		expect(normalizeForFilter("f-u-c-k")).toBe("f u c k");
	});

	it("collapses a run of separators into a single space and trims edges", () => {
		expect(normalizeForFilter("a!!!b")).toBe("a b");
		expect(normalizeForFilter("!!!")).toBe("");
		expect(normalizeForFilter("")).toBe("");
	});

	it("keeps letters and digits", () => {
		expect(normalizeForFilter("Abc123")).toBe("abc123");
	});
});

describe("containsBlockedWord", () => {
	it("matches a seed word as a whole word, case-insensitively", () => {
		expect(containsBlockedWord("Fuck")).toBe(true);
		expect(containsBlockedWord("this is Shit!")).toBe(true);
		expect(containsBlockedWord("NIGGER")).toBe(true);
	});

	it("does not match when separators split the letters (no substring smuggling)", () => {
		// f,u,c,k 归一化后是四个单词，与词表全词比对不命中
		expect(containsBlockedWord("f,u,c,k")).toBe(false);
	});

	it("does not flag innocuous words or substrings inside larger words", () => {
		expect(containsBlockedWord("hello world")).toBe(false);
		expect(containsBlockedWord("class")).toBe(false);
		expect(containsBlockedWord("assess")).toBe(false);
		expect(containsBlockedWord("")).toBe(false);
	});
});
