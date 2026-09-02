import { z } from 'zod';

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type GeoPoint = z.infer<typeof geoPointSchema>;

/** Constroi um literal WKT/PostGIS a partir de lat/lng (SRID 4326). */
export function pointToWkt({ lat, lng }: GeoPoint): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function paginationToSql(page: number, pageSize: number) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}
