/*
 * exportMenuPDF — экспорт недельного меню в PDF (html2pdf.js).
 * На каждый видимый день строится блок-страница (страница по дням), печать A4.
 * Вся текстовая часть — на украинском языке. Брендовые цвета из нашей палитры.
 *
 * Структура повторяет проверенный оригинал my-ai-helper (exportMenuPDF.js):
 * innerHTML-строка, обычный поток документа, без абсолютного позиционирования —
 * иначе html2canvas рендерит пустой или смещённый PDF.
 *
 * Используется в MenuPlanner (вкладка «Кухня»).
 */
import type { Dish } from "@/hooks/useDishes";

export interface MenuDay {
  id: string;
  label: string;
  dateStr: string;
  dateISO: string;
}

/** Порядок типов блюд в меню (совпадает с MealTypes планировщика) */
const MEAL_ORDER: { id: string; label: string }[] = [
  { id: "soup", label: "Перша страва" },
  { id: "garnish", label: "Гарнір" },
  { id: "meat", label: "М'ясна страва" },
  { id: "salad", label: "Салат" },
  { id: "bakery", label: "Випічка" },
  { id: "drink", label: "Напій" },
];

const DAY_EMOJI: Record<string, string> = {
  monday: "🍲",
  tuesday: "🥗",
  wednesday: "🍝",
  thursday: "🍛",
  friday: "🥘",
  saturday: "🍽️",
  sunday: "🍽️",
};

const DAY_LABELS_UK: Record<string, string> = {
  monday: "Понеділок",
  tuesday: "Вівторок",
  wednesday: "Середа",
  thursday: "Четвер",
  friday: "П'ятниця",
  saturday: "Субота",
  sunday: "Неділя",
};

interface ExportMenuPDFArgs {
  visibleDays: MenuDay[];
  /** menu[dayId][mealTypeId] = [dishId] */
  menu: Record<string, Record<string, string[]>>;
  dishes: Dish[];
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Дата в украинской локали из ISO YYYY-MM-DD (без TZ-сдвигов) */
function formatUkDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
}

export async function exportMenuPDF({ visibleDays, menu, dishes }: ExportMenuPDFArgs): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;

  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const totalByDay: Record<string, number> = {};

  for (const day of visibleDays) {
    let total = 0;
    const dayMenu = menu[day.id] || {};
    for (const meal of MEAL_ORDER) {
      const dishId = dayMenu[meal.id]?.[0];
      if (!dishId) continue;
      const dish = dishById.get(dishId);
      if (dish) total += dish.price;
    }
    totalByDay[day.id] = total;
  }

  const element = document.createElement("div");
  // background на обёртке; отступы (padding) — на каждой секции-дне, чтобы
  // первая страница не начиналась ниже остальных (иначе offset только на стр.1)
  element.style.cssText =
    "font-family:Arial,sans-serif;color:#000000;background-color:#FFFFFF;";

  let htmlContent = "";

  visibleDays.forEach((day, dayIdx) => {
    const pageBreakStyle = dayIdx > 0 ? "page-break-before: always;" : "";
    const dayMenu = menu[day.id] || {};
    const emoji = DAY_EMOJI[day.id] || "🍽️";
    const label = DAY_LABELS_UK[day.id] || day.label;
    const dateStr = formatUkDate(day.dateISO);

    htmlContent += `
      <div style="padding: 30px; margin-bottom: 30px; ${pageBreakStyle}">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          <span style="font-size: 72px; margin-right: 20px;">${emoji}</span>
          <div>
            <h2 style="color: #507850; font-size: 32px; margin: 0; font-weight: bold;">
              ${esc(label)}
            </h2>
            <p style="color: #6b7280; font-size: 18px; margin: 8px 0 0 0;">${esc(dateStr)}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 16px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #507850 0%, #3c78c8 100%); color: #FFFFFF;">
              <th style="padding: 14px; text-align: left; border: 1px solid #507850;">Категорія</th>
              <th style="padding: 14px; text-align: left; border: 1px solid #507850;">Страва</th>
              <th style="padding: 14px; text-align: center; border: 1px solid #507850; width: 110px;">Ціна, ₴</th>
            </tr>
          </thead>
          <tbody>
    `;

    MEAL_ORDER.forEach((meal, index) => {
      const dishId = dayMenu[meal.id]?.[0];
      const dish = dishId ? dishById.get(dishId) : undefined;
      const bgColor = index % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
      const borderColor = index % 2 === 0 ? "#E2E8F0" : "#CBD5E1";
      const price = dish ? `${dish.price.toFixed(2)}₴` : "-";

      htmlContent += `
        <tr style="background-color: ${bgColor}; color: #000000;">
          <td style="padding: 14px; border: 1px solid ${borderColor}; font-weight: bold; color: #507850;">${esc(meal.label)}</td>
          <td style="padding: 14px; border: 1px solid ${borderColor};">${dish ? esc(dish.name) : "-"}</td>
          <td style="padding: 14px; border: 1px solid ${borderColor}; text-align: center;">${price}</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
          <tfoot>
            <tr style="background-color: #F0F7F0; font-weight: bold;">
              <td style="padding: 14px; border: 1px solid #CBD5E1; text-align: right;" colspan="2">Разом за день:</td>
              <td style="padding: 14px; border: 1px solid #CBD5E1; text-align: center; color: #507850;">${totalByDay[day.id].toFixed(2)}₴</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  });

  element.innerHTML = htmlContent;
  document.body.appendChild(element);

  const opt = {
    margin: 15,
    filename: `Меню_на_тиждень_${new Date().toISOString().slice(0, 10)}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: "#FFFFFF",
    },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } finally {
    element.remove();
  }
}
