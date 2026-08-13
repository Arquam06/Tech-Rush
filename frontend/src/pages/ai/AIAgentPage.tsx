import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Zap, AlertTriangle, RefreshCw, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import api from '../../lib/api'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
  type?: 'text' | 'simulation' | 'recovery'
  data?: any
}

const SUGGESTED = [
  'Who is overloaded right now?',
  'Which project is most at risk?',
  'What should I prioritize today?',
  'Show me all blocked tasks',
  'How can I recover the at-risk project?',
  'Who is the best person for a React task?',
]

export default function AIAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0', role: 'ai', content:
        '👋 Hi! I am your **AI Workplace Agent**.\n\nI have access to your company\'s real data — projects, tasks, employees, workloads, and history.\n\nAsk me anything about your workplace, or try a suggestion below.',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [simLoading, setSimLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      const res = await api.post('/ai/chat', { message: msg, conversationHistory: history })
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: res.data.response, timestamp: new Date() }
      setMessages(prev => [...prev, aiMsg])
    } catch (err: any) {
      toast.error('AI agent unavailable. Check your GEMINI_API_KEY.')
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'ai',
        content: '⚠️ I could not connect to the AI service. Please check that GEMINI_API_KEY is configured.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const runRecovery = async (projectId: string) => {
    setLoading(true)
    try {
      const res = await api.post('/ai/recovery-plan', { projectId })
      const { plan, currentRisk } = res.data
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'ai', type: 'recovery', timestamp: new Date(),
        content: `📊 **Recovery Plan Generated**\n\n${plan.summary}`,
        data: { plan, currentRisk, projectId },
      }])
    } catch (err) {
      toast.error('Failed to generate recovery plan')
    } finally {
      setLoading(false)
    }
  }

  const applyRecovery = async (decisionId: string, actions: any[]) => {
    try {
      await api.post('/ai/apply-action', { decisionId, actions })
      toast.success('Recovery plan applied!')
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'ai', timestamp: new Date(),
        content: '✅ Recovery plan applied. The task assignments and priorities have been updated. History has been recorded.',
      }])
    } catch (err) {
      toast.error('Failed to apply recovery plan')
    }
  }

  const renderMessageContent = (msg: Message) => {
    if (msg.type === 'recovery' && msg.data) {
      const { plan, currentRisk, projectId } = msg.data
      return (
        <div>
          <p style={{ marginBottom: '12px', fontSize: '13px' }}>{plan.summary}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-danger)' }}>{currentRisk?.score || '?'}%</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Current Risk</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--color-success-bg)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-success)' }}>{plan.estimatedNewRisk || '?'}%</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>After Recovery</div>
            </div>
          </div>
          {plan.actions?.map((action: any, i: number) => (
            <div key={i} style={{ padding: '10px', background: 'var(--color-bg-card)', borderRadius: '8px', marginBottom: '6px', fontSize: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '2px', textTransform: 'capitalize' }}>{action.type}: {action.description}</div>
              <div style={{ color: 'var(--color-text-muted)' }}>{action.reason}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => applyRecovery('', plan.actions || [])}>
              <CheckCircle size={13} /> Apply Recovery Plan
            </button>
            <button className="btn btn-ghost btn-sm">
              <XCircle size={13} /> Cancel
            </button>
          </div>
        </div>
      )
    }

    // Format markdown-like content
    const formatted = msg.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />
  }

  const atRiskProjects = projects.filter((p: any) => p.risk?.score >= 45)

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 56px - 48px)', display: 'flex', gap: '20px' }}>
      {/* Main Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', minWidth: 0 }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px 12px 0 0',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>AI Workplace Agent</div>
            <div style={{ fontSize: '11px', color: 'var(--color-success)' }}>● Connected — Gemini 1.5 Flash</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px',
          background: 'var(--color-bg-base)',
          border: '1px solid var(--color-border)',
          borderTop: 'none',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px' }}>
              {msg.role === 'ai' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={10} color="white" />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>AI Agent</span>
                </div>
              )}
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={{ lineHeight: 1.6 }}>
                {renderMessageContent(msg)}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={10} color="white" />
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)', animation: `pulse-glow 1s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderTop: 'none',
            display: 'flex', gap: '8px', flexWrap: 'wrap',
          }}>
            {SUGGESTED.map(s => (
              <button key={s} className="badge badge-primary" style={{ cursor: 'pointer', padding: '5px 10px', fontSize: '12px' }} onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '12px 16px',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          display: 'flex', gap: '10px', alignItems: 'flex-end',
        }}>
          <textarea
            className="input"
            placeholder="Ask about your workplace..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={loading}
            rows={2}
            style={{ resize: 'none', flex: 1, fontSize: '13px', lineHeight: 1.5 }}
          />
          <button className="btn btn-primary btn-icon" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ height: '60px', width: '44px' }}>
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Right Panel — Quick Actions */}
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
        {atRiskProjects.length > 0 && (
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} color="var(--color-danger)" /> Projects At Risk
            </div>
            {atRiskProjects.map((p: any) => (
              <div key={p.id} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{p.title}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>{p.risk?.score}%</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: '6px' }}>
                  <div className="progress-fill danger" style={{ width: `${p.risk?.score}%` }} />
                </div>
                <button className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => runRecovery(p.id)}>
                  <RefreshCw size={12} /> Generate Recovery Plan
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {SUGGESTED.map(s => (
              <button key={s} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '12px', height: 'auto', padding: '7px 10px', whiteSpace: 'normal', lineHeight: 1.4 }} onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
