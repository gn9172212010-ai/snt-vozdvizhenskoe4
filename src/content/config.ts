import { defineCollection, z } from "astro:content";

// Новости и документы теперь публикуются автосканированием папок
// (см. src/utils/autoContent.js) — без markdown-обёртки и без CMS-формы.
// Единственная коллекция, которая всё ещё использует стандартный механизм
// Astro Content Collections — «events» (Календарь мероприятий).

const events = defineCollection({
    schema: z.object({
        title: z.string(),
        date: z.date()
    })
});

export const collections = {
    events
};
