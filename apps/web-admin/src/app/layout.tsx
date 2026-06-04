import './global.css';

export const metadata = {
  title: 'Knocksafe Admin',
  description: 'Admin console POC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
