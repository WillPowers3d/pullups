import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, History, House, Info, Timer } from "lucide-react";
import { cn } from "cn";

const LINKS = [
  { href: "/", label: "Today", icon: House },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/history", label: "History", icon: History },
  { href: "/principles", label: "Principles", icon: Info },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Timer className="size-4" />
            Pullups
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        {children}
      </main>
      <nav className="sticky bottom-0 border-t bg-card sm:hidden">
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] text-muted-foreground",
                )}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
