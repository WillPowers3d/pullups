import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Session</h1>
      <p className="text-sm text-muted-foreground">id: {id}</p>
      <Alert>
        <AlertTitle>Ticket T14</AlertTitle>
        <AlertDescription>
          Live guided session driven by{" "}
          <code>src/lib/train/engine/session-machine.ts</code>. Rest cannot be
          skipped. See <code>docs/tickets/14-live-session.md</code>.
        </AlertDescription>
      </Alert>
    </div>
  );
}
