import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "منصة التعلّم",
    template: "%s | منصة التعلّم",
  },
  description: "منصة تعليمية لبناء المهارات والتعلّم عبر الإنترنت.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
