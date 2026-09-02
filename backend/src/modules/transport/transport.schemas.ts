import { z } from 'zod';
import { geoPointSchema } from '../../utils/geo';

export const ingestPositionSchema = z.object({
  vehicleId: z.string().uuid(),
  routeId: z.string().uuid().optional(),
  position: geoPointSchema,
  speedKmh: z.number().min(0).max(300).optional(),
  headingDegrees: z.number().min(0).max(360).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(10).max(20000).default(1000),
});

export const vehicleHistoryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

export const lineIdParamSchema = z.object({ lineId: z.string().uuid() });
export const vehicleIdParamSchema = z.object({ vehicleId: z.string().uuid() });
