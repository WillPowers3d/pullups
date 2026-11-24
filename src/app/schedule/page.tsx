import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
      <Alert>
        <AlertTitle>Ticket T15</AlertTitle>
        <AlertDescription>
          12-week calendar. Moves must go through <code>legalMoveDays</code>.
          See <code>docs/tickets/15-dashboard-schedule.md</code>.
        </AlertDescription>
      </Alert>
    </div>
  );
}
