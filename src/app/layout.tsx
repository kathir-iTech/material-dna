import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Material DNA — Engineering-Aware Material Identity",
  description:
    "Prototype platform for AI-assisted material standardization, engineering-aware matching and cross-system identity governance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/inter-latin-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-dna-bg font-sans text-dna-text antialiased">
        {children}
      </body>
    </html>
  );
}
