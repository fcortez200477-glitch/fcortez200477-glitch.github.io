import { z } from 'zod';
import { geoPointSchema, paginationSchema } from '../../utils/geo';

const incidentType = z.enum([
  'accident',
  'congestion',
  'roadwork',
  'flooding',
  'vehicle_breakdown',
  'obstruction',
  'other',
]);
const incidentSeverity = z.enum(['low', 'medium', 'high', 'critical']);
const incidentStatus = z.enum(['open', 'in_progress', 'resolved', 'cancelled']);

export const createIncidentSchema = z.object({
  type: incidentType,
  description: z.string().min(5).max(2000),
  severity: incidentSeverity.default('medium'),
  position: geoPointSchema,
  roadName: z.string().max(150).optional(),
});

export const updateIncidentSchema = z.object({
  status: incidentStatus.optional(),
  severity: incidentSeverity.optional(),
  description: z.string().min(5).max(2000).optional(),
});

export const listIncidentsQuerySchema = paginationSchema.extend({
  status: incidentStatus.optional(),
  severity: incidentSeverity.optional(),
  type: incidentType.optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
