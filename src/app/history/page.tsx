import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      <Alert>
        <AlertTitle>Ticket T15</AlertTitle>
        <AlertDescription>
          Past sessions, max-reps over the block, and completed blocks.
        </AlertDescription>
      </Alert>
    </div>
  );
}
