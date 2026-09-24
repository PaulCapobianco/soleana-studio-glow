import { Reveal } from "./Reveal";

interface ExperienceStep {
  icon: string;
  title: string;
  description: string;
}

interface ExperienceSectionProps {
  steps: ExperienceStep[];
}

export function ExperienceSection({ steps }: ExperienceSectionProps) {
  return (
    <section className="py-24 px-6 bg-surface">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
              Comment ça se passe
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-primary">L'expérience</h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="text-center">
                <div className="mb-6 inline-block text-6xl">{step.icon}</div>
                <h3 className="font-display text-2xl text-primary mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
