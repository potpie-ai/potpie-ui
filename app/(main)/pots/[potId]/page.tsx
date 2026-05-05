import { redirect } from "next/navigation";

export default async function PotIndexPage({
  params,
}: {
  params: Promise<{ potId: string }>;
}) {
  const { potId } = await params;
  redirect(`/pots/${potId}/overview`);
}
