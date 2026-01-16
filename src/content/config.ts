import { defineCollection, z } from 'astro:content';

const reviewsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    excerpt: z.string(),
    category: z.string().default('기타'),
    rating: z.number().default(0),
    product: z.string().default(''),
    lightColor: z.string().default('#c53030'),
    darkColor: z.string().default('#9b2c2c'),
    notionPageId: z.string().optional(),
  }),
});

export const collections = {
  reviews: reviewsCollection,
};
