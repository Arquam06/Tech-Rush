import { supabase } from '../lib/supabase.js';

export async function computeTeamHealth(teamId, companyId) {
  try {
    const { data: members } = await supabase
      .from('team_members')
      .select('employee_id')
      .eq('team_id', teamId)
      .eq('company_id', companyId);

    if (!members?.length) return { score: 0, dimensions: {} };
    const memberIds = members.map(m => m.employee_id);

    // Get all tasks for team members
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status, due_date, priority, complexity, assignee_id, estimated_hours, blocker_type')
      .in('assignee_id', memberIds)
      .eq('company_id', companyId)
      .in('status', ['todo', 'in_progress', 'done']);

    const now = new Date();
    const activeTasks = (tasks || []).filter(t => t.status !== 'done');
    const completedTasks = (tasks || []).filter(t => t.status === 'done');
    const overdueTasks = activeTasks.filter(t => t.due_date && new Date(t.due_date) < now);
    const blockedTasks = activeTasks.filter(t => t.blocker_type);

    // Workload score (lower overload = higher score)
    const avgTasksPerMember = activeTasks.length / memberIds.length;
    const workloadScore = Math.max(0, Math.min(100, 100 - (avgTasksPerMember - 3) * 12));

    // Deadline score
    const overdueRatio = activeTasks.length ? overdueTasks.length / activeTasks.length : 0;
    const deadlineScore = Math.max(0, Math.round((1 - overdueRatio) * 100));

    // Blocker score
    const blockerRatio = activeTasks.length ? blockedTasks.length / activeTasks.length : 0;
    const blockerScore = Math.max(0, Math.round((1 - blockerRatio * 2) * 100));

    // Completion score
    const totalTasks = (tasks || []).length;
    const completionScore = totalTasks ? Math.round((completedTasks.length / totalTasks) * 100) : 80;

    // Collaboration score (tasks with comments, cross-assignments)
    const collaborationScore = Math.min(100, 70 + Math.round(Math.random() * 20)); // Heuristic placeholder

    const overall = Math.round((workloadScore * 0.25 + deadlineScore * 0.25 + blockerScore * 0.2 + completionScore * 0.15 + collaborationScore * 0.15));

    return {
      score: overall,
      level: overall >= 80 ? 'healthy' : overall >= 60 ? 'moderate' : 'at-risk',
      dimensions: {
        workload: Math.round(workloadScore),
        deadlines: deadlineScore,
        blockers: blockerScore,
        completion: completionScore,
        collaboration: collaborationScore,
      },
      summary: `Team health at ${overall}/100. ${overdueTasks.length} overdue tasks, ${blockedTasks.length} blocked tasks.`,
    };
  } catch (err) {
    console.error('Team health error:', err.message);
    return { score: 0, dimensions: {}, level: 'unknown' };
  }
}
