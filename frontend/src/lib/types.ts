export type UserRole = 'admin' | 'operator' | 'analyst' | 'viewer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
}

export interface Kpis {
  fleet: {
    active_vehicles: string;
    vehicles_in_maintenance: string;
    total_vehicles: string;
  };
  incidents: {
    open_incidents: string;
    resolved_last_24h: string;
    critical_open: string;
  };
  punctuality: { avg_punctuality_percent: string | null };
  traffic: { avg_speed_kmh: string | null };
  generatedAt: string;
}

export interface Line {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export type VehicleType = 'bus' | 'brt' | 'van' | 'metro' | 'tram';
export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export interface Vehicle {
  id: string;
  plate: string;
  type: VehicleType;
  capacity: number;
  status: VehicleStatus;
  line_id: string | null;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface LiveVehicle {
  vehicle_id: string;
  plate: string;
  status: VehicleStatus;
  lat: number;
  lng: number;
  speed_kmh: string | null;
  heading_degrees: string | null;
  recorded_at: string;
}

export interface RouteGeometry {
  id: string;
  name: string;
  direction: string;
  geometry: { type: 'LineString'; coordinates: [number, number][] } | null;
}

export interface VehiclePosition {
  lat: number;
  lng: number;
  speed_kmh: string | null;
  heading_degrees: string | null;
  recorded_at: string;
}

export interface TrafficSensor {
  id: string;
  name: string;
  road_name: string;
  lat: number;
  lng: number;
  active: boolean;
  created_at: string;
}

export interface TrafficReading {
  vehicle_count: number;
  avg_speed_kmh: string | null;
  occupancy_percent: string | null;
  recorded_at: string;
}

export type IncidentType =
  | 'accident'
  | 'congestion'
  | 'roadwork'
  | 'flooding'
  | 'vehicle_breakdown'
  | 'obstruction'
  | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled';

export interface Incident {
  id: string;
  type: IncidentType;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  road_name: string | null;
  lat: number;
  lng: number;
  reported_at: string;
  resolved_at: string | null;
}

export interface PunctualityRow {
  line_id: string;
  line_code: string;
  line_name: string;
  trips_completed: string;
  trips_on_time: string;
  punctuality_percent: string | null;
  avg_delay_seconds: string | null;
}

export interface CongestionRow {
  sensor_id: string;
  sensor_name: string;
  road_name: string;
  avg_speed_kmh: string | null;
  avg_occupancy_percent: string | null;
  readings_count: string;
}

export interface IncidentSummaryRow {
  type: IncidentType;
  severity: IncidentSeverity;
  total: string;
}
