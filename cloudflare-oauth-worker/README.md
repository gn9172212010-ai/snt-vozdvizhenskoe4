# Свой OAuth-прокси для панели /admin (без Netlify)

Зачем это нужно: GitHub требует, чтобы обмен кода авторизации на токен
происходил на сервере (там, где можно хранить секретный ключ). Статический
сайт (GitHub Pages) сам этого сделать не может — нужен небольшой
промежуточный сервер. Это он и есть, но наш собственный, а не от Netlify.

Всё делается через сайт Cloudflare в браузере — ничего не нужно
устанавливать на компьютер.

## Шаг 1 — создать OAuth-приложение в GitHub

1. github.com → аватарка (справа сверху) → **Settings**
2. Слева внизу → **Developer settings**
3. **OAuth Apps** → **New OAuth App**
4. Заполнить:
   - Application name: например, `SNT Vozdvizhenskoe CMS`
   - Homepage URL: `https://gn9172212010-ai.github.io/snt-vozdvizhenskoe4/`
   - Authorization callback URL: **пока оставить пустым, впишем после шага 2**
5. **Register application**
6. Скопировать **Client ID**
7. Нажать **Generate a new client secret** → скопировать секрет
   (он показывается один раз, потеряешь — придётся генерировать заново)

## Шаг 2 — развернуть воркер на Cloudflare

1. Зарегистрироваться на **dash.cloudflare.com** (бесплатно, карта не нужна)
2. В меню слева → **Workers & Pages** → **Create** → **Create Worker**
3. Придумать имя (например `snt-cms-oauth`) → **Deploy**
   (сначала развернётся заглушка — это нормально, код заменим следующим шагом)
4. На странице воркера → **Edit code** (или «Quick edit»)
5. Стереть весь код-заглушку, вставить содержимое файла `worker.js`
   из этой папки (`cloudflare-oauth-worker/worker.js`)
6. **Deploy** (или «Save and deploy»)
7. Скопировать адрес воркера — он будет вида
   `https://snt-cms-oauth.ТВОЙ-НИК.workers.dev`

## Шаг 3 — добавить секреты в воркер

1. На странице воркера → **Settings** → **Variables and Secrets**
2. Добавить две переменные (тип **Secret**, не «Text»):
   - `GITHUB_CLIENT_ID` — вставить Client ID из шага 1
   - `GITHUB_CLIENT_SECRET` — вставить Client Secret из шага 1
3. Сохранить (может попросить заново задеплоить воркер — подтвердить)

## Шаг 4 — вписать callback-адрес обратно в GitHub

1. Вернуться в GitHub → то самое OAuth-приложение → **Edit**
2. Authorization callback URL: `https://snt-cms-oauth.ТВОЙ-НИК.workers.dev/callback`
   (адрес из шага 2, плюс `/callback` на конце)
3. Сохранить

## Шаг 5 — поправить admin/config.yml

В `public/admin/config.yml` в самом начале, в блоке `backend`, нужно
добавить строку `base_url` со своим адресом воркера (без `/callback` на конце):

```yaml
backend:
  name: github
  repo: gn9172212010-ai/snt-vozdvizhenskoe4
  branch: main
  base_url: https://snt-cms-oauth.ТВОЙ-НИК.workers.dev
```

## Готово

После пуша заходишь на `/admin`, жмёшь «Login with GitHub» — теперь запрос
уйдёт не в Netlify, а в твой собственный воркер, который отдаст токен
напрямую. От Netlify зависимости больше нет.

## Если что-то не работает

- Убедись, что callback URL в GitHub OAuth App **точно** совпадает с
  `https://ТВОЙ-АДРЕС.workers.dev/callback` (с `/callback`, без лишнего
  слэша на конце).
- Убедись, что в `config.yml` `base_url` — **без** `/callback` на конце.
- Открой воркер напрямую в браузере: `https://ТВОЙ-АДРЕС.workers.dev/auth`
  — должно перекинуть на страницу входа GitHub. Если 404 — воркер не
  задеплоился или неверно скопирован код.
