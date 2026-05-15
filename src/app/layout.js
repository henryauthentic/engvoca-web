import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata = {
  title: "ENG VOCA – Học Từ Vựng Thông Minh Với AI & Spaced Repetition",
  description:
    "Ứng dụng học từ vựng tiếng Anh thông minh sử dụng thuật toán SM2 (Spaced Repetition) kết hợp trí tuệ nhân tạo. Học từ vựng hiệu quả, ghi nhớ lâu dài.",
  keywords: [
    "học từ vựng",
    "tiếng Anh",
    "spaced repetition",
    "SM2",
    "AI",
    "flashcard",
    "vocabulary",
  ],
  openGraph: {
    title: "ENG VOCA – Học Từ Vựng Thông Minh",
    description: "Phương pháp học từ vựng tiếng Anh hiệu quả với AI & SM2",
    type: "website",
    locale: "vi_VN",
  },
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
