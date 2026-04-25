-- CircuitMind Database Schema
-- PostgreSQL 16

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    is_public   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);

-- ─── Circuits (append-only versioning) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circuits (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version             INTEGER NOT NULL DEFAULT 1,
    ir                  JSONB NOT NULL,
    ir_hash             VARCHAR(64),
    agent_conversation  JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_circuits_project ON circuits(project_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_circuits_ir ON circuits USING gin(ir);

-- ─── Project head pointer ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_head (
    project_id  UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    circuit_id  UUID NOT NULL REFERENCES circuits(id),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Component database ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS components (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mpn              VARCHAR(255) UNIQUE NOT NULL,
    manufacturer     VARCHAR(255),
    description      TEXT,
    type             VARCHAR(100),
    value            VARCHAR(100),
    package          VARCHAR(100),
    datasheet_url    TEXT,
    kicad_symbol     VARCHAR(255),
    kicad_footprint  VARCHAR(255),
    spice_model      TEXT,
    specs            JSONB,
    in_stock         BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_components_fts ON components
    USING gin(
        to_tsvector('english',
            COALESCE(description, '') || ' ' ||
            COALESCE(mpn, '') || ' ' ||
            COALESCE(manufacturer, '')
        )
    );
CREATE INDEX IF NOT EXISTS idx_components_type ON components(type, package);
CREATE INDEX IF NOT EXISTS idx_components_mpn_trgm ON components USING gin(mpn gin_trgm_ops);

-- ─── Simulation results ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circuit_id      UUID NOT NULL REFERENCES circuits(id),
    analysis_type   VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'pending',
    results         JSONB,
    error           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Exports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circuit_id  UUID NOT NULL REFERENCES circuits(id),
    format      VARCHAR(20) NOT NULL,
    content     TEXT,
    file_url    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed: stub user (for development without auth) ───────────────────────────
INSERT INTO users (id, email, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'dev@circuitmind.local', 'Dev User')
ON CONFLICT DO NOTHING;

-- ─── Seed: common components ──────────────────────────────────────────────────
INSERT INTO components (mpn, manufacturer, description, type, value, package, kicad_symbol, kicad_footprint, specs) VALUES
('AMS1117-3.3', 'AMS', '3.3V 1A LDO Voltage Regulator', 'voltage_regulator', 'AMS1117-3.3', 'SOT-223', 'Regulator_Linear:AMS1117-3.3', 'Package_TO_SOT_SMD:SOT-223', '{"vin_max": "15V", "vout": "3.3V", "iout_max": "1A", "dropout": "1.3V"}'),
('AMS1117-5.0', 'AMS', '5V 1A LDO Voltage Regulator', 'voltage_regulator', 'AMS1117-5.0', 'SOT-223', 'Regulator_Linear:AMS1117-5.0', 'Package_TO_SOT_SMD:SOT-223', '{"vin_max": "15V", "vout": "5V", "iout_max": "1A"}'),
('LM7805', 'TI', '5V 1.5A Linear Voltage Regulator', 'voltage_regulator', 'LM7805', 'TO-220', 'Regulator_Linear:L7805', 'Package_TO_SOT_THT:TO-220-3_Horizontal_TabDown', '{"vout": "5V", "iout_max": "1.5A"}'),
('LM358', 'TI', 'Dual General-Purpose Op-Amp', 'opamp', 'LM358', 'SOIC-8', 'Amplifier_Operational:LM358', 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm', '{"supply_max": "32V", "gbw": "1MHz"}'),
('NE555P', 'TI', '555 Timer IC', 'ic', 'NE555P', 'DIP-8', 'Timer:NE555', 'Package_DIP:DIP-8_W7.62mm', '{"supply_min": "4.5V", "supply_max": "16V"}'),
('2N2222A', 'ON Semi', 'NPN General Purpose Transistor', 'bjt', '2N2222A', 'TO-92', 'Device:2N2222A', 'Package_TO_SOT_THT:TO-92_Inline', '{"vceo": "40V", "ic_max": "600mA", "hfe": "100-300"}'),
('1N4148W', 'Vishay', 'Small Signal Switching Diode', 'diode', '1N4148W', 'SOD-123', 'Device:1N4148W', 'Diode_SMD:D_SOD-123', '{"vr_max": "100V", "if_max": "300mA"}'),
('CRYSTAL-8MHZ', 'Generic', '8MHz Crystal', 'crystal', '8MHz', 'HC-49S', 'Device:Crystal', 'Crystal:Crystal_HC49-S_Vertical', '{"frequency": "8MHz", "load_cap": "20pF"}')
ON CONFLICT (mpn) DO NOTHING;
