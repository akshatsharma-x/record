import type { Metadata } from "next";
import { content } from "@/content";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: content.profile.name,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
