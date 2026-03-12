-- Flight Price Intelligence Lab: schema skeleton (placeholder)
-- This file intentionally defines table stubs only at scaffold stage.

CREATE TABLE IF NOT EXISTS airports (
    airport_id SERIAL PRIMARY KEY,
    iata_code TEXT UNIQUE,
    airport_name TEXT,
    city TEXT,
    state TEXT
);

CREATE TABLE IF NOT EXISTS airlines (
    airline_id SERIAL PRIMARY KEY,
    carrier_code TEXT UNIQUE,
    airline_name TEXT
);

CREATE TABLE IF NOT EXISTS routes (
    route_id SERIAL PRIMARY KEY,
    origin_iata TEXT,
    destination_iata TEXT,
    UNIQUE (origin_iata, destination_iata)
);

-- Placeholder fact/derived tables to be expanded later.
CREATE TABLE IF NOT EXISTS monthly_fares (
    route_id INTEGER,
    year INTEGER,
    month INTEGER,
    avg_fare NUMERIC
);

CREATE TABLE IF NOT EXISTS ontime_stats (
    route_id INTEGER,
    carrier_code TEXT,
    year INTEGER,
    month INTEGER,
    ontime_rate NUMERIC
);

CREATE TABLE IF NOT EXISTS cancellations (
    route_id INTEGER,
    carrier_code TEXT,
    year INTEGER,
    month INTEGER,
    cancellation_rate NUMERIC
);

CREATE TABLE IF NOT EXISTS airport_enplanements (
    airport_id INTEGER,
    year INTEGER,
    total_enplanements BIGINT
);

CREATE TABLE IF NOT EXISTS route_scores (
    route_id INTEGER,
    year INTEGER,
    month INTEGER,
    reliability_score NUMERIC,
    fare_volatility NUMERIC,
    deal_signal TEXT,
    route_attractiveness_score NUMERIC
);
