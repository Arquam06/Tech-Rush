import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mic, MicOff, Video, VideoOff, Phone, MessageSquare, Send, Bot, CheckCircle, XCircle, ChevronLeft } from 'lucide-react'
import api from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function MeetingRoomPage() {
  const { id } = useParams<{ id: string }>()
  const { employee } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [audioOn, setAudioOn] = useState(true)
  const [videoOn, setVideoOn] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [chatMsg, setChatMsg] = useState('')
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [inRoom, setInRoom] = useState(false)

  const { data: meeting } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => api.get(`/meetings/${id}`).then(r => r.data)
  })

  const analyzeTranscript = useMutation({
    mutationFn: (transcriptText: string) => api.post(`/meetings/${id}/transcript`, { transcript: transcriptText }),
    onSuccess: (res) => { setAiAnalysis(res.data); qc.invalidateQueries({ queryKey: ['meeting', id] }) }
  })

  const confirmActionItems = useMutation({
    mutationFn: (items: any[]) => api.post(`/meetings/${id}/action-items`, { actionItems: items }),
    onSuccess: () => { toast.success('Action items saved and tasks created!'); setAiAnalysis(null) }
  })

  const joinRoom = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoOn, audio: audioOn })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setInRoom(true)
      // Update meeting status
      await api.patch(`/meetings/${id}`, { status: 'live' })
      toast.success('Joined meeting room!')
    } catch (err) {
      // Media not available in demo
      setInRoom(true)
      toast('Demo mode — camera/mic not available in this environment', { icon: 'ℹ️' })
    }
  }

  const handleAnalyze = async () => {
    if (!transcript.trim()) { toast.error('Please enter a meeting transcript'); return }
    setAnalyzing(true)
    try {
      await analyzeTranscript.mutateAsync(transcript)
    } finally { setAnalyzing(false) }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0', height: 'calc(100vh - 56px - 48px)' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/meetings')} style={{ alignSelf: 'flex-start', marginBottom: '12px' }}>
        <ChevronLeft size={14} /> All Meetings
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: aiAnalysis || showTranscript ? '1fr 400px' : '1fr', gap: '16px', flex: 1, overflow: 'hidden' }}>
        {/* Main Room */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', flex: 1, position: 'relative', overflow: 'hidden', minHeight: '300px' }}>
            {!inRoom ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{meeting?.title || 'Meeting Room'}</div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>
                  Ready to join? Your camera and microphone will be requested.
                </p>
                <button className="btn btn-primary btn-lg" onClick={joinRoom}>
                  <Video size={16} /> Join Meeting
                </button>
              </div>
            ) : (
              <>
                <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: 'white', fontWeight: 600 }}>
                  {meeting?.title}
                </div>
                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                  <span className="badge" style={{ background: '#10b98140', color: '#10b981', border: '1px solid #10b98160' }}>● LIVE</span>
                </div>
                <video ref={videoRef} muted style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                {/* Self video placeholder */}
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '120px', height: '90px', background: 'var(--color-bg-elevated)', borderRadius: '8px', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="avatar">{employee?.first_name?.[0]}{employee?.last_name?.[0]}</div>
                </div>
              </>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '12px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
            <button className={`btn ${audioOn ? 'btn-secondary' : 'btn-danger'} btn-icon`} onClick={() => setAudioOn(!audioOn)} title={audioOn ? 'Mute' : 'Unmute'}>
              {audioOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button className={`btn ${videoOn ? 'btn-secondary' : 'btn-danger'} btn-icon`} onClick={() => setVideoOn(!videoOn)} title={videoOn ? 'Stop Video' : 'Start Video'}>
              {videoOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            <button className={`btn ${showChat ? 'btn-primary' : 'btn-secondary'} btn-icon`} onClick={() => setShowChat(!showChat)} title="Meeting Chat">
              <MessageSquare size={18} />
            </button>
            <button className={`btn ${showTranscript ? 'btn-primary' : 'btn-secondary'} btn-icon`} onClick={() => setShowTranscript(!showTranscript)} title="AI Transcript">
              <Bot size={18} />
            </button>
            <div style={{ width: '1px', height: '28px', background: 'var(--color-border)', margin: '0 4px' }} />
            <button className="btn btn-danger btn-sm" onClick={() => navigate('/meetings')} title="Leave Meeting">
              <Phone size={14} /> Leave
            </button>
          </div>
        </div>

        {/* Right Panel */}
        {(showTranscript || aiAnalysis) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {!aiAnalysis ? (
              <div className="card" style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={16} color="var(--color-primary)" /> Meeting Intelligence
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>Paste the meeting transcript and AI will extract decisions, action items, risks, and create tasks.</p>
                <textarea
                  className="input"
                  placeholder="Paste meeting transcript here...\n\nExample:\nArquam: We need to complete the API integration by Friday.\nRahul: I'll handle the authentication module.\nManager: Let's move the database migration to next sprint."
                  rows={8}
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  style={{ resize: 'vertical', fontSize: '12px', lineHeight: 1.5, marginBottom: '12px' }}
                />
                <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing} style={{ width: '100%', justifyContent: 'center' }}>
                  {analyzing ? 'Analyzing with AI...' : '🤖 Analyze with AI'}
                </button>
                {meeting?.ai_summary && (
                  <div style={{ marginTop: '14px', padding: '12px', background: 'var(--color-primary-glow)', border: '1px solid var(--color-border-accent)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary-light)', marginBottom: '6px', textTransform: 'uppercase' }}>Previous Summary</div>
                    <div style={{ fontSize: '12px' }}>{meeting.ai_summary}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '14px', color: 'var(--color-success)' }}>✓ AI Analysis Complete</div>
                {aiAnalysis.summary && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Summary</div>
                    <p style={{ fontSize: '12px', lineHeight: 1.5 }}>{aiAnalysis.summary}</p>
                  </div>
                )}
                {aiAnalysis.decisions?.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Decisions ({aiAnalysis.decisions.length})</div>
                    {aiAnalysis.decisions.map((d: string, i: number) => <div key={i} style={{ fontSize: '12px', padding: '6px 8px', background: 'var(--color-bg-elevated)', borderRadius: '6px', marginBottom: '4px' }}>{d}</div>)}
                  </div>
                )}
                {aiAnalysis.actionItems?.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Action Items ({aiAnalysis.actionItems.length})</div>
                    {aiAnalysis.actionItems.map((item: any, i: number) => (
                      <div key={i} style={{ padding: '8px', background: 'var(--color-bg-elevated)', borderRadius: '6px', marginBottom: '6px', fontSize: '12px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{item.title}</div>
                        {item.owner && <div style={{ color: 'var(--color-text-muted)' }}>Owner: {item.owner}</div>}
                        {item.dueDate && <div style={{ color: 'var(--color-warning)' }}>Due: {item.dueDate}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {aiAnalysis.risks?.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase', marginBottom: '6px' }}>Risks Detected</div>
                    {aiAnalysis.risks.map((r: any, i: number) => <div key={i} style={{ fontSize: '12px', padding: '6px 8px', background: 'var(--color-danger-bg)', borderRadius: '6px', marginBottom: '4px' }}>{r.description}</div>)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => confirmActionItems.mutate(aiAnalysis.actionItems || [])} disabled={confirmActionItems.isPending} style={{ flex: 1, justifyContent: 'center' }}>
                    <CheckCircle size={12} /> Save & Create Tasks
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setAiAnalysis(null)}><XCircle size={12} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
