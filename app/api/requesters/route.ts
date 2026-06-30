/*
 * API: /api/requesters (через api-factory)
 * Использует поле 'name' и возвращает AutocompleteItem[] формат
 */
import { createHandlers } from "@/app/lib/api-factory";

const { GET, POST } = createHandlers({
  model: "requester",
  field: "name",
  asAutocompleteItem: true,
  uppercase: false,
});

export { GET, POST };
