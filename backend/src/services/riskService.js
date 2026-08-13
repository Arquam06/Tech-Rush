import { supabase } from '../lib/supabase.js';

export async function computeProjectRisk(projectId, companyId) {
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('end_date, status, priority')
      .eq('id', projectId)
      .eq('company_id', companyId)
      .single();

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status, due_date, priority, complexity, assignee_id, estimated_hours')
      .eq('project_id', projectId)
      .eq('company_id', companyId);

    const { data: deps } = await supabase
      .from('task_dependencies')
      .select('task_id, depends_on_id, tasks!task_dependencies_task_id_fkey(status), tasks!task_dependencies_depends_on_id_fkey(status, due_date)')
      .eq('company_id', companyId);

    if (!tasks || tasks.length === 0) return { score: 0, level: 'low', factors: [] };

    const now = new Date();
    const factors = [];
    let riskScore = 0;

    // Factor 1: Project deadline proximity
    if (project?.end_date) {
      const daysToEnd = (new Date(project.end_date) - now) / (1000 * 60 * 60 * 24);
      const incompleteTasks = tasks.filter(t => t.status !== 'done').length;
      const completionRate = 1 - (incompleteTasks / tasks.length);
      if (daysToEnd < 0) {
        riskScore += 35;
        factors.push({ factor: 'Deadline passed', impact: 35, severity: 'critical' });
      } else if (daysToEnd < 3 && completionRate < 0.8) {
        riskScore += 28;
        factors.push({ factor: `Only ${Math.round(daysToEnd)} days left with ${Math.round((1-completionRate)*100)}% tasks incomplete`, impact: 28, severity: 'high' });
      } else if (daysToEnd < 7 && completionRate < 0.6) {
        riskScore += 18;
        factors.push({ factor: 'Project behind schedule', impact: 18, severity: 'medium' });
      }
    }

    // Factor 2: Unassigned tasks
    const unassigned = tasks.filter(t => !t.assignee_id && t.status !== 'done').length;
    if (unassigned > 0) {
      const unassignedRisk = Math.min(unassigned * 8, 24);
      riskScore += unassignedRisk;
      factors.push({ factor: `${unassigned} task(s) unassigned`, impact: unassignedRisk, severity: unassigned > 2 ? 'high' : 'medium' });
    }

    // Factor 3: Overdue tasks
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length;
    if (overdue > 0) {
      const overdueRisk = Math.min(overdue * 10, 30);
      riskScore += overdueRisk;
      factors.push({ factor: `${overdue} overdue task(s)`, impact: overdueRisk, severity: 'high' });
    }

    // Factor 4: Dependency chain risk
    if (deps) {
      const projectTaskIds = new Set(tasks.map(t => t.id));
      const blockedDeps = deps.filter(d => {
        const blockerDone = d['tasks!task_dependencies_depends_on_id_fkey']?.status === 'done';
        const mainInProject = projectTaskIds.has(d.task_id);
        return mainInProject && !blockerDone;
      });
      if (blockedDeps.length > 0) {
        const depRisk = Math.min(blockedDeps.length * 7, 21);
        riskScore += depRisk;
        factors.push({ factor: `${blockedDeps.length} blocked dependency chain(s)`, impact: depRisk, severity: 'medium' });
      }
    }

    // Factor 5: High complexity incomplete tasks
    const highComplexIncomplete = tasks.filter(t => t.complexity === 'high' && t.status !== 'done').length;
    if (highComplexIncomplete > 0) {
      const complexRisk = Math.min(highComplexIncomplete * 5, 15);
      riskScore += complexRisk;
      factors.push({ factor: `${highComplexIncomplete} high-complexity task(s) pending`, impact: complexRisk, severity: 'medium' });
    }

    const finalScore = Math.min(Math.round(riskScore), 100);
    return {
      score: finalScore,
      level: finalScore >= 70 ? 'critical' : finalScore >= 45 ? 'high' : finalScore >= 25 ? 'medium' : 'low',
      factors,
      summary: `Risk score ${finalScore}/100 based on ${factors.length} factor(s)`,
    };
  } catch (err) {
    console.error('Risk computation error:', err.message);
    return { score: 0, level: 'unknown', factors: [] };
  }
}

export async function computeDependencyRisk(taskId, companyId) {
  try {
    // Find all downstream tasks (tasks that depend on this task)
    const { data: downstream } = await supabase
      .from('task_dependencies')
      .select('task_id, tasks!task_dependencies_task_id_fkey(id, title, status, due_date, assignee_id)')
      .eq('depends_on_id', taskId)
      .eq('company_id', companyId);
    // Find all upstream tasks (tasks this task depends on)
    const { data: upstream } = await supabase
      .from('task_dependencies')
      .select('depends_on_id, tasks!task_dependencies_depends_on_id_fkey(id, title, status, due_date)')
      .eq('task_id', taskId)
      .eq('company_id', companyId);
    return { downstream: downstream || [], upstream: upstream || [] };
  } catch (err) {
    return { downstream: [], upstream: [] };
  }
}
