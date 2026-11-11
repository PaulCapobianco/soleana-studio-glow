import {
  ADMIN_GUIDE_OTHER_SECTIONS,
  ADMIN_GUIDE_SECTIONS,
  ADMIN_GUIDE_TROUBLESHOOTING,
} from "@/data/admin-guide";

/** Page d'aide de l'administration : étapes numérotées, effet sur le site, pièges, dépannage. */
export function AdminGuide() {
  return (
    <div className="max-w-3xl space-y-10">
      <header className="space-y-3">
        <h1 className="font-display text-4xl italic text-primary">Aide</h1>
        <p className="text-sm text-muted-foreground">
          Des étapes courtes pour gérer vos événements et vos photos seule. En cas de doute, rien
          n&apos;est public tant qu&apos;un événement est un brouillon : vous pouvez essayer.
        </p>
        <nav aria-label="Sommaire de l'aide" className="border border-border bg-surface p-4">
          <ul className="space-y-2 text-sm">
            {ADMIN_GUIDE_SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="inline-block min-h-8 text-primary underline">
                  {section.title}
                </a>
              </li>
            ))}
            <li>
              <a href="#depannage" className="inline-block min-h-8 text-primary underline">
                Un message d&apos;erreur, un oubli, une question
              </a>
            </li>
          </ul>
        </nav>
      </header>

      {ADMIN_GUIDE_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-6 space-y-4">
          <h2 className="font-display text-2xl italic text-primary">{section.title}</h2>
          <p className="text-sm">{section.summary}</p>
          <ol className="list-decimal space-y-2 pl-6 text-sm">
            {section.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="border border-border bg-background p-3 text-sm">
            <strong>Sur le site : </strong>
            {section.publicImpact}
          </p>
          {section.commonMistake && (
            <div className="border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
              <p>
                <strong>Si : </strong>
                {section.commonMistake.problem}
              </p>
              <p className="mt-1">
                <strong>Alors : </strong>
                {section.commonMistake.fix}
              </p>
            </div>
          )}
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="font-display text-2xl italic text-primary">Les autres rubriques</h2>
        <p className="text-sm">
          Elles fonctionnent toutes pareil : modifiez, puis cliquez sur « Enregistrer ». Les
          changements sont visibles sur le site tout de suite.
        </p>
        <ul className="list-disc space-y-1 pl-6 text-sm">
          {ADMIN_GUIDE_OTHER_SECTIONS.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong> : {item.text}
            </li>
          ))}
        </ul>
      </section>

      <section id="depannage" className="scroll-mt-6 space-y-4">
        <h2 className="font-display text-2xl italic text-primary">
          Un message d&apos;erreur, un oubli, une question
        </h2>
        <dl className="space-y-4 text-sm">
          {ADMIN_GUIDE_TROUBLESHOOTING.map((item) => (
            <div key={item.question}>
              <dt className="font-medium">{item.question}</dt>
              <dd className="mt-1 text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
