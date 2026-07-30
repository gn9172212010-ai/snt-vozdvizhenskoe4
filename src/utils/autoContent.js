// Утилита для автопубликации: файл положили в папку — он появился на сайте.
// Никаких сопроводительных markdown-файлов не требуется.
//
// Название и дата угадываются из имени файла:
//   protocol-2026-06-13.pdf       -> "Protocol", дата 13.06.2026
//   Договор о вывозе ТБО.pdf      -> "Договор о вывозе ТБО", даты нет
//   2026-06-13-sobranie.md        -> дата 13.06.2026 из префикса имени

import fs from "node:fs";
import path from "node:path";

const DATE_RE_ISO = /(\d{4})-(\d{2})-(\d{2})/; // 2026-06-13
const DATE_RE_RU = /(\d{2})-(\d{2})-(\d{4})/; // 13-06-2026

/** "protocol-13-06-2026.pdf" -> "Protocol" (без даты и расширения, дефисы -> пробелы) */
export function humanizeFilename(filename) {
    const base = filename.replace(/\.[^.]+$/, "");
    const withoutDate = base
        .replace(DATE_RE_ISO, "")
        .replace(DATE_RE_RU, "")
        .replace(/^[-_\s]+|[-_\s]+$/g, "");
    const spaced = (withoutDate || base).replace(/[-_]+/g, " ").trim();
    if (!spaced) return base;
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Достаёт дату из имени файла. Понимает и 2026-06-13, и 13-06-2026.
 * Если ничего не найдено — null.
 */
export function extractDateFromFilename(filename) {
    let m = filename.match(DATE_RE_ISO);
    if (m) {
        const [, y, mo, d] = m;
        const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
        if (!Number.isNaN(date.getTime())) return date;
    }
    m = filename.match(DATE_RE_RU);
    if (m) {
        const [, d, mo, y] = m;
        const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
        if (!Number.isNaN(date.getTime())) return date;
    }
    return null;
}

/** Простой парсер необязательного YAML-фронтматтера (без внешних зависимостей). */
export function parseFrontmatter(raw) {
    const text = raw.replace(/^\uFEFF/, "");
    if (text.startsWith("---")) {
        const end = text.indexOf("\n---", 3);
        if (end !== -1) {
            const block = text.slice(3, end).trim();
            const body = text.slice(end + 4).replace(/^\r?\n/, "");
            const data = {};
            for (const line of block.split(/\r?\n/)) {
                const m = line.match(/^([A-Za-zА-Яа-яЁё0-9_]+):\s*(.*)$/);
                if (m) {
                    data[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
                }
            }
            return { data, body: body.trim() };
        }
    }
    return { data: {}, body: text.trim() };
}

const TRANSLIT_MAP = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
};

/** Кириллица/что угодно -> чистый URL-слаг латиницей: "Отключение воды.md" -> "otklyuchenie-vody" */
export function slugify(input) {
    const base = input.replace(/\.[^.]+$/, "").toLowerCase();
    const translit = base
        .split("")
        .map((ch) => (ch in TRANSLIT_MAP ? TRANSLIT_MAP[ch] : ch))
        .join("");
    return (
        translit
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .replace(/-{2,}/g, "-") || "post"
    );
}

/**
 * Простой рендер обычного текста в HTML-абзацы (без markdown-библиотек):
 * экранирует спецсимволы, пустая строка = новый абзац, одиночный перенос = <br>.
 * Понимает только один markdown-элемент — картинку: ![подпись](/uploads/news/photo.jpg)
 *
 * resolveSrc(src) — необязательная функция для преобразования пути к картинке
 * (например withBase из url.js, чтобы учесть base-путь GitHub Pages).
 */
export function renderPlainTextToHtml(body, resolveSrc = (src) => src) {
    const escape = (s) =>
        s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

    const renderImages = (escaped) =>
        escaped.replace(IMAGE_RE, (_match, alt, src) => {
            const resolvedSrc = src.startsWith("/") ? resolveSrc(src) : src;
            return `<img src="${resolvedSrc}" alt="${alt}" loading="lazy">`;
        });

    return body
        .split(/\r?\n\s*\r?\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => {
            const escaped = escape(paragraph);
            const withImages = renderImages(escaped);
            const withBreaks = withImages.replace(/\r?\n/g, "<br>");
            return `<p>${withBreaks}</p>`;
        })
        .join("\n");
}

/**
 * Список документов из public/docs/<category>/*.pdf (и .doc/.docx).
 * Ничего кроме самого файла не требуется.
 */
export function listDocuments(publicDocsRoot, category) {
    const dir = path.join(publicDocsRoot, category);
    if (!fs.existsSync(dir)) return [];

    return fs
        .readdirSync(dir)
        .filter((f) => /\.(pdf|doc|docx)$/i.test(f))
        .map((filename) => ({
            title: humanizeFilename(filename),
            date: extractDateFromFilename(filename),
            file: `/docs/${category}/${filename}`,
            filename,
        }))
        .sort((a, b) => {
            if (a.date && b.date) return b.date.valueOf() - a.date.valueOf();
            if (a.date) return -1;
            if (b.date) return 1;
            return a.filename.localeCompare(b.filename, "ru");
        });
}

/**
 * Список новостей из папки с .md/.txt файлами.
 * Фронтматтер необязателен — если его нет, заголовок и дата берутся из имени файла,
 * а превью — из первого абзаца текста.
 */
export function listNews(newsDir) {
    if (!fs.existsSync(newsDir)) return [];

    const usedSlugs = new Map();

    return fs
        .readdirSync(newsDir)
        .filter((f) => /\.(md|txt)$/i.test(f))
        .map((filename) => {
            const raw = fs.readFileSync(path.join(newsDir, filename), "utf-8");
            const { data, body } = parseFrontmatter(raw);

            const title = data.title || humanizeFilename(filename);
            const date =
                (data.date && new Date(data.date)) ||
                extractDateFromFilename(filename) ||
                new Date();
            const firstParagraph = body.split(/\r?\n\s*\r?\n/)[0] || "";
            const description =
                data.description ||
                firstParagraph.replace(/\r?\n/g, " ").trim().slice(0, 300);

            let slug = slugify(data.title || filename);
            const seenCount = usedSlugs.get(slug) || 0;
            usedSlugs.set(slug, seenCount + 1);
            if (seenCount > 0) slug = `${slug}-${seenCount + 1}`;

            return { title, date, description, body, filename, slug };
        })
        .sort((a, b) => b.date.valueOf() - a.date.valueOf());
}
