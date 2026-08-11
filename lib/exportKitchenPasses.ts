/*
 * exportKitchenPasses — генерация Excel-файла пропусков для кухни на неделю.
 *
 * Берёт шаблон IN_OUT.xlsx (в нём три листа: IN — один пропуск «Ввоз», OUT — один
 * пропуск «Вывоз», IN_OUT — два пропуска рядом). Для каждого дня недели, где есть
 * хотя бы одно блюдо, создаётся ОТДЕЛЬНЫЙ лист:
 * - «Ввоз 11.08» — клон листа IN (столбцы A:G, ячейки G56/G57 — даты)
 * - «Вывоз 12.08» — клон листа OUT
 * Клон делается через worksheet.model (JSON-копия) — единственный надёжный способ
 * размножить лист в exceljs с сохранением всех стилей и печатных настроек.
 *
 * На каждый лист записываются только названия блюд (столбец B, строки 18+);
 * количество и единицы измерения для кухни пропускаются (решение по ТЗ).
 * Итог — один файл ПРОПУСКИ_КУХНЯ_<дата начала>.xlsx со всеми листами.
 */
import ExcelJS from "exceljs";

const TEMPLATE_URL = "/xls/IN_OUT.xlsx";

/** Количество строк под позиции в шаблоне (см. PassForm: rows 18+, до 48) */
const MAX_ROWS = 31;

function fmtDateRu(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

export interface KitchenPassDay {
  /** ISO YYYY-MM-DD */
  dateISO: string;
  /** Отображаемое имя дня (например «Ввоз 11.08» / «Вывоз 11.08») */
  label: string;
  /** Названия блюд для этого листа */
  dishNames: string[];
}

export async function exportKitchenPasses(days: KitchenPassDay[]): Promise<void> {
  const resp = await fetch(TEMPLATE_URL);
  const buf = await resp.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const sheets: Record<string, string> = {
    IN: "IN",
    OUT: "OUT",
  };

  // Загружаем исходные листы и их модели до удаления
  const inSheet = wb.getWorksheet("IN");
  const outSheet = wb.getWorksheet("OUT");
  const inModel = inSheet ? JSON.parse(JSON.stringify(inSheet.model)) : null;
  const outModel = outSheet ? JSON.parse(JSON.stringify(outSheet.model)) : null;

  // Удаляем все исходные листы шаблона
  ["IN", "OUT", "IN_OUT"].forEach((name) => {
    const s = wb.getWorksheet(name);
    if (s) wb.removeWorksheet(s.id);
  });

  if (!inModel || !outModel) {
    throw new Error("Шаблон не содержит листов IN/OUT");
  }

  days.forEach((day) => {
    const isImport = day.label.startsWith("Ввоз");
    const model = isImport ? inModel : outModel;
    const ws = wb.addWorksheet(day.label);
    ws.model = JSON.parse(JSON.stringify(model));
    ws.name = day.label;

    // Даты начала/конца действия — как в PassForm: G56 = start, G57 = start+7д
    const start = new Date(day.dateISO + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    ws.getCell("G56").value = fmtDateRu(day.dateISO);
    ws.getCell("G57").value = fmtDateRu(
      `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`,
    );

    // Названия блюд в столбец B, строки 18+ (только имена — без кол-ва/единиц)
    day.dishNames.slice(0, MAX_ROWS).forEach((name, i) => {
      const row = 18 + i;
      if (row > 48) return;
      ws.getCell(`A${row}`).value = i + 1;
      ws.getCell(`B${row}`).value = name;
    });
  });

  const outBuf = await wb.xlsx.writeBuffer();
  const blob = new Blob([outBuf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ПРОПУСКИ_КУХНЯ_${days[0]?.dateISO ?? ""}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
