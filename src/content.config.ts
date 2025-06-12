// 1. Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content';

// 2. Import loader(s)
import { glob, file } from 'astro/loaders';

// 3. Define your collection(s)
const news = defineCollection({ 
    loader: file("src/data/news.json"),
    schema: z.object({
        path: z.string(),
        title: z.string(),
        tag: z.string(),
        short: z.string(),
        long: z.string(),
        date: z.coerce.date(),
        imageurl: z.string()
    })
 });


// 4. Export a single `collections` object to register your collection(s)
export const collections = { news };