import './globals.css';

export const metadata = {
  title: 'DigiAds Admin Console',
  description: 'Administrator dashboard for moderation and platform configuration.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Monomaniac+One&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
