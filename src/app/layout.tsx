import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext"; // Import AuthProvider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stone Configurator",
  description: "Advanced 3D/2D Stone Configuration Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hr">
      <body className={inter.className}>
        <AuthProvider> {/* Wrap application with AuthProvider */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
