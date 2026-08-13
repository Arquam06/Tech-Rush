-- ============================================================
-- AI WORKPLACE OS — DEMO SEED DATA
-- Run after applying database/schema.sql
-- ============================================================

-- 1. Create Demo Company
INSERT INTO companies (id, name, slug, industry, size_range)
VALUES ('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Acme AI Systems', 'acme-ai', 'Software Development', '50-100')
ON CONFLICT (slug) DO NOTHING;

-- 2. Create Departments
INSERT INTO departments (id, company_id, name, description)
VALUES 
('d1111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Engineering', 'Core product development and AI engineering'),
('d2222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Product & Design', 'UI/UX design and product strategy'),
('d3333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Operations', 'HR, finance, and workplace operations')
ON CONFLICT DO NOTHING;

-- 3. Create Demo Employees
INSERT INTO employees (id, company_id, department_id, email, first_name, last_name, title, role, workload_capacity)
VALUES
('e1111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'd3333333-3333-3333-3333-333333333333', 'admin@acme.com', 'Sarah', 'Chen', 'VP of Operations', 'admin', 100),
('e2222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'd1111111-1111-1111-1111-111111111111', 'manager@acme.com', 'Alex', 'Rivera', 'Engineering Lead', 'manager', 100),
('e3333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'd1111111-1111-1111-1111-111111111111', 'rahul@acme.com', 'Rahul', 'Sharma', 'Senior Backend Engineer', 'employee', 100),
('e4444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'd1111111-1111-1111-1111-111111111111', 'arquam@acme.com', 'Arquam', 'Khan', 'Full Stack Developer', 'employee', 100)
ON CONFLICT DO NOTHING;

-- 4. Create Demo Team
INSERT INTO teams (id, company_id, name, description, lead_id)
VALUES ('t1111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Team Alpha', 'Core platform & intelligence team', 'e2222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO team_members (team_id, employee_id, company_id, role)
VALUES
('t1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'lead'),
('t1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'member'),
('t1111111-1111-1111-1111-111111111111', 'e4444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'member')
ON CONFLICT DO NOTHING;

-- 5. Create Demo Project
INSERT INTO projects (id, company_id, owner_id, title, description, status, priority, end_date)
VALUES ('p1111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'e2222222-2222-2222-2222-222222222222', 'Project Alpha', 'Next-gen enterprise workplace integration platform', 'active', 'high', CURRENT_DATE + INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- 6. Create Demo Tasks (including overloaded Rahul and Task #42 bottleneck scenario)
INSERT INTO tasks (id, company_id, project_id, assignee_id, title, description, status, priority, complexity, estimated_hours, due_date)
VALUES
('tk424242-4242-4242-4242-424242424242', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'p1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'Task #42: Core API Gateway Integration', 'Critical integration layer blocking downstream service hooks', 'in_progress', 'critical', 'high', 16, CURRENT_DATE + INTERVAL '1 day'),
('tk101010-1010-1010-1010-101010101010', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'p1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'Database Schema Migration v2', 'Migrate user session tables to PostgreSQL', 'in_progress', 'high', 'high', 12, CURRENT_DATE + INTERVAL '2 days'),
('tk202020-2020-2020-2020-202020202020', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'p1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'Security Auth Policy Audit', 'Validate JWT middleware claim handling', 'todo', 'high', 'medium', 8, CURRENT_DATE + INTERVAL '3 days'),
('tk303030-3030-3030-3030-303030303030', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'p1111111-1111-1111-1111-111111111111', 'e4444444-4444-4444-4444-444444444444', 'Frontend Dashboard Widgets', 'Build analytics cards and health widgets', 'in_progress', 'medium', 'medium', 6, CURRENT_DATE + INTERVAL '4 days')
ON CONFLICT DO NOTHING;

-- 7. Task Dependencies
INSERT INTO task_dependencies (task_id, depends_on_id, company_id)
VALUES ('tk303030-3030-3030-3030-303030303030', 'tk424242-4242-4242-4242-424242424242', 'a1b2c3d4-e5f6-7890-abcd-111111111111')
ON CONFLICT DO NOTHING;

-- 8. Rewards Configuration
INSERT INTO rewards (company_id, title, description, points_required, category)
VALUES
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Performance Bonus', '$250 performance bonus card', 1000, 'financial'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Extra Paid Leave Day', '1 day additional paid leave', 1500, 'time_off'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Team Outing Pass', 'Sponsored team outing voucher', 2500, 'recognition')
ON CONFLICT DO NOTHING;
