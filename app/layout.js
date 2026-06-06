import { Outfit, Playfair_Display, DM_Mono } from "next/font/google";
import "./globals.css";
import '@tabler/icons-react'; // Pre-load or we just use icons per file. We don't strictly need to import it here.

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata = {
  title: "PCA FieldOps | Dashboard",
  description: "Advanced gamified field force management portal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${playfair.variable} ${dmMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
