/**
 * Свой OAuth-прокси для панели /admin (Decap CMS), полностью независимый
 * от Netlify. Разворачивается на Cloudflare Workers (бесплатно).
 *
 * Что делает:
 *  /auth      -> отправляет пользователя на страницу авторизации GitHub
 *  /callback  -> принимает код от GitHub, обменивает на access_token,
 *                передаёт токен обратно в окно панели /admin
 *
 * НАСТРОЙКА см. README.md в этой же папке.
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/auth") {
            return handleAuth(url, env);
        }

        if (url.pathname === "/callback") {
            return handleCallback(url, env);
        }

        return new Response("Not found. Используйте /auth или /callback.", {
            status: 404
        });
    }
};

function handleAuth(url, env) {
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
    authorizeUrl.searchParams.set("scope", "repo,user");
    authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);

    return Response.redirect(authorizeUrl.toString(), 302);
}

async function handleCallback(url, env) {
    const code = url.searchParams.get("code");

    if (!code) {
        return new Response("Отсутствует параметр code от GitHub.", {
            status: 400
        });
    }

    const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code
            })
        }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
        const message = `authorization:github:error:${JSON.stringify(tokenData)}`;
        return htmlResponse(message);
    }

    const message = `authorization:github:success:${JSON.stringify({
        token: tokenData.access_token,
        provider: "github"
    })}`;

    return htmlResponse(message);
}

function htmlResponse(message) {
    // Ровно тот протокол postMessage, который ожидает Decap CMS:
    // сначала объявляем о готовности, ждём ответа от окна панели
    // с его origin, затем шлём финальное сообщение именно на этот origin.
    const safeMessage = JSON.stringify(message);

    const html = `<!doctype html>
<html>
<body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(
      ${safeMessage},
      e.origin
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body>
</html>`;

    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
    });
}
