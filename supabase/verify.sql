-- 1. Verificar Tablas
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'organizations', 'entity_types', 'events', 'event_subscriptions', 'event_queue',
        'folders', 'projects', 'priorities', 'workflows', 'workflow_columns',
        'workflow_transitions', 'tasks', 'task_entities', 'task_assignees',
        'favorites', 'recent_entities'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        IF NOT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = t
        ) THEN
            RAISE EXCEPTION 'La tabla % no existe', t;
        END IF;
    END LOOP;
END $$;

-- 2. Verificar Funciones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'update_updated_at'
    ) THEN
        RAISE EXCEPTION 'La función update_updated_at no existe';
    END IF;
END $$;

-- 3. Verificar Triggers
DO $$
DECLARE
    trg text;
    trgs text[] := ARRAY[
        'update_organizations_updated_at', 'update_folders_updated_at',
        'update_projects_updated_at', 'update_priorities_updated_at',
        'update_workflows_updated_at', 'update_workflow_columns_updated_at',
        'update_workflow_transitions_updated_at', 'update_tasks_updated_at'
    ];
BEGIN
    FOREACH trg IN ARRAY trgs
    LOOP
        IF NOT EXISTS (
            SELECT FROM pg_trigger 
            WHERE tgname = trg
        ) THEN
            RAISE EXCEPTION 'El trigger % no existe', trg;
        END IF;
    END LOOP;
END $$;

-- 4. Verificar Índices Clave (Muestra)
DO $$
DECLARE
    idx text;
    idxs text[] := ARRAY[
        'idx_events_aggregate', 'idx_tasks_search_vector', 'idx_favorites_user_entity'
    ];
BEGIN
    FOREACH idx IN ARRAY idxs
    LOOP
        IF NOT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = idx
        ) THEN
            RAISE EXCEPTION 'El índice % no existe', idx;
        END IF;
    END LOOP;
END $$;

DO $$ BEGIN RAISE NOTICE 'Todo ha sido verificado correctamente.'; END $$;
