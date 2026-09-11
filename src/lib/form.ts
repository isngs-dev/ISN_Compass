/**
 * Reads a field from FormData, treating "", "undefined", and "null" as absent.
 * Form libraries occasionally serialize an unselected/cleared control as the literal
 * text "undefined" rather than an empty string — passed straight to `String(...)`,
 * that text then reaches a query as real data (e.g. `invalid input syntax for type
 * uuid: "undefined"` instead of just leaving the field unset).
 */
export function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return !trimmed || trimmed === "undefined" || trimmed === "null" ? undefined : trimmed;
}
