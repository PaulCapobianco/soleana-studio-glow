// Standard, explicit delete confirmation wording used across every admin
// list. `label` names what's being deleted, e.g. "cette question",
// "cet avis", "cette photo".
export function confirmDelete(label: string): boolean {
  return window.confirm(`Supprimer ${label} ? Cette action est définitive.`);
}
