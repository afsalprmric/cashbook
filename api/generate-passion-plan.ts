import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// Request Validation Schema
const PassionPlanRequestSchema = z.object({
  goal: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(600),
    reason: z.string().min(2).max(600),
    targetAmount: z.number().positive(),
    currentSaved: z.number().nonnegative(),
    desiredMonths: z.number().int().min(1).max(240),
    isTargetFlexible: z.boolean()
  }),
  financialSummary: z.object({
    averageMonthlyIncome: z.number().nonnegative(),
    averageMonthlyExpense: z.number().nonnegative(),
    averageMonthlySurplus: z.number(),
    safeMonthlyContribution: z.number().nonnegative(),
    topExpenseCategories: z.array(
      z.object({
        categoryName: z.string().min(1).max(100),
        monthlyAverage: z.number().nonnegative()
      })
    ).max(10),
    selectedFlexibleCategories: z.array(
      z.object({
        categoryName: z.string().min(1).max(100),
        monthlyAverage: z.number().nonnegative()
      })
    ).max(10)
  }),
  verifiedMetrics: z.object({
    remainingAmount: z.number().nonnegative(),
    availableMonths: z.number().int().positive(),
    requiredMonthlyContribution: z.number().nonnegative(),
    simulatedMonthlyContribution: z.number().nonnegative(),
    fundingGapPerMonth: z.number().nonnegative(),
    estimatedCompletionMonths: z.number().int().positive().nullable(),
    feasibility: z.enum([
      'already_funded',
      'on_track',
      'challenging_but_possible',
      'currently_not_feasible'
    ])
  })
});

// Response Schema for Zod verification (post-processing)
const GeminiPassionPlanSchema = z.object({
  feasibility: z.enum([
    'already_funded',
    'on_track',
    'challenging_but_possible',
    'currently_not_feasible'
  ]),
  headline: z.string().min(5).max(140),
  summary: z.string().min(20).max(900),
  suggestedMonthlyContribution: z.number().nonnegative(),
  suggestions: z.array(
    z.object({
      title: z.string().min(2).max(100),
      category: z.string().min(1).max(100),
      action: z.string().min(5).max(300),
      estimatedMonthlyImpact: z.number().nonnegative(),
      reason: z.string().min(5).max(300)
    })
  ).min(2).max(5),
  milestones: z.array(
    z.object({
      percentage: z.number().min(1).max(100),
      label: z.string().min(2).max(100),
      targetAmount: z.number().nonnegative(),
      estimatedDate: z.string().optional()
    })
  ).min(3).max(5),
  firstWeekActions: z.array(
    z.string().min(3).max(200)
  ).min(3).max(5),
  encouragement: z.string().min(10).max(400)
});

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Abort timeout wrapper (15 seconds)
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request Timeout')), 15000)
  );

  try {
    const parseResult = PassionPlanRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid Request Body', details: parseResult.error.issues });
    }

    const { goal, financialSummary, verifiedMetrics } = parseResult.data;

    // Load API settings safely
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API Key is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are the planning intelligence inside PassionLedger AI.
Your job is to help a person fund a meaningful passion responsibly using already-verified financial summaries.
Never invent transactions, income, debt or savings.
Treat the supplied deterministic financial metrics as authoritative.
Do not recommend unsafe borrowing, high-risk investments, gambling, speculative trading, skipping essential expenses or stopping necessary medical, educational, housing or family spending.
Do not shame the user.
Distinguish needs from potentially flexible spending.
Give specific, realistic and respectful suggestions.
Do not claim that financial success is guaranteed.
Keep the writing concise, encouraging and actionable.
Return only data matching the required schema.`;

    const prompt = `Goal detail:
- Name: "${goal.name}"
- Description: "${goal.description}"
- Emotional Motivation/Reason: "${goal.reason}"
- Target Amount: ${goal.targetAmount}
- Current Savings: ${goal.currentSaved}
- Period Target: ${goal.desiredMonths} months
- Flexible Target Option: ${goal.isTargetFlexible ? 'Yes' : 'No'}

Deterministic Financial Metrics:
- Average Monthly Income: ${financialSummary.averageMonthlyIncome}
- Average Monthly Expense: ${financialSummary.averageMonthlyExpense}
- Average Monthly Surplus: ${financialSummary.averageMonthlySurplus}
- Safe Monthly Contribution Capacity: ${financialSummary.safeMonthlyContribution}
- Top Expense Categories: ${JSON.stringify(financialSummary.topExpenseCategories)}
- User-Selected Discretionary/Flexible Categories: ${JSON.stringify(financialSummary.selectedFlexibleCategories)}

Current Goal Feasibility:
- Remaining Amount Needed: ${verifiedMetrics.remainingAmount}
- Target Timeline: ${verifiedMetrics.availableMonths} months
- Required Monthly Allocation: ${verifiedMetrics.requiredMonthlyContribution}
- User's Simulated Monthly Contribution (after adjustments): ${verifiedMetrics.simulatedMonthlyContribution}
- Current Funding Gap/Month: ${verifiedMetrics.fundingGapPerMonth}
- Estimated Timeline to Completion: ${verifiedMetrics.estimatedCompletionMonths ? `${verifiedMetrics.estimatedCompletionMonths} months` : 'N/A'}
- Feasibility Classification: ${verifiedMetrics.feasibility}

Please build a personalized financial plan that respects these numbers. Influence the tone and encouragement using their reason ("${goal.reason}"). Return the response matching the JSON schema.`;

    // Define response schema for Gemini SDK
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        feasibility: {
          type: 'STRING',
          enum: ['already_funded', 'on_track', 'challenging_but_possible', 'currently_not_feasible']
        },
        headline: { type: 'STRING' },
        summary: { type: 'STRING' },
        suggestedMonthlyContribution: { type: 'NUMBER' },
        suggestions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              category: { type: 'STRING' },
              action: { type: 'STRING' },
              estimatedMonthlyImpact: { type: 'NUMBER' },
              reason: { type: 'STRING' }
            },
            required: ['title', 'category', 'action', 'estimatedMonthlyImpact', 'reason']
          }
        },
        milestones: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              percentage: { type: 'NUMBER' },
              label: { type: 'STRING' },
              targetAmount: { type: 'NUMBER' },
              estimatedDate: { type: 'STRING' }
            },
            required: ['percentage', 'label', 'targetAmount']
          }
        },
        firstWeekActions: {
          type: 'ARRAY',
          items: { type: 'STRING' }
        },
        encouragement: { type: 'STRING' }
      },
      required: [
        'feasibility',
        'headline',
        'summary',
        'suggestedMonthlyContribution',
        'suggestions',
        'milestones',
        'firstWeekActions',
        'encouragement'
      ]
    };

    // Execute API Call with a timeout
    const apiCallPromise = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any
      }
    });

    const response: any = await Promise.race([apiCallPromise, timeoutPromise]);
    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini API');
    }

    const rawJson = JSON.parse(responseText.trim());

    // Post-generation validation & schema enforcement
    const validatedPlan = GeminiPassionPlanSchema.parse(rawJson);

    // Override feasibility with local deterministic value to prevent AI hallucination
    validatedPlan.feasibility = verifiedMetrics.feasibility;

    return res.status(200).json(validatedPlan);

  } catch (error: any) {
    console.error('Serverless Function Error:', error);
    const message = error.message || 'An error occurred during plan generation';
    return res.status(500).json({ error: message });
  }
}
