import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StudentOS",
  description: "Gymnasium Weilheim i.OB - Deine zentrale Plattform",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
