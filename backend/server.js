import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { validateEnv } from './src/lib/validateEnv.js';
import authRoutes from './src/routes/auth.js';
import employeeRoutes from './src/routes/employees.js';
import projectRoutes from './src/routes/projects.js';
import taskRoutes from './src/routes/tasks.js';
import teamRoutes from './src/routes/teams.js';
import meetingRoutes from './src/routes/meetings.js';
import aiRoutes from './src/routes/ai.js';
import contributionRoutes from './src/routes/contributions.js';
import historyRoutes from './src/routes/history.js';
import skillRoutes from './src/routes/skills.js';
import notificationRoutes from './src/routes/notifications.js';
import adminRoutes from './src/routes/admin.js';
import { setupSocketHandlers } from './src/lib/socketHandlers.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { authMiddleware } from './src/middleware/auth.js';

dotenv.config();
validateEnv();

const app = express();
const httpServer = createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'https://tech-rush-frontend.onrender.com';

const allowedOrigins = [
  'https://tech-rush-frontend.onrender.com',
  'http://localhost:5173',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  frontendUrl,
].filter(Boolean);

const io = new SocketIO(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Workplace OS API',
    message: 'Backend operational',
    timestamp: new Date().toISOString(),
    frontend: frontendUrl,
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI Workplace OS API',
  });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require auth)
app.use('/api/employees', authMiddleware, employeeRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/teams', authMiddleware, teamRoutes);
app.use('/api/meetings', authMiddleware, meetingRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/contributions', authMiddleware, contributionRoutes);
app.use('/api/history', authMiddleware, historyRoutes);
app.use('/api/skills', authMiddleware, skillRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Socket.IO
setupSocketHandlers(io);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 AI Workplace OS API running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🌐 Allowed Frontend: ${frontendUrl}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Configured' : 'NOT configured'}`);
  console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL ? 'Configured' : 'NOT configured'}\n`);
});

export { io };
