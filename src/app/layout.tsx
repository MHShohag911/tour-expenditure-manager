
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tour Expenditure Manager",
  description: "Manage tour groups, expenses, and shared costs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        {children}
      </body>
    </html>
  );
}
