import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || 'placeholder-gemini-key';
const genAI = new GoogleGenerativeAI(apiKey);

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 2048,
  },
});

export async function generateAIResponse(prompt) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key' || process.env.GEMINI_API_KEY.includes('your')) {
    return '🤖 [AI Agent Demo Mode] Gemini API key not configured. Please add your GEMINI_API_KEY to backend/.env to enable live Gemini AI responses.';
  }
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error.message);
    return `🤖 [AI Agent Fallback] AI generation notice: ${error.message}`;
  }
}

export async function generateStructuredResponse(prompt) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key' || process.env.GEMINI_API_KEY.includes('your')) {
    return {
      summary: 'AI Workplace Agent analysis ready. Configured key required for full live Gemini inferences.',
      decisions: ['Prioritize high-impact tasks', 'Rebalance workload from overloaded team members'],
      actionItems: [{ title: 'Review project risks', owner: 'Team Lead', estimatedHours: 2 }],
      risks: [{ description: 'High workload on senior engineers', severity: 'high' }],
      unresolvedQuestions: [],
      keyTopics: ['Workload', 'Risk Management'],
      urgency: 'high',
      actions: [],
      recommendedEmployeeId: null,
      confidence: 90,
      reasons: ['Workload balance analysis', 'Skill matching heuristics']
    };
  }
  const structuredPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no code blocks, just pure JSON.`;
  const text = await generateAIResponse(structuredPrompt);
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse AI JSON response:', text);
    throw new Error('AI returned invalid JSON');
  }
}
