'use client'

import { useState } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeButton, setActiveButton] = useState(null)
  const [parsedArticle, setParsedArticle] = useState(null)

  const handleParse = async () => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveButton('parse')
    setResult('')

    try {
      console.log('Отправка запроса на парсинг:', url)
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      console.log('Ответ получен, статус:', response.status)

      let data
      try {
        data = await response.json()
        console.log('Данные получены:', data)
      } catch (jsonError) {
        const text = await response.text()
        console.error('Ошибка парсинга JSON:', jsonError, 'Текст ответа:', text)
        setResult(`Ошибка: Не удалось распарсить ответ сервера. Статус: ${response.status}\nТекст: ${text}`)
        return
      }

      if (!response.ok) {
        setResult(`Ошибка (${response.status}): ${data.error || 'Неизвестная ошибка'}`)
        setParsedArticle(null)
        return
      }

      // Сохраняем распарсенную статью для последующего перевода
      setParsedArticle(data)
      
      // Форматируем JSON для красивого отображения
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Ошибка при парсинге:', error)
      setResult(`Ошибка при парсинге: ${error.message}\n\nПроверьте консоль браузера для подробностей.`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (action) => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveButton(action)
    setResult('')

    try {
      // Здесь будет логика вызова API
      // Пока что просто имитация загрузки
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Временный результат для демонстрации
      const results = {
        summary: 'Статья рассказывает о современных технологиях искусственного интеллекта и их применении в различных сферах жизни.',
        thesis: '• ИИ становится все более важным инструментом\n• Технологии развиваются быстрыми темпами\n• Применение ИИ расширяется в разных областях',
        telegram: '🤖 Новости ИИ\n\nСовременные технологии искусственного интеллекта открывают новые возможности...'
      }
      
      setResult(results[action] || 'Результат будет здесь')
    } catch (error) {
      setResult('Произошла ошибка при обработке запроса')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleTranslate = async () => {
    if (!parsedArticle) {
      alert('Сначала распарсите статью')
      return
    }

    setLoading(true)
    setActiveButton('translate')
    setResult('')

    try {
      // Формируем текст статьи для перевода
      const articleText = `${parsedArticle.title}\n\n${parsedArticle.content}`

      console.log('Отправка запроса на перевод')
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: articleText }),
      })

      console.log('Ответ получен, статус:', response.status)

      let data
      try {
        data = await response.json()
        console.log('Данные получены:', data)
      } catch (jsonError) {
        const text = await response.text()
        console.error('Ошибка парсинга JSON:', jsonError, 'Текст ответа:', text)
        setResult(`Ошибка: Не удалось распарсить ответ сервера. Статус: ${response.status}\nТекст: ${text}`)
        return
      }

      if (!response.ok) {
        setResult(`Ошибка (${response.status}): ${data.error || 'Неизвестная ошибка'}`)
        return
      }

      // Выводим перевод в поле результата
      setResult(data.translation || 'Перевод не получен')
    } catch (error) {
      console.error('Ошибка при переводе:', error)
      setResult(`Ошибка при переводе: ${error.message}\n\nПроверьте консоль браузера для подробностей.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Референт - переводчик с ИИ-обработкой
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Введите URL англоязычной статьи для анализа
          </p>
        </div>

        {/* Форма ввода URL */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL статьи
          </label>
          <div className="flex gap-3">
            <input
              id="article-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              disabled={loading}
            />
          </div>
        </div>

        {/* Кнопка парсинга */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Парсинг статьи:
          </h2>
          <button
            onClick={handleParse}
            disabled={loading}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeButton === 'parse' && loading
                ? 'bg-orange-600 text-white'
                : activeButton === 'parse'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-orange-500 hover:bg-orange-600 text-white hover:shadow-md'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading && activeButton === 'parse' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Парсинг...
              </span>
            ) : (
              'Парсить статью'
            )}
          </button>
        </div>

        {/* Кнопка перевода */}
        {parsedArticle && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Перевод статьи:
            </h2>
            <button
              onClick={handleTranslate}
              disabled={loading}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeButton === 'translate' && loading
                  ? 'bg-red-600 text-white'
                  : activeButton === 'translate'
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-red-500 hover:bg-red-600 text-white hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'translate' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Перевод...
                </span>
              ) : (
                'Перевести статью'
              )}
            </button>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Выберите действие:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleSubmit('summary')}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeButton === 'summary' && loading
                  ? 'bg-blue-600 text-white'
                  : activeButton === 'summary'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'summary' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              ) : (
                'О чем статья'
              )}
            </button>

            <button
              onClick={() => handleSubmit('thesis')}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeButton === 'thesis' && loading
                  ? 'bg-green-600 text-white'
                  : activeButton === 'thesis'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-green-500 hover:bg-green-600 text-white hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'thesis' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              ) : (
                'Тезисы'
              )}
            </button>

            <button
              onClick={() => handleSubmit('telegram')}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeButton === 'telegram' && loading
                  ? 'bg-purple-600 text-white'
                  : activeButton === 'telegram'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-purple-500 hover:bg-purple-600 text-white hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'telegram' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              ) : (
                'Пост для Telegram'
              )}
            </button>
          </div>
        </div>

        {/* Блок результата */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Результат:
          </h2>
          <div className="min-h-[200px] p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            {loading ? (
              <div className="text-gray-400 dark:text-gray-500 text-center py-8">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Обработка запроса...</span>
                </div>
              </div>
            ) : result ? (
              <pre className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono text-sm overflow-x-auto">
                {result}
              </pre>
            ) : (
              <div className="text-gray-400 dark:text-gray-500 text-center py-8">
                Результат появится здесь после выбора действия
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
