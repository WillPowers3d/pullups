import Link from "next/link";
import { SetupForm } from "@/components/train/setup-form";
import { PRINCIPLES } from "@/lib/train/principles";

export default function StartPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Start a block</h1>
        <p className="text-muted-foreground">
          Twelve principles drive every session.{" "}
          <Link href="/principles" className="underline underline-offset-4">
            Why?
          </Link>
        </p>
        <ol className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <li key={p.n}>
              <span className="font-medium text-foreground">{p.n}. {p.name}</span>
            </li>
          ))}
        </ol>
      </section>
      <SetupForm />
    </div>
  );
}
