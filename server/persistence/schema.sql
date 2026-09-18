-- RouteFlow Database Schema
-- Traces to: Week 4 §6.2 Normalized Relational Design

CREATE TABLE IF NOT EXISTS trip (
  trip_id TEXT PRIMARY KEY,
  start_time DATETIME NOT NULL,
  start_lat REAL NOT NULL,
  start_lon REAL NOT NULL,
  active_preset_id TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (active_preset_id) REFERENCES preset(preset_id)
);

CREATE TABLE IF NOT EXISTS stop (
  stop_id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  input_order INTEGER NOT NULL,
  pref_start TIME,
  pref_end TIME,
  FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stop_constraint (
  constraint_id TEXT PRIMARY KEY,
  stop_id TEXT NOT NULL,
  type TEXT NOT NULL,
  open_time TIME,
  close_time TIME,
  precedes_stop_id TEXT,
  FOREIGN KEY (stop_id) REFERENCES stop(stop_id) ON DELETE CASCADE,
  FOREIGN KEY (precedes_stop_id) REFERENCES stop(stop_id)
);

CREATE TABLE IF NOT EXISTS preset (
  preset_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  travel_weight REAL NOT NULL,
  time_window_weight REAL NOT NULL,
  weather_weight REAL NOT NULL,
  crowd_weight REAL NOT NULL,
  scenic_weight REAL NOT NULL,
  preference_weight REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS route_result (
  route_result_id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL UNIQUE,
  preset_id TEXT,
  total_time REAL NOT NULL,
  total_distance REAL NOT NULL,
  violation_count INTEGER NOT NULL DEFAULT 0,
  computed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE CASCADE,
  FOREIGN KEY (preset_id) REFERENCES preset(preset_id)
);

CREATE TABLE IF NOT EXISTS route_result_stop (
  route_result_id TEXT NOT NULL,
  stop_id TEXT NOT NULL,
  seq_order INTEGER NOT NULL,
  PRIMARY KEY (route_result_id, stop_id),
  UNIQUE (route_result_id, seq_order),
  FOREIGN KEY (route_result_id) REFERENCES route_result(route_result_id) ON DELETE CASCADE,
  FOREIGN KEY (stop_id) REFERENCES stop(stop_id)
);
