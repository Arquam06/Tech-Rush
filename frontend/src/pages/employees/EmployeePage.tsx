import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'

export default function EmployeePage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', title: '', role: 'employee' })

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then(r => r.data)
  })

  const create = useMutation({
    mutationFn: (d: any) => api.post('/employees', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      setShowCreate(false)
      setForm({ email: '', password: '', firstName: '', lastName: '', title: '', role: 'employee' })
      toast.success('Employee added!')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to add employee')
  })

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Employees</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{employees.length} active employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Add Employee
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: 'none', borderRadius: '12px' }}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Title</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center' }}>
                    <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid var(--color-border)', borderTop: '2px solid var(--color-primary)', borderRadius: '50%', margin: '0 auto' }} />
                  </td>
                </tr>
              ) : employees.map((e: any) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar">{e.first_name?.[0]}{e.last_name?.[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{e.first_name} {e.last_name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{e.title || '—'}</td>
                  <td>
                    <span className={`badge badge-${e.role === 'admin' ? 'danger' : e.role === 'manager' ? 'warning' : e.role === 'hr' ? 'info' : 'muted'}`}>
                      {e.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{e.departments?.name || '—'}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{e.email}</td>
                </tr>
              ))}
              {!isLoading && employees.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No employees yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Employee">
        <form
          onSubmit={e => {
            e.preventDefault()
            create.mutate({
              email: form.email,
              password: form.password,
              firstName: form.firstName,
              lastName: form.lastName,
              title: form.title,
              role: form.role
            })
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">First Name *</label>
              <input className="input" required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Alex" />
            </div>
            <div className="input-group">
              <label className="input-label">Last Name *</label>
              <input className="input" required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Smith" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Email *</label>
            <input className="input" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="alex@company.com" />
          </div>
          <div className="input-group">
            <label className="input-label">Password *</label>
            <input className="input" type="password" required minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min. 6 characters" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Job Title</label>
              <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Software Engineer" />
            </div>
            <div className="input-group">
              <label className="input-label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
