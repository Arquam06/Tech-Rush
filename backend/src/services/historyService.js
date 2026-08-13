import { supabase } from '../lib/supabase.js';

export async function recordHistory({
  companyId, actorId, action, entityType, entityId,
  previousState = null, newState = null, description = '',
  why = null, projectId = null,
}) {
  try {
    await supabase.from('audit_logs').insert({
      company_id: companyId,
      actor_id: actorId || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      previous_state: previousState,
      new_state: newState,
      description,
      why,
      project_id: projectId || null,
    });
  } catch (err) {
    // Never let history recording crash the main flow
    console.error('History recording error:', err.message);
  }
}
