// Centralized User and Employee store for backend authentication

class UserStore {
  constructor() {
    this.usersByEmail = new Map();
    this.usersById = new Map();
    this.employeesById = new Map();
    this.companiesById = new Map();
  }

  saveUser({ id, email, password, firstName, lastName, companyName, companyId, role, title }) {
    const cleanEmail = email.trim().toLowerCase();
    const userId = id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const empId = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const compId = companyId || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const company = {
      id: compId,
      name: companyName || 'My Company',
      slug: (companyName || 'my-company').toLowerCase().replace(/\s+/g, '-'),
    };
    this.companiesById.set(compId, company);

    const employee = {
      id: empId,
      company_id: compId,
      user_id: userId,
      email: cleanEmail,
      first_name: firstName,
      last_name: lastName,
      role: role || 'admin',
      title: title || (role === 'admin' ? 'Administrator' : 'Team Member'),
      is_active: true,
      companies: company,
    };
    this.employeesById.set(empId, employee);

    const userData = {
      id: userId,
      email: cleanEmail,
      password,
      firstName,
      lastName,
      role: role || 'admin',
      companyName: company.name,
      companyId: compId,
      employee,
    };

    this.usersByEmail.set(cleanEmail, userData);
    this.usersById.set(userId, userData);

    console.log(`👤 [UserStore] User saved: "${firstName} ${lastName}" (${cleanEmail}), Role: ${role}, Company: "${company.name}"`);
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
}

export const userStore = new UserStore();
