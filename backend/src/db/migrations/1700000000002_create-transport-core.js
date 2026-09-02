exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('vehicle_type', ['bus', 'brt', 'van', 'metro', 'tram']);
  pgm.createType('vehicle_status', ['active', 'maintenance', 'inactive']);

  pgm.createTable('lines', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(20)', notNull: true, unique: true },
    name: { type: 'varchar(150)', notNull: true },
    description: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('routes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    line_id: { type: 'uuid', notNull: true, references: 'lines', onDelete: 'CASCADE' },
    name: { type: 'varchar(150)', notNull: true },
    direction: { type: 'varchar(20)', notNull: true, default: 'outbound' },
    geom: { type: 'geometry(LineString, 4326)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('routes', 'geom', { method: 'gist' });
  pgm.createIndex('routes', 'line_id');

  pgm.createTable('stops', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(150)', notNull: true },
    code: { type: 'varchar(30)' },
    geom: { type: 'geometry(Point, 4326)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('stops', 'geom', { method: 'gist' });

  pgm.createTable('route_stops', {
    route_id: { type: 'uuid', notNull: true, references: 'routes', onDelete: 'CASCADE' },
    stop_id: { type: 'uuid', notNull: true, references: 'stops', onDelete: 'CASCADE' },
    sequence: { type: 'integer', notNull: true },
    scheduled_offset_seconds: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addConstraint('route_stops', 'route_stops_pk', { primaryKey: ['route_id', 'stop_id'] });
  pgm.createIndex('route_stops', ['route_id', 'sequence']);

  pgm.createTable('vehicles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    plate: { type: 'varchar(15)', notNull: true, unique: true },
    type: { type: 'vehicle_type', notNull: true, default: 'bus' },
    capacity: { type: 'integer', notNull: true, default: 0 },
    status: { type: 'vehicle_status', notNull: true, default: 'active' },
    line_id: { type: 'uuid', references: 'lines', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('vehicles', 'line_id');
  pgm.createIndex('vehicles', 'status');

  pgm.createTable('vehicle_positions', {
    id: { type: 'bigserial', primaryKey: true },
    vehicle_id: { type: 'uuid', notNull: true, references: 'vehicles', onDelete: 'CASCADE' },
    route_id: { type: 'uuid', references: 'routes', onDelete: 'SET NULL' },
    geom: { type: 'geometry(Point, 4326)', notNull: true },
    speed_kmh: { type: 'numeric(6,2)' },
    heading_degrees: { type: 'numeric(5,2)' },
    recorded_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('vehicle_positions', 'geom', { method: 'gist' });
  pgm.createIndex('vehicle_positions', ['vehicle_id', 'recorded_at']);

  pgm.createType('trip_status', ['scheduled', 'in_progress', 'completed', 'cancelled']);
  pgm.createTable('trips', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    route_id: { type: 'uuid', notNull: true, references: 'routes', onDelete: 'CASCADE' },
    vehicle_id: { type: 'uuid', references: 'vehicles', onDelete: 'SET NULL' },
    status: { type: 'trip_status', notNull: true, default: 'scheduled' },
    scheduled_start: { type: 'timestamptz', notNull: true },
    actual_start: { type: 'timestamptz' },
    scheduled_end: { type: 'timestamptz' },
    actual_end: { type: 'timestamptz' },
    delay_seconds: { type: 'integer' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('trips', 'route_id');
  pgm.createIndex('trips', 'scheduled_start');
};

exports.down = (pgm) => {
  pgm.dropTable('trips');
  pgm.dropType('trip_status');
  pgm.dropTable('vehicle_positions');
  pgm.dropTable('vehicles');
  pgm.dropTable('route_stops');
  pgm.dropTable('stops');
  pgm.dropTable('routes');
  pgm.dropTable('lines');
  pgm.dropType('vehicle_status');
  pgm.dropType('vehicle_type');
};
