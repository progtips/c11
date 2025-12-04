import * as cheerio from 'cheerio';

// Валидация URL
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Валидация данных статьи
function validateArticle(article) {
  if (!article) {
    return { valid: false, error: 'Данные статьи не предоставлены' };
  }
  
  if (!article.content || typeof article.content !== 'string' || article.content.trim().length < 50) {
    return { valid: false, error: 'Контент статьи отсутствует или слишком короткий (минимум 50 символов)' };
  }
  
  return { valid: true };
}

// Обработка ошибок OpenRouter API
function handleOpenRouterError(status, errorData) {
  let userMessage = 'Произошла ошибка при обращении к AI-сервису';
  
  if (status === 401) {
    userMessage = 'Ошибка аутентификации: неверный API ключ OpenRouter. Проверьте настройки в .env.local';
  } else if (status === 429) {
    userMessage = 'Превышен лимит запросов к AI-сервису. Пожалуйста, подождите немного и попробуйте снова';
  } else if (status === 500 || status === 502 || status === 503) {
    userMessage = 'AI-сервис временно недоступен. Пожалуйста, попробуйте позже';
  } else if (errorData?.error?.message) {
    userMessage = `Ошибка AI-сервиса: ${errorData.error.message}`;
  } else if (typeof errorData === 'string') {
    userMessage = `Ошибка AI-сервиса: ${errorData}`;
  }
  
  return userMessage;
}

// Вспомогательная функция для парсинга статьи по URL
async function parseArticle(url) {
  console.log('Парсинг URL:', url);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки страницы: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  if (!html || html.length === 0) {
    throw new Error('Получена пустая страница');
  }

  const $ = cheerio.load(html);

  // Поиск заголовка
  let title = '';
  const titleSelectors = [
    'h1.entry-title',
    'h1.post-title',
    'h1.article-title',
    'article h1',
    '.post h1',
    '.content h1',
    '.article h1',
    'h1',
    'title'
  ];

  for (const selector of titleSelectors) {
    const found = $(selector).first().text().trim();
    if (found && found.length > 0) {
      title = found;
      break;
    }
  }

  // Поиск контента
  let content = '';
  const contentSelectors = [
    'article',
    '.post',
    '.content',
    '.article-content',
    '.entry-content',
    '.post-content',
    '[itemprop="articleBody"]',
    'main article',
    '.article-body'
  ];

  for (const selector of contentSelectors) {
    const found = $(selector).first();
    if (found.length > 0) {
      found.find('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
      content = found.text().trim();
      if (content && content.length > 100) {
        break;
      }
    }
  }

  if (!content || content.length < 100) {
    const body = $('body');
    body.find('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
    content = body.text().trim();
  }

  content = content.replace(/\s+/g, ' ').trim();

  return {
    title: title || 'Заголовок не найден',
    content: content || 'Контент не найден'
  };
}

export async function POST(request) {
  try {
    // Валидация тела запроса
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Ошибка парсинга JSON запроса:', jsonError);
      return Response.json(
        { error: 'Неверный формат запроса. Ожидается JSON.' },
        { status: 400 }
      );
    }

    const { article, url } = body;

    // Проверка наличия хотя бы одного параметра (явно проверяем на пустую строку)
    const hasArticle = article && typeof article === 'object';
    const hasUrl = url && typeof url === 'string' && url.trim().length > 0;
    
    if (!hasArticle && !hasUrl) {
      return Response.json(
        { error: 'Необходимо предоставить либо объект article, либо непустой url статьи' },
        { status: 400 }
      );
    }

    // Валидация URL, если передан
    if (url !== undefined && url !== null) {
      if (typeof url !== 'string') {
        return Response.json(
          { error: 'URL должен быть строкой' },
          { status: 400 }
        );
      }
      
      const urlTrimmed = url.trim();
      if (!urlTrimmed) {
        return Response.json(
          { error: 'URL не может быть пустым' },
          { status: 400 }
        );
      }
      
      if (!isValidUrl(urlTrimmed)) {
        return Response.json(
          { error: 'Неверный формат URL. URL должен начинаться с http:// или https://' },
          { status: 400 }
        );
      }
    }

    let articleData = article;

    // Если передан URL, выполняем парсинг
    if (hasUrl && !hasArticle) {
      try {
        articleData = await parseArticle(url.trim());
      } catch (parseError) {
        console.error('Ошибка парсинга:', parseError);
        
        // Улучшенная обработка ошибок парсинга
        if (parseError.message.includes('fetch failed') || parseError.message.includes('ECONNREFUSED')) {
          return Response.json(
            { error: 'Не удалось подключиться к серверу статьи. Проверьте URL и доступность сайта.' },
            { status: 500 }
          );
        }
        
        return Response.json(
          { error: `Ошибка парсинга статьи: ${parseError.message}` },
          { status: 500 }
        );
      }
    }

    // Валидация данных статьи
    const validation = validateArticle(articleData);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY не найден в переменных окружения');
      return Response.json(
        { error: 'API ключ OpenRouter не настроен. Убедитесь, что файл .env.local существует и содержит переменную OPENROUTER_API_KEY=ваш_ключ' },
        { status: 500 }
      );
    }

    // Формируем текст статьи для анализа
    const articleText = `${articleData.title}\n\n${articleData.content}`;

    console.log('Отправка запроса на генерацию промпта для иллюстрации, длина текста:', articleText.length);

    // Сначала генерируем промпт для изображения на основе статьи
    const promptRequestBody = {
      model: "deepseek/deepseek-r1-distill-qwen-32b",
      messages: [
        {
          role: 'system',
          content: 'Ты эксперт по созданию промптов для генерации изображений. На основе следующей статьи создай краткий промпт (на английском языке, максимум 100 слов) для генерации абстрактной иллюстрации, которая отражает основную тему и настроение статьи. Промпт должен быть детальным и описательным, включать стиль (например, abstract, modern, minimalist), цвета и настроение. Верни ТОЛЬКО промпт, без дополнительных объяснений.'
        },
        {
          role: 'user',
          content: articleText
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    };

    let promptResponse;
    try {
      promptResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Illustration Prompt Generator'
        },
        body: JSON.stringify(promptRequestBody)
      });
    } catch (networkError) {
      console.error('Ошибка сети при обращении к OpenRouter API:', networkError);
      return Response.json(
        { error: 'Ошибка сети: не удалось подключиться к AI-сервису. Проверьте подключение к интернету.' },
        { status: 500 }
      );
    }

    if (!promptResponse.ok) {
      let errorData;
      try {
        errorData = await promptResponse.json();
      } catch (e) {
        errorData = await promptResponse.text();
      }
      
      console.error('Ошибка OpenRouter API:', promptResponse.status, errorData);
      const userMessage = handleOpenRouterError(promptResponse.status, errorData);
      
      return Response.json(
        { error: userMessage },
        { status: promptResponse.status >= 500 ? 500 : promptResponse.status }
      );
    }

    const promptData = await promptResponse.json();

    if (!promptData.choices || !promptData.choices[0] || !promptData.choices[0].message) {
      console.error('Неожиданный формат ответа от OpenRouter:', promptData);
      return Response.json(
        { error: 'Неожиданный формат ответа от API генерации промпта' },
        { status: 500 }
      );
    }

    const imagePrompt = promptData.choices[0].message.content.trim();
    console.log('Промпт для изображения сгенерирован:', imagePrompt);

    // Теперь генерируем изображение используя Hugging Face API (бесплатный вариант)
    // Используем модель Stable Diffusion через Hugging Face Inference API
    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!hfApiKey) {
      // Если нет ключа Hugging Face, возвращаем промпт и URL для генерации
      return Response.json({
        prompt: imagePrompt,
        imageUrl: null,
        message: 'Для генерации изображения необходим API ключ Hugging Face. Добавьте HUGGINGFACE_API_KEY в .env.local'
      });
    }

    try {
      // Используем новый формат Hugging Face Router API
      const modelName = 'stabilityai/stable-diffusion-xl-base-1.0';
      const endpoint = `https://router.huggingface.co/hf-inference/models/${modelName}`;
      
      console.log('Отправка запроса на генерацию изображения, endpoint:', endpoint);
      
      const imageResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: imagePrompt
        }),
      });
      
      console.log('Ответ от Hugging Face API получен, статус:', imageResponse.status);

      if (!imageResponse.ok) {
        let errorText;
        try {
          errorText = await imageResponse.text();
        } catch (e) {
          errorText = 'Не удалось прочитать текст ошибки';
        }
        
        console.error('Ошибка Hugging Face API:', imageResponse.status, errorText);
        
        // Если модель загружается, возвращаем промпт
        if (imageResponse.status === 503) {
          return Response.json({
            prompt: imagePrompt,
            imageUrl: null,
            message: 'Модель генерации изображений загружается. Попробуйте через несколько секунд.'
          });
        }
        
        // Если 404 или 410, возвращаем промпт с информацией
        if (imageResponse.status === 404 || imageResponse.status === 410) {
          return Response.json({
            prompt: imagePrompt,
            imageUrl: null,
            message: `API генерации изображений недоступен (${imageResponse.status}). Используйте промпт выше для генерации изображения в другом сервисе (например, DALL-E, Midjourney, Stable Diffusion).`
          });
        }
        
        // Для других ошибок возвращаем промпт с подробной информацией
        return Response.json({
          prompt: imagePrompt,
          imageUrl: null,
          message: `Ошибка генерации изображения (${imageResponse.status}): ${errorText}. Используйте промпт выше для генерации изображения в другом сервисе.`
        });
      }

      // Получаем изображение как blob
      const imageBlob = await imageResponse.blob();
      
      // Конвертируем blob в base64 для передачи на фронтенд
      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const imageUrl = `data:image/png;base64,${base64}`;

      console.log('Изображение сгенерировано успешно');

      return Response.json({
        prompt: imagePrompt,
        imageUrl: imageUrl,
        message: null
      });

    } catch (imageError) {
      console.error('Ошибка генерации изображения:', imageError);
      return Response.json({
        prompt: imagePrompt,
        imageUrl: null,
        message: `Ошибка генерации изображения: ${imageError.message}`
      });
    }

  } catch (error) {
    console.error('Неожиданная ошибка генерации иллюстрации:', error);
    console.error('Стек ошибки:', error.stack);
    
    // Не показываем технические детали пользователю
    return Response.json(
      { error: 'Произошла неожиданная ошибка при генерации иллюстрации. Пожалуйста, попробуйте еще раз или обратитесь к администратору.' },
      { status: 500 }
    );
  }
}

