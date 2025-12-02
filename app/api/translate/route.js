export async function POST(request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return Response.json({ error: 'Текст для перевода не предоставлен' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY не найден в переменных окружения');
      console.error('Доступные переменные окружения:', Object.keys(process.env).filter(key => key.includes('OPEN') || key.includes('ROUTER')));
      return Response.json({ 
        error: 'API ключ OpenRouter не настроен. Убедитесь, что файл .env.local существует и содержит переменную OPENROUTER_API_KEY=ваш_ключ'
      }, { status: 500 });
    }

    console.log('Отправка запроса на перевод, длина текста:', text.length);
    
    const requestBody = {
      model: "deepseek/deepseek-r1-distill-qwen-32b",
      messages: [
        {
          role: 'system',
          content: 'Ты профессиональный переводчик. Переведи следующий текст с английского на русский язык, сохраняя структуру и форматирование оригинала. Переведи точно и естественно.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    };

    console.log('Тело запроса:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Article Translator'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorDetails;
      try {
        const errorData = await response.json();
        errorDetails = errorData.error || errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errorDetails = await response.text();
      }
      console.error('Ошибка OpenRouter API:', response.status, errorDetails);
      return Response.json(
        { error: `Ошибка API перевода (${response.status}): ${errorDetails}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Неожиданный формат ответа от OpenRouter:', data);
      return Response.json(
        { error: 'Неожиданный формат ответа от API перевода' },
        { status: 500 }
      );
    }

    const translatedText = data.choices[0].message.content;

    console.log('Перевод выполнен успешно, длина перевода:', translatedText.length);

    return Response.json({ translation: translatedText });

  } catch (error) {
    console.error('Ошибка перевода:', error);
    return Response.json(
      { error: `Ошибка перевода: ${error.message}\n\nСтек: ${error.stack}` },
      { status: 500 }
    );
  }
}

