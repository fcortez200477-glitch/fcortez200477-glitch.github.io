import { z } from 'zod';
import { paginationSchema } from '../../../utils/geo';

export const createVehicleSchema = z.object({
  plate: z.string().min(5).max(15),
  type: z.enum(['bus', 'brt', 'van', 'metro', 'tram']).default('bus'),
  capacity: z.number().int().min(0).default(0),
  lineId: z.string().uuid().optional(),
});

export const updateVehicleSchema = z.object({
  type: z.enum(['bus', 'brt', 'van', 'metro', 'tram']).optional(),
  capacity: z.number().int().min(0).optional(),
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  lineId: z.string().uuid().nullable().optional(),
});

export const listVehiclesQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  lineId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
