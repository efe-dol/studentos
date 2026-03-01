import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StudentOS - Login",
  description: "Anmeldung bei StudentOS",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
