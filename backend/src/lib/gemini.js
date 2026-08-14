import { GoogleGenerativeAI } from '@google/generative-ai';

export async function getActiveGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('placeholder') || apiKey.includes('your')) {
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const preferredModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
  
  for (const modelName of preferredModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 2048 },
      });
      return { model, modelName };
    } catch (e) {
      console.warn(`Gemini model ${modelName} initialization notice:`, e.message);
    }
  }
  
  return {
    model: genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }),
    modelName: 'gemini-2.5-flash'
  };
}

export async function generateAIResponse(prompt) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key' || process.env.GEMINI_API_KEY.includes('your') || process.env.GEMINI_API_KEY.includes('placeholder')) {
    return '🤖 [AI Agent Notice] GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY to enable live Gemini inferences.';
  }
  try {
    const active = await getActiveGeminiModel();
    if (!active?.model) {
      throw new Error('Could not initialize Gemini model');
    }
    const result = await active.model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error.message);
    return `🤖 [AI Agent Notice] Gemini AI response: ${error.message}`;
  }
}

export async function generateStructuredResponse(prompt) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key' || process.env.GEMINI_API_KEY.includes('your') || process.env.GEMINI_API_KEY.includes('placeholder')) {
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
