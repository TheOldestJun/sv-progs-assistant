/*
 * API: /api/units (через api-factory)
 */
import { createHandlers } from "@/app/lib/api-factory";

const { GET, POST } = createHandlers({
  model: "unit",
  field: "title",
  uppercase: true,
});

export { GET, POST };
