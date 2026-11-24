import { PRINCIPLES } from "@/lib/train/principles";

export default function PrinciplesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Twelve principles</h1>
        <p className="text-muted-foreground">
          From Part Two of <em>Pull Yourself Up</em>. Exact book numbers are
          unknown; every figure in the engine is a cited default in{" "}
          <code>src/lib/train/config.ts</code>. Sources live in{" "}
          <code>docs/RESEARCH.md</code>.
        </p>
      </header>
      <ol className="flex flex-col gap-6">
        {PRINCIPLES.map((principle) => (
          <li key={principle.n} className="flex flex-col gap-1.5">
            <h2 className="text-lg font-medium">
              {principle.n}. {principle.name}
            </h2>
            <p>{principle.summary}</p>
            <p className="text-sm text-muted-foreground">{principle.why}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
