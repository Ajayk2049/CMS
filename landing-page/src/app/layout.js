import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Script from 'next/script';

export const metadata = {
  title: 'DigiAds & Dine - Premium Tabletop Ordering & Ad Network',
  description: 'Boost restaurant order efficiency and advertising reach with our integrated tabletop ordering tablets and landscape ad display screens.',
  keywords: 'tabletop ordering, restaurant kiosk, digital advertising screens, location-based ad booking, merchant order portal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === 'development' && (
          <>
            <Script src="https://cdn.jsdelivr.net/npm/eruda" strategy="afterInteractive" />
            <Script id="eruda-init" strategy="afterInteractive">
              {`
                if (typeof window !== 'undefined') {
                  if (window.eruda) {
                    window.eruda.init();
                  } else {
                    window.addEventListener('load', () => {
                      if (window.eruda) window.eruda.init();
                    });
                  }
                }
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
