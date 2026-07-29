// Сайт развёрнут в подпапке (GitHub Pages project-site), поэтому обычные
// абсолютные пути вида href="/news" не работают — они ведут на корень домена,
// а не на /snt-vozdvizhenskoe4/news. Эта функция добавляет нужный префикс.
//
// withBase('/news')        -> '/snt-vozdvizhenskoe4/news'
// withBase('/docs/a.pdf')  -> '/snt-vozdvizhenskoe4/docs/a.pdf'
// withBase('/')            -> '/snt-vozdvizhenskoe4/'

export function withBase(pathname) {
    const base = import.meta.env.BASE_URL || "/";
    const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return `${normalizedBase}${normalizedPath}`;
}
