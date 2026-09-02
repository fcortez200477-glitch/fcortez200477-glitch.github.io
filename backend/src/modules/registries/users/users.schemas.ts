import { z } from 'zod';
import { paginationSchema } from '../../../utils/geo';

export const updateUserSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  role: z.enum(['admin', 'operator', 'analyst', 'viewer']).optional(),
  active: z.boolean().optional(),
});

export const listUsersQuerySchema = paginationSchema.extend({
  role: z.enum(['admin', 'operator', 'analyst', 'viewer']).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
