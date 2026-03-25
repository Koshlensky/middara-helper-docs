# Middara Helper Docs

Репозиторий с документацией для приложения [Middara Helper](https://github.com/Koshlensky/middara-helper) — Android-приложения для управления картами настольной игры [Middara: Unintentional Malum](https://www.kickstarter.com/projects/1806456121/middara-unintentional-malum-act-1).

Сайт доступен по адресу: **https://middara-helper.netlify.app/**

---

## Что это за репозиторий

Статический сайт-документация, собираемый из `.adoc`-файлов (AsciiDoc) с помощью собственного Node.js-генератора. Результат публикуется на [Netlify](https://middara-helper.netlify.app/).

## Структура

```
docs/
├── index.adoc              # Главная страница (О приложении)
├── players/
│   ├── getting-started.adoc  # Установка и первые шаги
│   └── features.adoc         # Возможности приложения
├── cards/
│   └── overview.adoc         # База карт — типы и описание
└── advanced/
    ├── architecture.adoc     # Архитектура (MVVM, Clean Architecture)
    ├── content-guide.adoc    # Как добавлять карты (cards.json + drawable)
    └── technology-stack.adoc # Стек технологий и обоснование выбора
```

## Как запустить локально

```bash
npm install
node build.js
```

Результат появится в папке `dist/`. Для просмотра откройте `dist/index.html` в браузере или запустите локальный HTTP-сервер:

```bash
npx serve dist
```

## Деплой

Сайт автоматически публикуется на Netlify при каждом push в ветку `main`.  
Конфигурация деплоя: [`netlify.toml`](./netlify.toml)

## Ссылки

| | |
|---|---|
| Сайт документации | https://middara-helper.netlify.app/ |
| Исходный код приложения | https://github.com/Koshlensky/middara-helper |
| Скачать приложение | https://github.com/Koshlensky/middara-helper/releases/latest |
| Сообщить об ошибке | https://github.com/Koshlensky/middara-helper/issues |
| Предложить улучшение | https://github.com/Koshlensky/middara-helper/pulls |
