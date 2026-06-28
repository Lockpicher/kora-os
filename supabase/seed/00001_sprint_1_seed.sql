-- Insert Base Organization
INSERT INTO organizations (id, name, slug) VALUES 
('018e9b4e-2820-7f28-8d19-b56e6d1c99b8', 'Grupo Kubbonet', 'grupo-kubbonet');

-- Insert Entity Types
INSERT INTO entity_types (id, code, name, module) VALUES 
('018e9b4e-2820-7f28-8d19-b56e6d1c99b9', 'product', 'Producto', 'catalog'),
('018e9b4e-2820-7f28-8d19-b56e6d1c99ba', 'order', 'Pedido', 'orders'),
('018e9b4e-2820-7f28-8d19-b56e6d1c99bb', 'brand', 'Marca', 'catalog');

-- Insert Priorities
INSERT INTO priorities (id, organization_id, name, color, position) VALUES 
('018e9b4e-2820-7f28-8d19-b56e6d1c0001', '018e9b4e-2820-7f28-8d19-b56e6d1c99b8', 'Urgente', '#ef4444', 1),
('018e9b4e-2820-7f28-8d19-b56e6d1c0002', '018e9b4e-2820-7f28-8d19-b56e6d1c99b8', 'Alta', '#f97316', 2),
('018e9b4e-2820-7f28-8d19-b56e6d1c0003', '018e9b4e-2820-7f28-8d19-b56e6d1c99b8', 'Media', '#eab308', 3),
('018e9b4e-2820-7f28-8d19-b56e6d1c0004', '018e9b4e-2820-7f28-8d19-b56e6d1c99b8', 'Baja', '#3b82f6', 4);

-- Insert Workflow
INSERT INTO workflows (id, organization_id, name) VALUES 
('018e9b4e-2820-7f28-8d19-b56e6d1c0005', '018e9b4e-2820-7f28-8d19-b56e6d1c99b8', 'Flujo Principal');

-- Insert Workflow Columns
INSERT INTO workflow_columns (id, workflow_id, name, position) VALUES 
('018e9b4e-2820-7f28-8d19-b56e6d1c0011', '018e9b4e-2820-7f28-8d19-b56e6d1c0005', 'Ideas', 1),
('018e9b4e-2820-7f28-8d19-b56e6d1c0012', '018e9b4e-2820-7f28-8d19-b56e6d1c0005', 'Backlog', 2),
('018e9b4e-2820-7f28-8d19-b56e6d1c0013', '018e9b4e-2820-7f28-8d19-b56e6d1c0005', 'Por hacer', 3),
('018e9b4e-2820-7f28-8d19-b56e6d1c0014', '018e9b4e-2820-7f28-8d19-b56e6d1c0005', 'En proceso', 4),
('018e9b4e-2820-7f28-8d19-b56e6d1c0015', '018e9b4e-2820-7f28-8d19-b56e6d1c0005', 'Esperando', 5),
('018e9b4e-2820-7f28-8d19-b56e6d1c0016', '018e9b4e-2820-7f28-8d19-b56e6d1c0005', 'En revisión', 6),
('018e9b4e-2820-7f28-8d19-b56e6d1c0017', '018e9b4e-2820-7f28-8d19-b56e6d1c0005', 'Listo', 7),
('018e9b4e-2820-7f28-8d19-b56e6d1c0018', '018e9b4e-2820-7f28-8d19-b56e6d1c0005', 'Archivado', 8);

-- Insert Project KORA OS
INSERT INTO projects (id, organization_id, name, status) VALUES 
('018e9b4e-2820-7f28-8d19-b56e6d1c0021', '018e9b4e-2820-7f28-8d19-b56e6d1c99b8', 'KORA OS', 'active');

-- Generate 30 Seed Tasks
DO $$
DECLARE
    i integer;
BEGIN
    FOR i IN 1..30 LOOP
        INSERT INTO tasks (
            organization_id, 
            project_id, 
            title, 
            workflow_column_id
        ) VALUES (
            '018e9b4e-2820-7f28-8d19-b56e6d1c99b8',
            '018e9b4e-2820-7f28-8d19-b56e6d1c0021',
            'Tarea de Prueba ' || i,
            '018e9b4e-2820-7f28-8d19-b56e6d1c001' || floor(random() * 7 + 1)::text
        );
    END LOOP;
END $$;
