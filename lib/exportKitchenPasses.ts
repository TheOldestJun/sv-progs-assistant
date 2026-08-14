/*
 * exportKitchenPasses — экспорт пропусков кухни (ввоз/вывоз) в Excel.
 *
 * Использует лист KITCHEN шаблона IN_OUT.xlsx, где размещено 5 одинаковых
 * блоков-пропусков (ВВЕЗЕННЯ слева, ВИВІЗ справа; правая половина зеркалит
 * левую формулами IF(...)). Каждый блок занимает 65 строк, блоки начинаются
 * со строк 2, 67, 132, 197, 262.
 *
 * Схема блока (base = первая строка блока):
 *   - base+7  — строка «від»: дата дня (ячейки B и I, формат dd.mm.yyyy)
 *   - base+54 — «ПОГОДЖЕНО ДзБ: З»: дата «з» (G — слева, N зеркалит формулой)
 *   - base+55 — «ПО»: дата «по» (G — слева, N зеркалит формулой)
 *       «з» = дата дня, «по» = дата дня + 7 дней
 *   - base+16 … base+46 — строки позиций (максимум 31)
 *       A — № п/п, B — наименование, D — единица изм., E — кол-во (цифрами),
 *       F — кол-во (прописью, украинский)
 *
 * Заполняются только дни, в которых есть блюда с количеством порций > 0,
 * по порядку следования дней недели; если таких дней больше 5 — берутся первые 5.
 * Не заполненные блоки-пропуски (хвост листа) обрезаются — в файле остаётся
 * ровно столько пропусков, сколько дней с блюдами (печать без пустых страниц).
 * Для блюд единица измерения — «ПОРЦ», для хлеба — «КУС».
 *
 * Используется в KitchenPasses (вкладка «Кухня» → «Создание пропусков»).
 */
import ExcelJS from "exceljs";
import { numToWordsUpper } from "./numToWords";

export interface KitchenPassItem {
  /** Наименование позиции (блюдо или «ХЛІБ») */
  name: string;
  /** Единица измерения: «ПОРЦ» для блюд, «КУС» для хлеба */
  unit: string;
  /** Количество порций */
  quantity: number;
}

export interface KitchenPassDay {
  /** Дата дня в формате YYYY-MM-DD (идёт в «від» пропуска) */
  dateISO: string;
  /** Позиции дня (только с quantity > 0) */
  items: KitchenPassItem[];
}

const TEMPLATE_URL = "/xls/IN_OUT.xlsx";

/** Первая строка первого блока пропуска */
const BLOCK_BASE = 2;
/** Шаг между блоками (все блоки одинаковой высоты) */
const BLOCK_STEP = 65;
/** Смещение от base до строки «від» (B9 = base+7) */
const DATE_ROW_OFFSET = 7;
/** Смещение от base до строки «ПОГОДЖЕНО ДзБ: З» (G56 = base+54) */
const AGREE_FROM_ROW_OFFSET = 54;
/** Смещение от base до строки «ПО» (G57 = base+55) */
const AGREE_TO_ROW_OFFSET = 55;
/** Смещение от base до первой строки позиций (A18 = base+16) */
const ITEMS_START_OFFSET = 16;
/** Максимум строк позиций в блоке (18..48 = 31 строка) */
const MAX_ITEMS = 31;
/** Шаблон вмещает 5 пропусков */
const MAX_BLOCKS = 5;

/** Дата из ISO YYYY-MM-DD как UTC Date (без TZ-сдвигов при записи в Excel) */
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Прибавляет дней к ISO дате и возвращает ISO YYYY-MM-DD (UTC, без TZ-сдвигов) */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Заполняет один блок-пропуск данными дня */
function fillBlock(
  ws: ExcelJS.Worksheet,
  base: number,
  day: KitchenPassDay,
  weekStartISO: string,
): void {
  // Даты «від» — слева (B) и справа (I); на всех пропусках дата начала недели
  ws.getCell(`B${base + DATE_ROW_OFFSET}`).value = isoToDate(weekStartISO);
  ws.getCell(`I${base + DATE_ROW_OFFSET}`).value = isoToDate(weekStartISO);

  // «ПОГОДЖЕНО ДзБ: З … ПО»: «з» = начало недели, «по» = начало недели + 7 дней
  // (G — слева, N справа зеркалит формулой IF(...), поэтому достаточно заполнить
  // левую сторону). Формат дат — как у «від» пропуска: dd.mm.yyyy
  const agreeFrom = ws.getCell(`G${base + AGREE_FROM_ROW_OFFSET}`);
  agreeFrom.value = isoToDate(weekStartISO);
  agreeFrom.numFmt = "dd.mm.yyyy;@";
  const agreeTo = ws.getCell(`G${base + AGREE_TO_ROW_OFFSET}`);
  agreeTo.value = isoToDate(addDays(weekStartISO, 7));
  agreeTo.numFmt = "dd.mm.yyyy;@";

  // Зеркальные ячейки справа (формулы IF(...)) — тот же формат дат
  ws.getCell(`N${base + AGREE_FROM_ROW_OFFSET}`).numFmt = "dd.mm.yyyy;@";
  ws.getCell(`N${base + AGREE_TO_ROW_OFFSET}`).numFmt = "dd.mm.yyyy;@";

  day.items.slice(0, MAX_ITEMS).forEach((item, i) => {
    const row = base + ITEMS_START_OFFSET + i;
    ws.getCell(`A${row}`).value = i + 1;
    ws.getCell(`B${row}`).value = item.name;
    ws.getCell(`D${row}`).value = item.unit;
    ws.getCell(`E${row}`).value = item.quantity;
    ws.getCell(`F${row}`).value = numToWordsUpper(item.quantity);
  });
}

/**
 * Генерирует Excel с пропусками кухни и скачивает его.
 * days — дни с блюдами (в порядке недели). Удаляет из файла листы IN/OUT/IN_OUT,
 * оставляет только KITCHEN. Дата «від»/«з»/«по» на ВСЕХ пропусках берётся из
 * weekStartISO (начало недели; «по» = начало недели + 7 дней).
 */
export async function exportKitchenPasses(
  days: KitchenPassDay[],
  weekStartISO: string,
): Promise<void> {
  const resp = await fetch(TEMPLATE_URL);
  const buf = await resp.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  // Оставляем только лист KITCHEN
  for (const name of ["IN", "OUT", "IN_OUT"]) {
    const s = wb.getWorksheet(name);
    if (s) wb.removeWorksheet(s.id);
  }

  const ws = wb.getWorksheet("KITCHEN");
  if (!ws) {
    throw new Error("Шаблон не содержит лист KITCHEN");
  }

  days.slice(0, MAX_BLOCKS).forEach((day, i) => {
    fillBlock(ws, BLOCK_BASE + i * BLOCK_STEP, day, weekStartISO);
  });

  // Обрезаем не заполненные блоки-пропуски (хвост листа).
  // В exceljs 4.4.0 spliceRows при удалении до конца листа не срабатывает
  // (пустой цикл сдвига), поэтому усекаем внутренний массив строк напрямую
  // и убираем мерджи/printArea за последней нужной строкой.
  const usedBlocks = Math.min(days.length, MAX_BLOCKS);
  const lastKeep = BLOCK_BASE + usedBlocks * BLOCK_STEP - 2;
  const rawWs = ws as unknown as {
    _rows: unknown[];
    model: { merges: { top: number; left: number; bottom: number; right: number }[] };
  };
  if (rawWs._rows.length > lastKeep) rawWs._rows.length = lastKeep;
  rawWs.model.merges = rawWs.model.merges.filter(
    (m) => m.bottom <= lastKeep && m.top <= lastKeep,
  );
  ws.pageSetup.printArea = `A1:N${lastKeep}`;

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const fileName = `ПРОПУСК_кухня_${day}${month}${year}.xlsx`;

  const outBuf = await wb.xlsx.writeBuffer();
  const blob = new Blob([outBuf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
