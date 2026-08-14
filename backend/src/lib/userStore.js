import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.join(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

class UserStore {
  constructor() {
    this.usersByEmail = new Map();
    this.usersById = new Map();
    this.employeesById = new Map();
    this.companiesById = new Map();
    this.projects = [];
    this.tasks = [];

    this.ensureDataDir();
    this.loadFromDisk();
  }

  ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('⚠️ UserStore data dir creation notice:', err.message);
    }
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const data = JSON.parse(raw);

        if (Array.isArray(data.users)) {
          for (const u of data.users) {
            this.usersByEmail.set(u.email.toLowerCase(), u);
            this.usersById.set(u.id, u);
            if (u.employee) {
              this.employeesById.set(u.employee.id, u.employee);
              if (u.employee.companies) {
                this.companiesById.set(u.employee.companies.id, u.employee.companies);
              }
            }
          }
        }
        if (Array.isArray(data.projects)) {
          this.projects = data.projects;
        }
        if (Array.isArray(data.tasks)) {
          this.tasks = data.tasks;
        }
        console.log(`💾 [UserStore] Restored ${this.usersByEmail.size} user(s), ${this.projects.length} project(s), ${this.tasks.length} task(s) from persistent disk storage.`);
      }
    } catch (err) {
      console.warn('⚠️ UserStore load from disk notice:', err.message);
    }
  }

  saveToDisk() {
    try {
      this.ensureDataDir();
      const users = Array.from(this.usersByEmail.values());
      const payload = {
        users,
        projects: this.projects,
        tasks: this.tasks,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('⚠️ UserStore save to disk notice:', err.message);
    }
  }

  saveUser({ id, email, password, firstName, lastName, companyName, companyId, role, title }) {
    const cleanEmail = email.trim().toLowerCase();
    let existing = this.usersByEmail.get(cleanEmail);

    const userId = id || existing?.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const empId = existing?.employee?.id || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const compId = companyId || existing?.companyId || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const company = {
      id: compId,
      name: companyName || existing?.companyName || 'My Company',
      slug: (companyName || existing?.companyName || 'my-company').toLowerCase().replace(/\s+/g, '-'),
    };
    this.companiesById.set(compId, company);

    const employee = {
      id: empId,
      company_id: compId,
      user_id: userId,
      email: cleanEmail,
      first_name: firstName || existing?.firstName || 'User',
      last_name: lastName || existing?.lastName || '',
      role: role || existing?.role || 'admin',
      title: title || existing?.title || (role === 'admin' ? 'Administrator' : 'Team Member'),
      is_active: true,
      companies: company,
    };
    this.employeesById.set(empId, employee);

    const userData = {
      id: userId,
      email: cleanEmail,
      password: password || existing?.password,
      firstName: employee.first_name,
      lastName: employee.last_name,
      role: employee.role,
      companyName: company.name,
      companyId: compId,
      employee,
    };

    this.usersByEmail.set(cleanEmail, userData);
    this.usersById.set(userId, userData);

    this.saveToDisk();
    console.log(`👤 [UserStore] Saved user: "${employee.first_name} ${employee.last_name}" <${cleanEmail}>, Company: "${company.name}"`);
    return userData;
  }

  getUserByEmail(email) {
    if (!email) return null;
    return this.usersByEmail.get(email.trim().toLowerCase()) || null;
  }

  getUserById(id) {
    if (!id) return null;
    return this.usersById.get(id) || null;
  }

  getEmployeeById(id) {
    if (!id) return null;
    return this.employeesById.get(id) || null;
  }

  getAllEmployees(companyId) {
    const list = Array.from(this.employeesById.values());
    if (companyId) {
      return list.filter(e => e.company_id === companyId);
    }
    return list;
  }

  saveProject(project) {
    const idx = this.projects.findIndex(p => p.id === project.id);
    if (idx !== -1) {
      this.projects[idx] = { ...this.projects[idx], ...project, updated_at: new Date().toISOString() };
    } else {
      this.projects.unshift({
        ...project,
        created_at: project.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    this.saveToDisk();
    return project;
  }

  getProjects(companyId) {
    if (!companyId) return this.projects;
    return this.projects.filter(p => p.company_id === companyId || !p.company_id);
  }

  saveTask(task) {
    const idx = this.tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) {
      this.tasks[idx] = { ...this.tasks[idx], ...task, updated_at: new Date().toISOString() };
    } else {
      this.tasks.unshift({
        ...task,
        created_at: task.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    this.saveToDisk();
    return task;
  }

  getTasks(companyId, filter = {}) {
    let list = companyId ? this.tasks.filter(t => t.company_id === companyId || !t.company_id) : [...this.tasks];
    if (filter.projectId) list = list.filter(t => t.project_id === filter.projectId);
    if (filter.assigneeId) list = list.filter(t => t.assignee_id === filter.assigneeId);
    if (filter.status) list = list.filter(t => t.status === filter.status);
    return list;
  }
}

export const userStore = new UserStore();
