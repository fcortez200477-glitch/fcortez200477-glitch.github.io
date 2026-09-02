/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension('postgis', { ifNotExists: true });
  pgm.createExtension('pgcrypto', { ifNotExists: true }); // gen_random_uuid()
};

exports.down = (pgm) => {
  pgm.dropExtension('pgcrypto', { ifExists: true });
  pgm.dropExtension('postgis', { ifExists: true });
};
