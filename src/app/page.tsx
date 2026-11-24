import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PRINCIPLES } from "@/lib/train/principles";
import { cn } from "cn";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Guided training</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Twelve weeks to a pull-up PR
        </h1>
        <p className="max-w-xl text-muted-foreground">
          This app walks you through each session and the calendar around it,
          using the twelve training principles from <em>Pull Yourself Up</em>.
          It lives at <code className="text-foreground">/app</code> and is a
          companion to{" "}
          <a
            className="underline underline-offset-4"
            href="https://github.com/WillPowers3d/pullups-with-friends"
          >
            Pullups With Friends
          </a>
          — video grading and the leaderboard stay there.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/start" className={cn(buttonVariants())}>
            Start a block
          </Link>
          <Link
            href="/principles"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Read the principles
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {PRINCIPLES.map((principle) => (
          <Card key={principle.n} size="sm">
            <CardHeader>
              <CardDescription>Principle {principle.n}</CardDescription>
              <CardTitle>{principle.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              {principle.summary}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
