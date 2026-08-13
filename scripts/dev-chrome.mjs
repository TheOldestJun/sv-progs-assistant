/*
 * dev-chrome.mjs — кроссплатформенный запуск dev-сервера + Chrome с чистым профилем.
 * Windows: два окна cmd (сервер + Chrome после ожидания). Содержит Windows-only
 * фикс запуска сервера (start /d) — НЕ применять его к macOS.
 * macOS: новое окно Terminal (сервер) + Chrome после ожидания (без фиксов).
 *
 * Используется: npm run dev:chrome
 */

import { spawn } from "child_process";
import { platform, homedir } from "os";
import { existsSync, mkdirSync } from "fs";

const isWin = platform() === "win32";

function getChromePaths() {
  if (isWin) {
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ];
  }
  // macOS
  return [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    `${homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  ];
}

function getTempDir() {
  if (isWin) {
    const dir = `${process.env.TEMP}\\chrome-debug`;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }
  const dir = `${process.env.TMPDIR || "/tmp/"}chrome-debug`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function startDevServer() {
  if (isWin) {
    // ⚠️ WINDOWS-ONLY фикс: start /d задаёт стартовую директорию нового окна cmd —
    // без неё окно может стартовать из System32 и не найти next в node_modules/.bin.
    // Команду передаём ОДНОЙ строкой: при shell:true Node склеивает аргументы
    // массива БЕЗ кавычек, и `start "Next.js Dev"` (заголовок с пробелом) ломается.
    // НЕ применять этот фикс к macOS — там команда работает без него.
    const projectDir = process.cwd();
    const cmdLine = `start "Next.js Dev" /d "${projectDir}" cmd /k npm run dev`;
    spawn("cmd", ["/c", cmdLine], { shell: true, stdio: "inherit", cwd: projectDir });
    console.log("> Сервер запущен в новом окне cmd");
    return;
  }

  // macOS — новое окно Terminal (проверено, работает без изменений)
  const script = `tell app "Terminal" to do script "cd ${process.cwd()} && npm run dev"`;
  spawn("osascript", ["-e", script], { stdio: "inherit" });
  console.log("> Сервер запущен в новом окне Terminal");
}

function openChrome(url) {
  const chromePaths = getChromePaths();
  const chromePath = chromePaths.find((p) => existsSync(p));

  if (!chromePath) {
    console.error("! Chrome не найден. Откройте вручную: " + url);
    return;
  }

  const tempDir = getTempDir();
  const args = [
    `--user-data-dir=${tempDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    url,
  ];

  const proc = spawn(chromePath, args, {
    stdio: "ignore",
    detached: true,
    shell: false,
  });
  proc.unref();
  console.log(`> Chrome открыт на ${url} (профиль: ${tempDir})`);
}

// Запуск
const url = "http://localhost:3000";
startDevServer();

const waitMs = isWin ? 12000 : 11000;
console.log(`> Ожидание ${waitMs / 1000}с перед открытием Chrome...`);
setTimeout(() => openChrome(url), waitMs);
