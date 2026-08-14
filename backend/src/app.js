import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { validateEnv } from './lib/validateEnv.js';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import teamRoutes from './routes/teams.js';
import meetingRoutes from './routes/meetings.js';
import aiRoutes from './routes/ai.js';
import contributionRoutes from './routes/contributions.js';
import historyRoutes from './routes/history.js';
import skillRoutes from './routes/skills.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();
validateEnv();

const app = express();

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

// Error handler
app.use(errorHandler);

export default app;
