import { Canvas } from "@/components/Canvas";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Canvas boardId={id} />;
}
