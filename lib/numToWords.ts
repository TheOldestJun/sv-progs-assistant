/*
 * Преобразование чисел в пропись (русский язык).
 * Обёртка над to-words/ru-RU с тем же API, что и в Passes.jsx (uk-UA).
 * Функции:
 *   numToWords(num, opts?)       — с заглавной буквы
 *   numToWordsUpper(num, opts?)  — ВЕРХНИЙ РЕГИСТР
 *   numToWordsLower(num, opts?)  — нижний регистр
 *   numToCurrency(num)           — сумма прописью (рубли/копейки)
 */
import { toWords, toCurrency } from "to-words/ru-RU";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function toWordsWithOpts(
  num: number,
  decimalStyle?: "fraction" | "digit",
): string {
  if (Number.isInteger(num)) return toWords(num);
  return toWords(num, { decimalStyle });
}

export function numToWords(
  num: number,
  opts: { decimalStyle?: "fraction" | "digit" } = {},
): string {
  const { decimalStyle = "fraction" } = opts;
  return capitalize(toWordsWithOpts(num, decimalStyle));
}

export function numToWordsUpper(
  num: number,
  opts: { decimalStyle?: "fraction" | "digit" } = {},
): string {
  const { decimalStyle = "fraction" } = opts;
  return toWordsWithOpts(num, decimalStyle).toUpperCase();
}

export function numToWordsLower(
  num: number,
  opts: { decimalStyle?: "fraction" | "digit" } = {},
): string {
  const { decimalStyle = "fraction" } = opts;
  return toWordsWithOpts(num, decimalStyle).toLowerCase();
}

export function numToCurrency(num: number): string {
  const words = toCurrency(num);
  return capitalize(words);
}
