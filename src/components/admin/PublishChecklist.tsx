/** Points à vérifier avant (ou après) la publication : n'empêchent jamais de publier. */
export function PublishChecklist({
  warnings,
  published,
}: {
  warnings: string[];
  published: boolean;
}) {
  if (warnings.length === 0) return null;
  return (
    <aside
      aria-label="Points à vérifier"
      className="space-y-2 border border-orange-300 bg-orange-50 p-4 text-sm text-orange-900"
    >
      <p className="font-medium">
        {published
          ? "À vérifier sur cette page publiée"
          : "À vérifier avant de publier (vous pouvez publier quand même)"}
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </aside>
  );
}
