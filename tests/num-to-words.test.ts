import { describe, it, expect } from "vitest";
import { numToWords, numToWordsLower, numToCurrency } from "../lib/numToWords";

describe("numToWords", () => {
  it("converts integer to words", () => {
    const result = numToWords(123);
    expect(result).toBe("Сто двадцать три");
  });

  it("converts zero", () => {
    const result = numToWords(0);
    expect(result).toBe("Ноль");
  });

  it("converts decimal with fraction style", () => {
    const result = numToWords(12.5);
    expect(result).toBe("Двенадцать и пять десятых");
  });

  it("handles large numbers", () => {
    const result = numToWords(1001);
    expect(result).toBe("Тысяча один");
  });

  it("converts in lowercase", () => {
    const result = numToWordsLower(42);
    expect(result).toBe("сорок два");
  });
});

describe("numToCurrency", () => {
  it("converts ruble amount to words", () => {
    const result = numToCurrency(150.5);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});
