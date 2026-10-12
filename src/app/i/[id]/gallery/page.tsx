import type { Metadata } from "next";
import { ManageGallery } from "@/components/dote/ManageGallery";

export const metadata: Metadata = { title: "Gallery" };

export default async function InviteGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ManageGallery id={id} guest />;
}
