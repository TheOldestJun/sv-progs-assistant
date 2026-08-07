/*
 * Генератор Excel-файла заявки по шаблону public/xls/REQUEST.xlsx.
 * Сценарий идентичен пропускам (PassForm): шаблон грузится клиентом через fetch,
 * в него записываются значения, буфер сохраняется как .xlsx — всё форматирование
 * шаблона (шрифты, рамки, объединение G6:H6) сохраняется.
 *
 * Структура шаблона (лист «Лист1»):
 *   - G6:H6 (объединено)  — дата заявки («ЗАЯВКА від …»)
 *   - строки 11–35        — таблица позиций: A=№, B=наименование, M=количество, N=единица
 *   - B37/K37             — подпись: должность + имя заявителя (sample)
 *
 * Подпись размещается через одну (пустую) строку после последней позиции заявки,
 * а неиспользуемые строки хвоста шаблона удаляются.
 * Лимит позиций — 25 (строки 11–35).
 */
import ExcelJS from "exceljs";

const TEMPLATE_URL = "/xls/REQUEST.xlsx";
const SHEET_NAME = "Лист1";
const FIRST_ITEM_ROW = 11;
const LAST_ITEM_ROW = 35;
export const MAX_ITEMS = LAST_ITEM_ROW - FIRST_ITEM_ROW + 1; // 25

// Должность и имя подписанта берутся из шаблона (B37/K37) и копируются в строку подписи
const SIGN_POSITION_CELL = "B37";
const SIGN_NAME_CELL = "K37";

const ITEM_COLUMNS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
];

export interface RequestExcelItem {
  title: string;
  unitTitle: string;
  quantity: number;
}

export interface RequestExcelOptions {
  /** Дата заявки в формате YYYY-MM-DD */
  date: string;
  items: RequestExcelItem[];
  /** Имя заявителя для подписи */
  requesterName: string;
}

/** DD.MM.YYYY в локальной таймзоне */
function formatDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function downloadRequestExcel(opts: RequestExcelOptions): Promise<void> {
  if (opts.items.length === 0) {
    throw new Error("Добавьте хотя бы одну позицию");
  }
  if (opts.items.length > MAX_ITEMS) {
    throw new Error(`В шаблоне максимум ${MAX_ITEMS} позиций`);
  }
  if (!opts.date) {
    throw new Error("Укажите дату заявки");
  }

  const resp = await fetch(TEMPLATE_URL);
  const buf = await resp.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet(SHEET_NAME);
  if (!ws) {
    throw new Error("Шаблон не содержит лист «" + SHEET_NAME + "»");
  }

  // 1. Дата заявки — «ЗАЯВКА від …» (объединённые G6:H6)
  ws.getCell("G6").value = formatDate(new Date(opts.date + "T00:00:00"));

  // 2. Очистка sample-содержимого таблицы (в шаблоне заполнены B и N), значения обнуляем,
  //    стили ячеек (рамки, шрифты) сохраняются.
  for (let r = FIRST_ITEM_ROW; r <= LAST_ITEM_ROW; r++) {
    for (const col of ITEM_COLUMNS) {
      ws.getCell(`${col}${r}`).value = null;
    }
  }

  // 3. Заполнение позиций: A=№, B=наименование, M=количество, N=единица
  opts.items.forEach((item, i) => {
    const row = FIRST_ITEM_ROW + i;
    ws.getCell(`A${row}`).value = i + 1;
    ws.getCell(`B${row}`).value = item.title;
    ws.getCell(`M${row}`).value = item.quantity;
    ws.getCell(`N${row}`).value = item.unitTitle;
  });

  // 4. Подпись — через одну (пустую) строку после последней позиции, как просил заявитель:
  //    между последним пунктом и строкой подписи остаётся одна незаполненная строка.
  //    Должность и стиль копируем из шаблона (B37/K37), имя — заявителя.
  const lastItemRow = FIRST_ITEM_ROW + opts.items.length - 1;
  const sigRow = lastItemRow + 2;
  const positionCell = ws.getCell(`B${sigRow}`);
  const nameCell = ws.getCell(`K${sigRow}`);

  const posSource = ws.getCell(SIGN_POSITION_CELL);
  const nameSource = ws.getCell(SIGN_NAME_CELL);
  positionCell.value = posSource.value;
  positionCell.style = posSource.style;
  // Фамилия заказчика — всегда второе слово в имени — выводится ЗАГЛАВНЫМИ буквами.
  // Пример: «Иван Петров» → «Иван ПЕТРОВ».
  const nameParts = opts.requesterName.trim().split(/\s+/);
  const surname = nameParts.length >= 2 ? nameParts[1] : null;
  nameCell.value = surname ? `${nameParts[0]} ${surname.toUpperCase()}` : opts.requesterName;
  nameCell.style = nameSource.style;

  // 5. Удаляем неиспользуемые строки ниже подписи (хвост таблицы + строки 36–39 шаблона),
  //    чтобы в файле не осталось пустой таблицы с рамками и sample-подписи (Марк Демешко).
  //    ВНИМАНИЕ: ws.spliceRows() в exceljs 4.4.0 удаляет максимум одну строку (известный баг),
  //    поэтому обрезаем внутренний массив строк напрямую (0-индекс: строка N на индексе N-1).
  type WorksheetWithRows = ExcelJS.Worksheet & { _rows: unknown[] };
  (ws as WorksheetWithRows)._rows.length = sigRow;

  // Область печати шаблона была A1:N38 (на всю таблицу) — сужаем под итоговый размер,
  // чтобы при печати не захватывались пустые строки ниже подписи.
  ws.pageSetup.printArea = `A1:N${sigRow}`;

  // Принудительно умещаем весь лист на ОДНУ страницу: шаблон широкий (A–N, 14 колонок)
  // и без этого при печати рвётся по горизонтали на несколько страниц. Fit-to-page
  // масштабирует содержимое (scale < 100%) так, что и ширина, и высота влезают в 1 страницу.
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 1;

  // 6. Скачивание файла
  const d = new Date(opts.date + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const fileName = `ЗАЯВКА_${day}${month}${year}.xlsx`;

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
