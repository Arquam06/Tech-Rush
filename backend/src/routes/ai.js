import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { generateAIResponse, generateStructuredResponse } from '../lib/gemini.js';
import { computeProjectRisk } from '../services/riskService.js';
import { recordHistory } from '../services/historyService.js';

const router = Router();

// Build company context for AI
async function buildCompanyContext(companyId) {
  const [employees, projects, tasks, teams] = await Promise.all([
    supabase.from('employees').select('id, first_name, last_name, title, role').eq('company_id', companyId).eq('is_active', true),
    supabase.from('projects').select('id, title, status, priority, end_date').eq('company_id', companyId),
    supabase.from('tasks').select('id, title, status, priority, complexity, due_date, assignee_id, project_id, estimated_hours, blocker_type').eq('company_id', companyId).neq('status', 'done').limit(100),
    supabase.from('teams').select('id, name').eq('company_id', companyId),
  ]);
  return {
    employees: employees.data || [],
    projects: projects.data || [],
    tasks: tasks.data || [],
    teams: teams.data || [],
  };
}

// POST /api/ai/chat
router.post('/chat', async (req, res, next) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const ctx = await buildCompanyContext(req.companyId);

    const systemContext = `
You are the AI Workplace Agent for this company. You have access to real company data.
Answer questions based ONLY on the provided data. If data is unavailable, say so.

COMPANY DATA:
Employees (${ctx.employees.length}): ${JSON.stringify(ctx.employees)}
Projects (${ctx.projects.length}): ${JSON.stringify(ctx.projects)}
Active Tasks (${ctx.tasks.length}): ${JSON.stringify(ctx.tasks)}
Teams (${ctx.teams.length}): ${JSON.stringify(ctx.teams)}

Current date: ${new Date().toISOString()}

You can:
- Analyze workload, risks, deadlines
- Recommend task assignments
- Identify bottlenecks
- Explain project status
- Suggest priorities
- Answer questions about the workplace data

Always be specific, concise, and reference actual data. Never invent data.
`;

    const history = conversationHistory.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
    const fullPrompt = `${systemContext}\n\nConversation:\n${history}\n\nUser: ${message}\nAI:`;

    const response = await generateAIResponse(fullPrompt);
    res.json({ response, context: { employeeCount: ctx.employees.length, projectCount: ctx.projects.length, taskCount: ctx.tasks.length } });
  } catch (err) { next(err); }
});

// POST /api/ai/recommend-assignment
router.post('/recommend-assignment', async (req, res, next) => {
  try {
    const { taskId } = req.body;
    const { data: task } = await supabase.from('tasks').select('*, projects(title)').eq('id', taskId).eq('company_id', req.companyId).single();
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { data: employees } = await supabase.from('employees').select('id, first_name, last_name, title, employee_skills(skill_name, proficiency)').eq('company_id', req.companyId).eq('is_active', true);
    const { data: workloads } = await supabase.from('tasks').select('assignee_id').eq('company_id', req.companyId).in('status', ['todo', 'in_progress']);

    const workloadMap = {};
    for (const w of (workloads || [])) {
      if (w.assignee_id) workloadMap[w.assignee_id] = (workloadMap[w.assignee_id] || 0) + 1;
    }

    const prompt = `
Task to assign: ${JSON.stringify(task)}
Available employees with skills: ${JSON.stringify(employees)}
Current active task counts per employee: ${JSON.stringify(workloadMap)}

Recommend the BEST employee to assign this task to.
Consider: skill match, current workload, task complexity, priority.

Return JSON:
{
  "recommendedEmployeeId": "uuid",
  "recommendedEmployeeName": "name",
  "confidence": 85,
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "alternatives": [
    { "employeeId": "uuid", "name": "name", "score": 70, "reason": "why" }
  ],
  "currentAssigneeWorkload": 0,
  "recommendedWorkload": 0,
  "riskReduction": 0
}
`;

    const result = await generateStructuredResponse(prompt);
    res.json({ task, recommendation: result });
  } catch (err) { next(err); }
});

// POST /api/ai/simulate
router.post('/simulate', async (req, res, next) => {
  try {
    const { taskId, newAssigneeId, newDeadline, newPriority } = req.body;
    if (!taskId) return res.status(400).json({ error: 'taskId required' });

    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).eq('company_id', req.companyId).single();
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Current state
    const { data: currentAssigneeTasks } = task.assignee_id ? await supabase.from('tasks').select('id').eq('assignee_id', task.assignee_id).eq('company_id', req.companyId).in('status', ['todo', 'in_progress']) : { data: [] };

    // Simulated state
    const { data: newAssigneeTasks } = newAssigneeId ? await supabase.from('tasks').select('id').eq('assignee_id', newAssigneeId).eq('company_id', req.companyId).in('status', ['todo', 'in_progress']) : { data: [] };

    const currentRisk = task.project_id ? await computeProjectRisk(task.project_id, req.companyId) : { score: 0 };

    // Simulate: if reassigned, reduce current workload by 1, increase new by 1
    const currentAssigneeLoad = (currentAssigneeTasks?.length || 0);
    const newAssigneeLoad = (newAssigneeTasks?.length || 0);

    const simulatedRiskReduction = newAssigneeId ? Math.min(30, Math.max(5, currentAssigneeLoad * 5 - newAssigneeLoad * 3)) : 0;
    const simulatedRisk = Math.max(0, currentRisk.score - simulatedRiskReduction);

    res.json({
      current: {
        task,
        assigneeWorkload: currentAssigneeLoad,
        projectRisk: currentRisk.score,
        projectRiskLevel: currentRisk.level,
      },
      simulated: {
        newAssigneeId,
        newAssigneeCurrentLoad: newAssigneeLoad,
        projectRisk: simulatedRisk,
        projectRiskReduction: simulatedRiskReduction,
        projectRiskLevel: simulatedRisk >= 70 ? 'critical' : simulatedRisk >= 45 ? 'high' : simulatedRisk >= 25 ? 'medium' : 'low',
      },
      factors: currentRisk.factors,
    });
  } catch (err) { next(err); }
});

// POST /api/ai/recovery-plan
router.post('/recovery-plan', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).eq('company_id', req.companyId).single();
    const { data: tasks } = await supabase.from('tasks').select('*, employees!tasks_assignee_id_fkey(first_name, last_name, employee_skills(skill_name, proficiency))').eq('project_id', projectId).eq('company_id', req.companyId);
    const { data: employees } = await supabase.from('employees').select('id, first_name, last_name, employee_skills(skill_name, proficiency)').eq('company_id', req.companyId).eq('is_active', true);
    const risk = await computeProjectRisk(projectId, req.companyId);

    const prompt = `
Project at risk: ${JSON.stringify(project)}
Current risk: ${JSON.stringify(risk)}
Tasks: ${JSON.stringify(tasks)}
Available team: ${JSON.stringify(employees)}

Generate a concrete recovery plan. Return JSON:
{
  "summary": "one sentence recovery strategy",
  "urgency": "critical|high|medium",
  "actions": [
    {
      "type": "reassign|reprioritize|remove_dependency|add_resource|scope_reduction",
      "description": "what to do",
      "taskId": "uuid or null",
      "fromEmployeeId": "uuid or null",
      "toEmployeeId": "uuid or null",
      "reason": "why this helps",
      "estimatedRiskReduction": 15
    }
  ],
  "estimatedNewRisk": 25,
  "projectedDaysRecovered": 2
}
`;

    const plan = await generateStructuredResponse(prompt);

    // Store the AI decision
    const { data: aiDecision } = await supabase.from('ai_decisions').insert({
      company_id: req.companyId,
      project_id: projectId,
      decision_type: 'recovery_plan',
      input_data: { project, risk, taskCount: tasks?.length },
      recommendation: plan,
      status: 'pending',
    }).select().single();

    res.json({ plan, decisionId: aiDecision?.id, currentRisk: risk });
  } catch (err) { next(err); }
});

// POST /api/ai/apply-action
router.post('/apply-action', async (req, res, next) => {
  try {
    const { decisionId, actions } = req.body;
    const results = [];

    for (const action of (actions || [])) {
      if (action.type === 'reassign' && action.taskId) {
        const { data: task } = await supabase.from('tasks').select().eq('id', action.taskId).eq('company_id', req.companyId).single();
        if (task) {
          await supabase.from('tasks').update({ assignee_id: action.toEmployeeId, updated_at: new Date().toISOString() }).eq('id', action.taskId);
          await recordHistory({
            companyId: req.companyId,
            actorId: req.employee?.id,
            action: 'task_reassigned',
            entityType: 'task',
            entityId: action.taskId,
            previousState: { assignee_id: task.assignee_id },
            newState: { assignee_id: action.toEmployeeId },
            description: `AI Recovery Plan: ${action.description}`,
            why: action.reason,
            projectId: task.project_id,
          });
          results.push({ action: action.type, taskId: action.taskId, success: true });
        }
      } else if (action.type === 'reprioritize' && action.taskId) {
        await supabase.from('tasks').update({ priority: 'critical', updated_at: new Date().toISOString() }).eq('id', action.taskId).eq('company_id', req.companyId);
        results.push({ action: action.type, taskId: action.taskId, success: true });
      }
    }

    if (decisionId) {
      await supabase.from('ai_decisions').update({ status: 'applied', applied_at: new Date().toISOString() }).eq('id', decisionId);
    }

    res.json({ results, message: `${results.length} action(s) applied successfully.` });
  } catch (err) { next(err); }
});

// POST /api/ai/what-if — pure simulation, no data changes
router.post('/what-if', async (req, res, next) => {
  try {
    const { scenario } = req.body;
    // scenario: { type: 'reassign'|'deadline_change'|'priority_change', ...params }
    const ctx = await buildCompanyContext(req.companyId);

    const prompt = `
Current company state:
${JSON.stringify(ctx)}

What-if scenario to simulate (DO NOT apply, just simulate):
${JSON.stringify(scenario)}

Current date: ${new Date().toISOString()}

Analyze the impact of this change. Return JSON:
{
  "scenarioDescription": "what was simulated",
  "before": {
    "workloadAffected": 0,
    "riskLevel": "medium",
    "riskScore": 50,
    "keyMetrics": {}
  },
  "after": {
    "workloadAffected": 0,
    "riskLevel": "low",
    "riskScore": 30,
    "keyMetrics": {}
  },
  "netImpact": "positive|negative|neutral",
  "recommendation": "apply|do_not_apply",
  "reasoning": ["reason 1", "reason 2"]
}
`;
    const result = await generateStructuredResponse(prompt);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
