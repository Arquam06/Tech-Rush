import { generateStructuredResponse } from '../lib/gemini.js';
import { supabase } from '../lib/supabase.js';

export async function analyzeMeeting(transcript, meetingId, companyId) {
  try {
    // Get employees for name matching
    const { data: employees } = await supabase.from('employees').select('id, first_name, last_name').eq('company_id', companyId);
    const employeeList = (employees || []).map(e => `${e.first_name} ${e.last_name} (id: ${e.id})`).join(', ');

    const prompt = `
You are an AI workplace assistant analyzing a meeting transcript.
Team members: ${employeeList}

Transcript:
${transcript}

Extract the following as JSON:
{
  "summary": "2-3 sentence meeting summary",
  "decisions": ["decision 1", "decision 2"],
  "actionItems": [
    {
      "title": "task title",
      "description": "details",
      "owner": "person name or null",
      "ownerId": "employee uuid or null if not found",
      "dueDate": "ISO date or null",
      "estimatedHours": 4
    }
  ],
  "risks": [
    { "description": "risk description", "severity": "high|medium|low" }
  ],
  "unresolvedQuestions": ["question 1"],
  "keyTopics": ["topic 1"]
}
`;

    const result = await generateStructuredResponse(prompt);

    // Save decisions
    if (result.decisions?.length) {
      await supabase.from('meeting_decisions').insert(
        result.decisions.map(d => ({ meeting_id: meetingId, decision: d, company_id: companyId }))
      );
    }

    // Update meeting with summary
    await supabase.from('meetings').update({
      ai_summary: result.summary,
      status: 'completed',
      updated_at: new Date().toISOString(),
    }).eq('id', meetingId);

    return result;
  } catch (err) {
    console.error('Meeting AI analysis error:', err.message);
    return {
      summary: 'Analysis unavailable.',
      decisions: [],
      actionItems: [],
      risks: [],
      unresolvedQuestions: [],
      keyTopics: [],
      error: err.message,
    };
  }
}
