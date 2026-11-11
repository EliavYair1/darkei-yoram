import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "דרכי יורם – מוסדות ישימך כאפרים",
  description: "תורה, חסד וקהילה בראש העין.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
