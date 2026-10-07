import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "greek"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "metaSchool | Αυτοματοποιημένο Σχολικό Ωρολόγιο Πρόγραμμα",
  description: "Σύστημα βελτιστοποίησης σχολικού προγράμματος με Google OR-Tools CP-SAT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el" className={`${manrope.variable} antialiased`} suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground font-sans selection:bg-zinc-200 selection:text-zinc-900 dark:selection:bg-zinc-700 dark:selection:text-zinc-100"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" duration={1500} closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
