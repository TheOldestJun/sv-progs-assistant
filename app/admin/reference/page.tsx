/*
 * /admin/reference — исправление/добавление ТМЦ и единиц измерения (только ADMIN)
 */
export const dynamic = "force-dynamic";

import { ReferenceEditor } from "./ReferenceEditor";

export default function ReferencePage() {
  return <ReferenceEditor />;
}
