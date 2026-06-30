/*
 * API: /api/products (через api-factory)
 */
import { createHandlers } from "@/app/lib/api-factory";

const { GET, POST } = createHandlers({
  model: "product",
  field: "title",
  uppercase: true,
});

export { GET, POST };
