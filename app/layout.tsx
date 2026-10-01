import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Pastoral: Countryside Farm Exploration',
  description: 'A photorealistic, peaceful first-person countryside farm exploration simulation featuring realistic atmospheric lighting, wind-reactive vegetation, free-roaming farm animals, and immersive spatial nature audio.',
  openGraph: {
    title: 'Pastoral: Countryside Farm Exploration',
    description: 'A photorealistic, peaceful first-person countryside farm exploration simulation featuring realistic atmospheric lighting, wind-reactive vegetation, free-roaming farm animals, and immersive spatial nature audio.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pastoral: Countryside Farm Exploration',
    description: 'A photorealistic, peaceful first-person countryside farm exploration simulation featuring realistic atmospheric lighting, wind-reactive vegetation, free-roaming farm animals, and immersive spatial nature audio.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
