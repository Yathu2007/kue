import type { Metadata } from "next";
import { Kalam, Roboto_Slab } from "next/font/google";
import "./globals.css";

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kue",
  description: "Office hours, without the hallway line.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${kalam.variable} ${robotoSlab.variable} bg-[#04030D] text-[#ededed] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
