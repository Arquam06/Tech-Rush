import { supabase } from '../lib/supabase.js';
import { recordHistory } from './historyService.js';

export async function awardContributionPoints({ companyId, employeeId, task, event }) {
  try {
    // Calculate points based on task properties
    let basePoints = 50;
    const reasons = [];

    // Complexity multiplier
    if (task.complexity === 'high') { basePoints += 80; reasons.push('High complexity (+80)'); }
    else if (task.complexity === 'medium') { basePoints += 30; reasons.push('Medium complexity (+30)'); }
    else { reasons.push('Standard complexity (+0)'); }

    // Priority bonus
    if (task.priority === 'critical') { basePoints += 100; reasons.push('Critical priority (+100)'); }
    else if (task.priority === 'high') { basePoints += 50; reasons.push('High priority (+50)'); }

    // On-time delivery
    if (task.due_date && task.completed_at) {
      const onTime = new Date(task.completed_at) <= new Date(task.due_date);
      if (onTime) { basePoints += 60; reasons.push('On-time delivery (+60)'); }
    }

    const points = basePoints;

    // Upsert contribution record
    const { data: existing } = await supabase.from('contributions').select('id, total_points').eq('employee_id', employeeId).eq('company_id', companyId).single();

    if (existing) {
      await supabase.from('contributions').update({ total_points: existing.total_points + points, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('contributions').insert({ employee_id: employeeId, company_id: companyId, total_points: points });
    }

    // Record event
    const { data: contrib } = await supabase.from('contributions').select('id').eq('employee_id', employeeId).eq('company_id', companyId).single();
    if (contrib) {
      await supabase.from('contribution_events').insert({
        contribution_id: contrib.id,
        event_type: event,
        points,
        description: `Task "${task.title}" completed. ${reasons.join(', ')}`,
        task_id: task.id,
        company_id: companyId,
      });
    }

    await recordHistory({
      companyId,
      action: 'points_awarded',
      entityType: 'contribution',
      entityId: employeeId,
      newState: { points, reasons, totalPoints: (existing?.total_points || 0) + points },
      description: `+${points} contribution points awarded for completing "${task.title}".`,
    });

    // Check reward unlocks
    await checkRewardUnlocks(companyId, employeeId, (existing?.total_points || 0) + points);

    return { points, reasons };
  } catch (err) {
    console.error('Contribution points error:', err.message);
  }
}

async function checkRewardUnlocks(companyId, employeeId, totalPoints) {
  const { data: rewards } = await supabase.from('rewards').select('*').eq('company_id', companyId).eq('is_active', true).lte('points_required', totalPoints);
  const { data: existing } = await supabase.from('reward_redemptions').select('reward_id').eq('employee_id', employeeId).eq('company_id', companyId);
  const existingIds = new Set((existing || []).map(r => r.reward_id));
  for (const reward of (rewards || [])) {
    if (!existingIds.has(reward.id)) {
      await supabase.from('notifications').insert({ employee_id: employeeId, company_id: companyId, type: 'reward_unlocked', title: '🎉 Reward Unlocked!', message: `You've unlocked: ${reward.title}`, data: { reward_id: reward.id } });
    }
  }
}
