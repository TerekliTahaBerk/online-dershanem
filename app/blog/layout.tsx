const blogFontStyle = {
  "--font-display":
    'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, Times New Roman, serif',
} as React.CSSProperties;

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <div style={blogFontStyle}>{children}</div>;
}
