-- Sequence for Task Readable ID
CREATE SEQUENCE task_readable_id_seq START WITH 1000;

-- 1. Folders
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- 2. Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- 3. Priorities
CREATE TABLE priorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
CREATE TRIGGER update_priorities_updated_at BEFORE UPDATE ON priorities FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- 4. Workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- 5. Workflow Columns
CREATE TABLE workflow_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
CREATE TRIGGER update_workflow_columns_updated_at BEFORE UPDATE ON workflow_columns FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- 6. Workflow Transitions
CREATE TABLE workflow_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    from_column_id UUID REFERENCES workflow_columns(id) ON DELETE CASCADE,
    to_column_id UUID NOT NULL REFERENCES workflow_columns(id) ON DELETE CASCADE,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    automation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
CREATE TRIGGER update_workflow_transitions_updated_at BEFORE UPDATE ON workflow_transitions FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- 7. Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    readable_id VARCHAR(50) NOT NULL DEFAULT ('TASK-' || nextval('task_readable_id_seq')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority_id UUID REFERENCES priorities(id) ON DELETE SET NULL,
    workflow_column_id UUID NOT NULL REFERENCES workflow_columns(id),
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    search_vector tsvector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE INDEX idx_tasks_readable_id ON tasks(readable_id);
CREATE INDEX idx_tasks_search_vector ON tasks USING GIN (search_vector);

-- 8. Task Entities (Universal Junction Table)
CREATE TABLE task_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    entity_type_id UUID NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'related',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_task_entities_entity ON task_entities(entity_type_id, entity_id);

-- 9. Task Assignees
CREATE TABLE task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
