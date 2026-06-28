-- 1. Add visual attributes to Projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS emoji VARCHAR(10),
ADD COLUMN IF NOT EXISTS color VARCHAR(50),
ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

-- 2. Favorites (Polymorphic)
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'project', 'task', 'product'
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_favorites_user_entity ON favorites(user_id, entity_type, entity_id);

-- 3. Recent Entities (Polymorphic)
CREATE TABLE IF NOT EXISTS recent_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL,
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recent_entities_user ON recent_entities(user_id, last_accessed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_entities_unique ON recent_entities(user_id, entity_type, entity_id);
