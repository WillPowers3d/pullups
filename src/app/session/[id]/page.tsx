import { SessionPlayer } from "@/components/train/session-player";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionPlayer id={id} />;
}
