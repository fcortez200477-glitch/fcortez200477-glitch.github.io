// Substitui src/lib/api.ts APENAS na build de demonstracao.
// Serve as respostas capturadas da API real e mantem as escritas em memoria,
// para que os formularios e as acoes da interface continuem funcionando.
import snapshot from './data.json';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const unauthorizedEvent = new EventTarget();

const DEMO_USER = {
  id: 'demo-admin',
  name: 'Administrador',
  email: 'admin@urbanmobility.local',
  role: 'admin' as const,
};

// A demo abre com sessao ativa; o AuthProvider le o usuario do localStorage.
try {
  localStorage.setItem('moblytix.user', JSON.stringify(DEMO_USER));
} catch {
  /* armazenamento indisponivel */
}

let token: string | null = 'demo-token';
export function getToken() {
  return token;
}
export function setToken(next: string | null) {
  token = next;
}

const data = structuredClone(snapshot) as Record<string, any>;
const ids = data._ids;

const uid = () => `demo-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

function recalcKpis() {
  const abertos = data.incidents_all.data.filter((i: any) =>
    ['open', 'in_progress'].includes(i.status),
  );
  data.kpis.incidents.open_incidents = String(abertos.length);
  data.kpis.incidents.critical_open = String(
    abertos.filter((i: any) => i.severity === 'critical').length,
  );
  data.kpis.fleet.total_vehicles = String(data.vehicles.data.length);
  data.kpis.fleet.active_vehicles = String(
    data.vehicles.data.filter((v: any) => v.status === 'active').length,
  );
  data.kpis.fleet.vehicles_in_maintenance = String(
    data.vehicles.data.filter((v: any) => v.status === 'maintenance').length,
  );
  data.kpis.generatedAt = now();
}

function paginate(rows: any[], query: Record<string, any> = {}) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);
  return { data: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize };
}

function handleGet(path: string, query: Record<string, any> = {}) {
  if (path === '/overview/kpis') return data.kpis;

  if (path === '/incidents') {
    let rows = data.incidents_all.data;
    for (const key of ['status', 'severity', 'type']) {
      if (query[key]) rows = rows.filter((r: any) => r[key] === query[key]);
    }
    return paginate(rows, query);
  }

  if (path === '/lines') {
    let rows = data.lines.data;
    if (query.active !== undefined) rows = rows.filter((r: any) => r.active === query.active);
    return paginate(rows, query);
  }

  if (path === '/vehicles') {
    let rows = data.vehicles.data;
    if (query.status) rows = rows.filter((r: any) => r.status === query.status);
    if (query.lineId) rows = rows.filter((r: any) => r.line_id === query.lineId);
    return paginate(rows, query);
  }

  if (path === '/users') return paginate(data.users.data, query);
  if (path === '/traffic/sensors') return data.sensors;

  if (path === '/reports/punctuality') return data.punctuality;
  if (path === '/reports/congestion') return data.congestion;
  if (path === '/reports/incidents-summary') return data.incidents_summary;

  let m = path.match(/^\/traffic\/sensors\/([^/]+)\/readings$/);
  if (m) {
    if (m[1] === ids.s1) return data.readings_s1;
    if (m[1] === ids.s2) return data.readings_s2;
    return { data: [] };
  }

  m = path.match(/^\/transport\/lines\/([^/]+)\/vehicles\/live$/);
  if (m) return m[1] === ids.line1 ? data.live_l1 : data.live_l2;

  m = path.match(/^\/transport\/lines\/([^/]+)\/routes$/);
  if (m) return m[1] === ids.line1 ? data.routes_l1 : data.routes_l2;

  if (path.startsWith('/transport/vehicles/') && path.endsWith('/history')) return { data: [] };
  if (path === '/transport/vehicles/nearby') return data.live_l1;

  throw new ApiError(404, `Endpoint nao disponivel nesta demonstracao: ${path}`);
}

function handlePost(path: string, body: any) {
  if (path === '/auth/login') return { token: 'demo-token', user: DEMO_USER };

  if (path === '/lines') {
    // Reproduz a resposta 409 do backend para codigo duplicado.
    if (data.lines.data.some((l: any) => l.code === body.code)) {
      throw new ApiError(409, 'Ja existe uma linha com este codigo');
    }
    const line = {
      id: uid(),
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      active: true,
      created_at: now(),
    };
    data.lines.data.push(line);
    return line;
  }

  if (path === '/vehicles') {
    if (data.vehicles.data.some((v: any) => v.plate === body.plate)) {
      throw new ApiError(409, 'Ja existe um veiculo com esta placa');
    }
    const vehicle = {
      id: uid(),
      plate: body.plate,
      type: body.type,
      capacity: body.capacity ?? 0,
      status: 'active',
      line_id: body.lineId ?? null,
      created_at: now(),
    };
    data.vehicles.data.push(vehicle);
    recalcKpis();
    return vehicle;
  }

  if (path === '/incidents') {
    const incident = {
      id: uid(),
      type: body.type,
      description: body.description,
      severity: body.severity,
      status: 'open',
      road_name: body.roadName ?? null,
      lat: body.position.lat,
      lng: body.position.lng,
      reported_at: now(),
      resolved_at: null,
    };
    data.incidents_all.data.unshift(incident);
    recalcKpis();
    return incident;
  }

  if (path === '/traffic/sensors') {
    const sensor = {
      id: uid(),
      name: body.name,
      road_name: body.roadName,
      lat: body.position.lat,
      lng: body.position.lng,
      active: true,
      created_at: now(),
    };
    data.sensors.data.push(sensor);
    return sensor;
  }

  if (path === '/auth/register') {
    if (data.users.data.some((u: any) => u.email === body.email)) {
      throw new ApiError(409, 'Ja existe um usuario com este e-mail');
    }
    const user = {
      id: uid(),
      name: body.name,
      email: body.email,
      role: body.role,
      active: true,
      created_at: now(),
    };
    data.users.data.push(user);
    return { token: 'demo-token', user };
  }

  throw new ApiError(404, `Endpoint nao disponivel nesta demonstracao: ${path}`);
}

function handlePatch(path: string, body: any) {
  const apply = (rows: any[], id: string) => {
    const row = rows.find((r: any) => r.id === id);
    if (!row) throw new ApiError(404, 'Registro nao encontrado');
    Object.assign(row, body);
    return row;
  };

  let m = path.match(/^\/incidents\/(.+)$/);
  if (m) {
    const row = apply(data.incidents_all.data, m[1]);
    if (body.status === 'resolved') row.resolved_at = now();
    recalcKpis();
    return row;
  }

  m = path.match(/^\/vehicles\/(.+)$/);
  if (m) {
    const row = apply(data.vehicles.data, m[1]);
    recalcKpis();
    return row;
  }

  m = path.match(/^\/lines\/(.+)$/);
  if (m) return apply(data.lines.data, m[1]);

  m = path.match(/^\/users\/(.+)$/);
  if (m) return apply(data.users.data, m[1]);

  throw new ApiError(404, `Endpoint nao disponivel nesta demonstracao: ${path}`);
}

function handleDelete(path: string) {
  let m = path.match(/^\/lines\/(.+)$/);
  if (m) {
    const row = data.lines.data.find((r: any) => r.id === m![1]);
    if (row) row.active = false;
    return undefined;
  }

  m = path.match(/^\/vehicles\/(.+)$/);
  if (m) {
    const row = data.vehicles.data.find((r: any) => r.id === m![1]);
    if (row) row.status = 'inactive';
    recalcKpis();
    return undefined;
  }

  m = path.match(/^\/users\/(.+)$/);
  if (m) {
    const row = data.users.data.find((r: any) => r.id === m![1]);
    if (row) row.active = false;
    return undefined;
  }

  throw new ApiError(404, `Endpoint nao disponivel nesta demonstracao: ${path}`);
}

/** Pequena latencia para que os estados de carregamento apareçam como no app real. */
const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(structuredClone(value));
      } catch (err) {
        reject(err);
      }
    }, 180);
  });

async function run<T>(fn: () => unknown): Promise<T> {
  const result = fn();
  return delay(result) as Promise<T>;
}

export const api = {
  get: <T,>(path: string, query?: Record<string, any>) => run<T>(() => handleGet(path, query ?? {})),
  post: <T,>(path: string, body?: unknown) => run<T>(() => handlePost(path, body)),
  patch: <T,>(path: string, body?: unknown) => run<T>(() => handlePatch(path, body)),
  delete: <T,>(path: string) => run<T>(() => handleDelete(path)),
};

export async function apiRequest<T>(path: string): Promise<T> {
  return run<T>(() => handleGet(path, {}));
}
