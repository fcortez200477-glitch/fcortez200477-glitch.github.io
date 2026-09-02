exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('user_role', ['admin', 'operator', 'analyst', 'viewer']);

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(150)', notNull: true },
    email: { type: 'varchar(200)', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    role: { type: 'user_role', notNull: true, default: 'viewer' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('users', 'email');
};

exports.down = (pgm) => {
  pgm.dropTable('users');
  pgm.dropType('user_role');
};
