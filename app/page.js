'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'

// Функция для обработки ошибок и возврата дружественных сообщений
function getErrorMessage(error, response, data, isArticleLoading = false) {
  // Ошибки загрузки статьи (404, 500, таймаут и т.п.)
  if (isArticleLoading) {
    if (response?.status === 404) {
      return {
        type: 'article_load',
        message: 'Не удалось загрузить статью по этой ссылке.',
        details: 'Статья не найдена по указанному адресу. Проверьте правильность ссылки.'
      }
    }
    if (response?.status === 500 || response?.status === 502 || response?.status === 503) {
      return {
        type: 'article_load',
        message: 'Не удалось загрузить статью по этой ссылке.',
        details: 'Сервер временно недоступен. Попробуйте позже.'
      }
    }
    if (error?.message?.includes('fetch failed') || error?.message?.includes('timeout') || error?.message?.includes('ECONNREFUSED')) {
      return {
        type: 'article_load',
        message: 'Не удалось загрузить статью по этой ссылке.',
        details: 'Не удалось подключиться к серверу. Проверьте подключение к интернету.'
      }
    }
    if (data?.error?.includes('загрузки страницы') || data?.error?.includes('Ошибка загрузки')) {
      return {
        type: 'article_load',
        message: 'Не удалось загрузить статью по этой ссылке.',
        details: data.error
      }
    }
    return {
      type: 'article_load',
      message: 'Не удалось загрузить статью по этой ссылке.',
      details: 'Произошла ошибка при загрузке статьи.'
    }
  }

  // Ошибки сети
  if (error?.message?.includes('fetch failed') || error?.message?.includes('ECONNREFUSED') || error?.message?.includes('Failed to fetch')) {
    return {
      type: 'network',
      message: 'Ошибка подключения',
      details: 'Не удалось подключиться к серверу. Проверьте подключение к интернету.'
    }
  }

  // Ошибки парсинга JSON
  if (error?.name === 'SyntaxError' || error?.message?.includes('JSON')) {
    return {
      type: 'server',
      message: 'Ошибка обработки ответа',
      details: 'Сервер вернул некорректный ответ. Попробуйте еще раз.'
    }
  }

  // Ошибки от API (из data.error)
  if (data?.error) {
    const errorText = typeof data.error === 'string' ? data.error : data.error.message || 'Неизвестная ошибка'
    
    // Ошибки AI-сервиса
    if (errorText.includes('AI-сервис') || errorText.includes('OpenRouter') || errorText.includes('аутентификации')) {
      return {
        type: 'ai_service',
        message: 'Ошибка AI-сервиса',
        details: errorText
      }
    }
    
    // Ошибки лимита запросов
    if (errorText.includes('лимит') || errorText.includes('429')) {
      return {
        type: 'rate_limit',
        message: 'Превышен лимит запросов',
        details: 'Слишком много запросов. Пожалуйста, подождите немного и попробуйте снова.'
      }
    }
    
    return {
      type: 'server',
      message: 'Ошибка обработки запроса',
      details: errorText
    }
  }

  // HTTP ошибки по статусу
  if (response) {
    if (response.status === 400) {
      return {
        type: 'client',
        message: 'Неверный запрос',
        details: 'Запрос содержит ошибки. Проверьте введенные данные.'
      }
    }
    if (response.status === 401 || response.status === 403) {
      return {
        type: 'auth',
        message: 'Ошибка доступа',
        details: 'Недостаточно прав для выполнения операции.'
      }
    }
    if (response.status === 404) {
      return {
        type: 'not_found',
        message: 'Ресурс не найден',
        details: 'Запрашиваемый ресурс не найден.'
      }
    }
    if (response.status === 429) {
      return {
        type: 'rate_limit',
        message: 'Превышен лимит запросов',
        details: 'Слишком много запросов. Пожалуйста, подождите немного и попробуйте снова.'
      }
    }
    if (response.status >= 500) {
      return {
        type: 'server',
        message: 'Ошибка сервера',
        details: 'Сервер временно недоступен. Попробуйте позже.'
      }
    }
  }

  // Общая ошибка
  return {
    type: 'unknown',
    message: 'Произошла ошибка',
    details: error?.message || 'Неизвестная ошибка. Попробуйте еще раз.'
  }
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeButton, setActiveButton] = useState(null)
  const [parsedArticle, setParsedArticle] = useState(null)
  const [illustrationData, setIllustrationData] = useState(null)
  const [currentProcess, setCurrentProcess] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = async (action) => {
    // Проверяем наличие URL или распарсенной статьи
    const urlTrimmed = url ? url.trim() : ''
    
    // Если нет ни распарсенной статьи, ни URL - показываем ошибку и не начинаем загрузку
    if (!parsedArticle && (!urlTrimmed || urlTrimmed.length === 0)) {
      setError({
        type: 'client',
        message: 'Не указан URL статьи',
        details: 'Пожалуйста, введите URL статьи или сначала распарсите статью'
      })
      setResult('')
      return
    }

    setLoading(true)
    setActiveButton(action)
    setResult('')
    setError(null)

    try {
      // Определяем endpoint и поле ответа в зависимости от действия
      const endpoints = {
        summary: '/api/summary',
        thesis: '/api/thesis',
        telegram: '/api/telegram'
      }

      const responseFields = {
        summary: 'summary',
        thesis: 'thesis',
        telegram: 'post'
      }

      const processMessages = {
        summary: 'Создаю краткое содержание статьи...',
        thesis: 'Формирую тезисы статьи...',
        telegram: 'Создаю пост для Telegram...'
      }

      const endpoint = endpoints[action]
      const responseField = responseFields[action]

      if (!endpoint || !responseField) {
        setError({
          type: 'client',
          message: 'Неизвестное действие',
          details: `Действие "${action}" не поддерживается`
        })
        setResult('')
        setLoading(false)
        setCurrentProcess('')
        return
      }

      // Финальная проверка перед отправкой запроса
      if (!parsedArticle && (!urlTrimmed || urlTrimmed.length === 0)) {
        setError({
          type: 'client',
          message: 'Не указан URL статьи',
          details: 'URL статьи не может быть пустым'
        })
        setResult('')
        setLoading(false)
        setCurrentProcess('')
        return
      }

      // Устанавливаем сообщение о процессе
      if (!parsedArticle) {
        setCurrentProcess('Загружаю статью...')
      } else {
        setCurrentProcess(processMessages[action] || 'Обрабатываю запрос...')
      }

      // Формируем тело запроса: передаем либо распарсенную статью, либо URL
      // В этом месте мы уверены, что либо есть parsedArticle, либо urlTrimmed не пустой
      const requestBody = parsedArticle
        ? { article: parsedArticle }
        : { url: urlTrimmed }

      console.log(`Отправка запроса на ${action}, endpoint: ${endpoint}`)
      
      // Если статья уже распарсена, обновляем сообщение о процессе
      if (parsedArticle) {
        setCurrentProcess(processMessages[action] || 'Обрабатываю запрос...')
      }
      
      let response
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      } catch (networkError) {
        console.error('Ошибка сети:', networkError)
        const isArticleLoading = !parsedArticle
        const errorInfo = getErrorMessage(networkError, null, null, isArticleLoading)
        setError(errorInfo)
        setResult('')
        setCurrentProcess('')
        setLoading(false)
        return
      }

      console.log('Ответ получен, статус:', response.status)

      let data
      try {
        data = await response.json()
        console.log('Данные получены:', data)
      } catch (jsonError) {
        console.error('Ошибка парсинга JSON:', jsonError)
        const isArticleLoading = !parsedArticle
        const errorInfo = getErrorMessage(jsonError, response, null, isArticleLoading)
        setError(errorInfo)
        setResult('')
        setCurrentProcess('')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const isArticleLoading = !parsedArticle
        const errorInfo = getErrorMessage(null, response, data, isArticleLoading)
        setError(errorInfo)
        setResult('')
        setCurrentProcess('')
        setLoading(false)
        return
      }

      // Извлекаем результат из соответствующего поля ответа
      const result = data[responseField]
      if (result === undefined || result === null) {
        setError({
          type: 'server',
          message: 'Ошибка формата ответа',
          details: `Поле "${responseField}" не найдено в ответе сервера`
        })
        setResult('')
        setCurrentProcess('')
        setLoading(false)
        return
      }

      setResult(result)
      setError(null)
      // Сбрасываем данные иллюстрации при других действиях
      setIllustrationData(null)
      setCurrentProcess('')
    } catch (error) {
      console.error(`Ошибка при обработке запроса (${action}):`, error)
      const isArticleLoading = !parsedArticle
      const errorInfo = getErrorMessage(error, null, null, isArticleLoading)
      setError(errorInfo)
      setResult('')
      setCurrentProcess('')
    } finally {
      setLoading(false)
    }
  }

  const handleIllustration = async () => {
    // Проверяем наличие URL или распарсенной статьи
    const urlTrimmed = url ? url.trim() : ''
    
    // Если нет ни распарсенной статьи, ни URL - показываем ошибку и не начинаем загрузку
    if (!parsedArticle && (!urlTrimmed || urlTrimmed.length === 0)) {
      setError({
        type: 'client',
        message: 'Не указан URL статьи',
        details: 'Пожалуйста, введите URL статьи или сначала распарсите статью'
      })
      setResult('')
      setIllustrationData(null)
      return
    }

    setLoading(true)
    setActiveButton('illustration')
    setResult('')
    setError(null)
    setIllustrationData(null)

    try {
      // Устанавливаем сообщение о процессе
      if (!parsedArticle) {
        setCurrentProcess('Загружаю статью...')
      } else {
        setCurrentProcess('Генерирую иллюстрацию...')
      }

      // Формируем тело запроса: передаем либо распарсенную статью, либо URL
      const requestBody = parsedArticle
        ? { article: parsedArticle }
        : { url: urlTrimmed }

      console.log('Отправка запроса на генерацию иллюстрации')
      
      // Если статья уже распарсена, обновляем сообщение о процессе
      if (parsedArticle) {
        setCurrentProcess('Генерирую иллюстрацию...')
      }
      
      let response
      try {
        response = await fetch('/api/illustration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      } catch (networkError) {
        console.error('Ошибка сети:', networkError)
        const isArticleLoading = !parsedArticle
        const errorInfo = getErrorMessage(networkError, null, null, isArticleLoading)
        setError(errorInfo)
        setResult('')
        setCurrentProcess('')
        setLoading(false)
        return
      }

      console.log('Ответ получен, статус:', response.status)

      let data
      try {
        data = await response.json()
        console.log('Данные получены:', data)
      } catch (jsonError) {
        console.error('Ошибка парсинга JSON:', jsonError)
        const isArticleLoading = !parsedArticle
        const errorInfo = getErrorMessage(jsonError, response, null, isArticleLoading)
        setError(errorInfo)
        setResult('')
        setCurrentProcess('')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const isArticleLoading = !parsedArticle
        const errorInfo = getErrorMessage(null, response, data, isArticleLoading)
        setError(errorInfo)
        setResult('')
        setIllustrationData(null)
        setCurrentProcess('')
        setLoading(false)
        return
      }

      // Сохраняем данные иллюстрации
      if (data.imageUrl) {
        setIllustrationData({
          imageUrl: data.imageUrl,
          prompt: data.prompt,
          message: data.message
        })
        setResult(data.prompt ? `Промпт: ${data.prompt}` : 'Иллюстрация сгенерирована')
      } else {
        setIllustrationData({
          imageUrl: null,
          prompt: data.prompt,
          message: data.message
        })
        setResult(data.prompt ? `Промпт: ${data.prompt}\n\n${data.message || 'Изображение не сгенерировано'}` : (data.message || 'Изображение не сгенерировано'))
      }
      setError(null)
      setCurrentProcess('')
    } catch (error) {
      console.error('Ошибка при генерации иллюстрации:', error)
      const isArticleLoading = !parsedArticle
      const errorInfo = getErrorMessage(error, null, null, isArticleLoading)
      setError(errorInfo)
      setResult('')
      setIllustrationData(null)
      setCurrentProcess('')
    } finally {
      setLoading(false)
    }
  }

  const handleTranslate = async () => {
    if (!parsedArticle) {
      setError({
        type: 'client',
        message: 'Статья не распарсена',
        details: 'Сначала распарсите статью перед переводом'
      })
      setResult('')
      return
    }

    setLoading(true)
    setActiveButton('translate')
    setResult('')
    setError(null)
    setCurrentProcess('Перевожу статью...')

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
        console.error('Ошибка парсинга JSON:', jsonError)
        const errorInfo = getErrorMessage(jsonError, response, null, false)
        setError(errorInfo)
        setResult('')
        setCurrentProcess('')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorInfo = getErrorMessage(null, response, data, false)
        setError(errorInfo)
        setResult('')
        setCurrentProcess('')
        setLoading(false)
        return
      }

      // Выводим перевод в поле результата
      if (!data.translation) {
        setError({
          type: 'server',
          message: 'Перевод не получен',
          details: 'Сервер не вернул результат перевода'
        })
        setResult('')
      } else {
        setResult(data.translation)
        setError(null)
      }
      setCurrentProcess('')
    } catch (error) {
      console.error('Ошибка при переводе:', error)
      const errorInfo = getErrorMessage(error, null, null, false)
      setError(errorInfo)
      setResult('')
      setCurrentProcess('')
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
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              placeholder="Введите URL статьи, например: https://example.com/article"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              disabled={loading}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Укажите ссылку на англоязычную статью
          </p>
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
              title="Перевести распарсенную статью на русский язык"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleSubmit('summary')}
              disabled={loading}
              title="Получить краткое содержание статьи"
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
              title="Создать тезисы статьи"
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
              title="Создать пост для Telegram на основе статьи"
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

            <button
              onClick={handleIllustration}
              disabled={loading}
              title="Сгенерировать иллюстрацию для статьи"
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeButton === 'illustration' && loading
                  ? 'bg-pink-600 text-white'
                  : activeButton === 'illustration'
                  ? 'bg-pink-500 text-white shadow-lg'
                  : 'bg-pink-500 hover:bg-pink-600 text-white hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'illustration' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Генерация...
                </span>
              ) : (
                'Иллюстрация'
              )}
            </button>
          </div>
        </div>

        {/* Блок текущего процесса */}
        {currentProcess && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {currentProcess}
              </span>
            </div>
          </div>
        )}

        {/* Блок ошибок */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>{error.message}</AlertTitle>
            <AlertDescription>{error.details}</AlertDescription>
          </Alert>
        )}

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
            ) : illustrationData?.imageUrl ? (
              <div className="space-y-4">
                {illustrationData.prompt && (
                  <div className="text-gray-700 dark:text-gray-300 text-sm">
                    <strong>Промпт:</strong> {illustrationData.prompt}
                  </div>
                )}
                <div className="flex justify-center">
                  <img 
                    src={illustrationData.imageUrl} 
                    alt="Сгенерированная иллюстрация" 
                    className="max-w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
                {illustrationData.message && (
                  <div className="text-gray-600 dark:text-gray-400 text-sm italic">
                    {illustrationData.message}
                  </div>
                )}
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
