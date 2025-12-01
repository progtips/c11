export const metadata = {
  title: 'Референт - переводчик с ИИ-обработкой',
  description: 'Приложение для анализа англоязычных статей с помощью ИИ',
}

import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
