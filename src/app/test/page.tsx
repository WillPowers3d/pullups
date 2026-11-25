import { MaxTestForm } from "@/components/train/max-test-form";

export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { prDate } = await searchParams;
  const value = typeof prDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(prDate) ? prDate : null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Baseline max test</h1>
      <MaxTestForm prDate={value} />
    </div>
  );
}
