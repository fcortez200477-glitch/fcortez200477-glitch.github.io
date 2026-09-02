exports.shorthands = undefined;

exports.up = (pgm) => {
  // Pontualidade por linha (compara horario previsto x realizado das viagens concluidas)
  pgm.createView('vw_line_punctuality', {}, `
    SELECT
      l.id AS line_id,
      l.code AS line_code,
      l.name AS line_name,
      count(t.id) AS trips_completed,
      count(t.id) FILTER (WHERE t.delay_seconds <= 300) AS trips_on_time,
      round(
        (count(t.id) FILTER (WHERE t.delay_seconds <= 300))::numeric
          / NULLIF(count(t.id), 0) * 100, 2
      ) AS punctuality_percent,
      round(avg(t.delay_seconds), 2) AS avg_delay_seconds
    FROM trips t
    JOIN routes r ON r.id = t.route_id
    JOIN lines l ON l.id = r.line_id
    WHERE t.status = 'completed'
    GROUP BY l.id, l.code, l.name
  `);

  // Lentidao/congestionamento por sensor nas ultimas 24h
  pgm.createView('vw_traffic_congestion_24h', {}, `
    SELECT
      s.id AS sensor_id,
      s.name AS sensor_name,
      s.road_name,
      round(avg(r.avg_speed_kmh), 2) AS avg_speed_kmh,
      round(avg(r.occupancy_percent), 2) AS avg_occupancy_percent,
      count(r.id) AS readings_count
    FROM traffic_sensors s
    LEFT JOIN traffic_readings r
      ON r.sensor_id = s.id AND r.recorded_at >= now() - interval '24 hours'
    GROUP BY s.id, s.name, s.road_name
  `);
};

exports.down = (pgm) => {
  pgm.dropView('vw_traffic_congestion_24h');
  pgm.dropView('vw_line_punctuality');
};
