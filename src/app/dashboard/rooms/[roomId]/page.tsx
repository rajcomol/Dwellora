import RoomDetailPageClient from "@/components/dashboard/RoomDetailPageClient";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <RoomDetailPageClient roomId={roomId} />;
}
