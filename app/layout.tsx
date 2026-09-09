import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "A.N.T.E — ملابس طبية",
    template: "%s | A.N.T.E",
  },
  description:
    "أيادي نتوفر للطب — اسكرابس وأفرولات طبية جاهزة للتخصيص بالشعار والاسم. A.N.T.E medical clothing store.",
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900 font-sans">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}