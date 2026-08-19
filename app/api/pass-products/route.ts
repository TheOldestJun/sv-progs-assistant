/*
 * /api/pass-products — справочник ТМЦ для пропусков (отдельный от Product).
 * GET  — список (для автокомплита пропусков)
 * POST — создание (снабжение + админ)
 */
import { createHandlers } from "@/app/lib/api-factory";

const { GET, POST } = createHandlers({
  model: "passProduct",
  field: "title",
  uppercase: true,
});

export { GET, POST };
