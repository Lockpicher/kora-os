-- 1. Create a default organization
INSERT INTO organizations (id, name, slug) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Mi Organización', 'mi-organizacion')
ON CONFLICT (id) DO NOTHING;

-- 2. Create organization members table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_org ON organization_members(user_id, organization_id);

-- Note: We can't automatically link the user_id here because auth.users is populated dynamically when you sign up.
-- In a real app, a trigger on auth.users would insert into organization_members.
-- For testing, we will bypass the organization_members strict check in the action, or we expect the user to have a record.

-- 3. Create Priorities
INSERT INTO priorities (id, organization_id, name, color, icon, position) VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'Baja', '#3b82f6', 'arrow-down', 1),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'Media', '#eab308', 'minus', 2),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'Alta', '#ef4444', 'arrow-up', 3)
ON CONFLICT (id) DO NOTHING;

-- 4. Create Default Workflow
INSERT INTO workflows (id, organization_id, name) VALUES 
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'Kanban Base')
ON CONFLICT (id) DO NOTHING;

-- 5. Create Workflow Columns
INSERT INTO workflow_columns (id, workflow_id, name, color, position) VALUES 
('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444444', 'Todo', '#94a3b8', 1),
('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444444', 'In Progress', '#3b82f6', 2),
('55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444444', 'Done', '#22c55e', 3)
ON CONFLICT (id) DO NOTHING;

-- 6. Create a Default Project
INSERT INTO projects (id, organization_id, name, description, status) VALUES 
('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'Proyecto Alpha', 'Proyecto principal de pruebas', 'active')
ON CONFLICT (id) DO NOTHING;
