-- Seed initial data for Work Module if needed
INSERT INTO entity_types (code, name, module) VALUES 
('task', 'Tarea', 'work'),
('project', 'Proyecto', 'work'),
('product', 'Producto', 'catalog')
ON CONFLICT (code) DO NOTHING;
