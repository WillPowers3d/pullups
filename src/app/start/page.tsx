import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StartPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Start a block</h1>
      <Alert>
        <AlertTitle>Ticket T13</AlertTitle>
        <AlertDescription>
          Onboarding (equipment, pull days, PR date) is not wired yet. See{" "}
          <code>docs/tickets/13-onboarding.md</code>. The baseline max test
          will live at <Link href="/test" className="underline">/test</Link>.
        </AlertDescription>
      </Alert>
    </div>
  );
}
