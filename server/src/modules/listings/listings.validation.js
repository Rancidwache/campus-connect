import { z } from 'zod';

export const CATEGORY_TYPES = ['DIGITAL', 'PHYSICAL'];
export const LISTING_STATUSES = ['ACTIVE', 'PAUSED', 'HIRED'];

const body = z.object({
  categoryType: z.enum(CATEGORY_TYPES),
  category: z.string().min(2, 'Pick a category').max(60),
  title: z.string().min(4, 'Give the listing a clear title').max(120),
  description: z.string().min(10, 'Describe what you are offering').max(4000),
  price: z.coerce.number().positive('Price must be greater than zero').max(10_000_000),
  location: z.string().max(120).optional(),
});

export const createListingSchema = { body };

export const updateListingSchema = {
  body: body.partial().extend({
    status: z.enum(LISTING_STATUSES).optional(),
  }),
};

export const listQuerySchema = {
  query: z.object({
    q: z.string().trim().max(120).optional(),
    categoryType: z.enum(CATEGORY_TYPES).optional(),
    category: z.string().max(60).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    mine: z.coerce.boolean().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
  }),
};

export const idParamSchema = {
  params: z.object({ id: z.coerce.number().int().positive() }),
};
