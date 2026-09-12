import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { PwaInstall } from "@/components/pwa-install";

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
    "أيادي نتوفر للطب — اسكرابس وبالطو طبي جاهزة للتخصيص بالشعار والاسم. A.N.T.E medical clothing store.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "A.N.T.E",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F2F1F7] text-gray-900 font-sans">
        <Toaster>{children}</Toaster>
        <PwaInstall />
      </body>
    </html>
  );
}