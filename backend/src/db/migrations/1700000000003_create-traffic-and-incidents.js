exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('traffic_sensors', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(150)', notNull: true },
    road_name: { type: 'varchar(150)', notNull: true },
    geom: { type: 'geometry(Point, 4326)', notNull: true },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('traffic_sensors', 'geom', { method: 'gist' });

  pgm.createTable('traffic_readings', {
    id: { type: 'bigserial', primaryKey: true },
    sensor_id: { type: 'uuid', notNull: true, references: 'traffic_sensors', onDelete: 'CASCADE' },
    vehicle_count: { type: 'integer', notNull: true, default: 0 },
    avg_speed_kmh: { type: 'numeric(6,2)' },
    occupancy_percent: { type: 'numeric(5,2)' },
    recorded_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('traffic_readings', ['sensor_id', 'recorded_at']);

  pgm.createType('incident_type', [
    'accident',
    'congestion',
    'roadwork',
    'flooding',
    'vehicle_breakdown',
    'obstruction',
    'other',
  ]);
  pgm.createType('incident_severity', ['low', 'medium', 'high', 'critical']);
  pgm.createType('incident_status', ['open', 'in_progress', 'resolved', 'cancelled']);

  pgm.createTable('incidents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    type: { type: 'incident_type', notNull: true },
    description: { type: 'text', notNull: true },
    severity: { type: 'incident_severity', notNull: true, default: 'medium' },
    status: { type: 'incident_status', notNull: true, default: 'open' },
    geom: { type: 'geometry(Point, 4326)', notNull: true },
    road_name: { type: 'varchar(150)' },
    reported_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    reported_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    resolved_at: { type: 'timestamptz' },
  });
  pgm.createIndex('incidents', 'geom', { method: 'gist' });
  pgm.createIndex('incidents', 'status');
  pgm.createIndex('incidents', 'reported_at');
};

exports.down = (pgm) => {
  pgm.dropTable('incidents');
  pgm.dropType('incident_status');
  pgm.dropType('incident_severity');
  pgm.dropType('incident_type');
  pgm.dropTable('traffic_readings');
  pgm.dropTable('traffic_sensors');
};
