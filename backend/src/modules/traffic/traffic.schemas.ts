import { z } from 'zod';
import { geoPointSchema } from '../../utils/geo';

export const createSensorSchema = z.object({
  name: z.string().min(2).max(150),
  roadName: z.string().min(2).max(150),
  position: geoPointSchema,
});

export const ingestReadingSchema = z.object({
  sensorId: z.string().uuid(),
  vehicleCount: z.number().int().min(0),
  avgSpeedKmh: z.number().min(0).max(300).optional(),
  occupancyPercent: z.number().min(0).max(100).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const sensorIdParamSchema = z.object({ sensorId: z.string().uuid() });

export const readingsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});
