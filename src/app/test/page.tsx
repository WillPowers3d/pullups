import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TestPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Baseline max test</h1>
      <Alert>
        <AlertTitle>Ticket T13</AlertTitle>
        <AlertDescription>
          Guided max-test session. Warm-up, one strict max set, optional
          outbound link to Pullups With Friends for video grading.
        </AlertDescription>
      </Alert>
    </div>
  );
}
