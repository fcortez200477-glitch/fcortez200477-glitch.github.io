import { z } from 'zod';
import { paginationSchema } from '../../../utils/geo';

export const createLineSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
});

export const updateLineSchema = createLineSchema.partial().extend({
  active: z.boolean().optional(),
});

export const listLinesQuerySchema = paginationSchema.extend({
  active: z.coerce.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
