import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flight Price Intelligence Lab",
  description: "Portfolio project scaffold for aviation route intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
