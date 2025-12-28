import OpenAI from 'openai';
import { AgentType, FindingType, Severity } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class PerformanceOptimizerAgent {
  async analyze(pullRequestData: any) {
    const prompt = `You are a performance optimization expert. Analyze the following pull request for performance issues.

Pull Request: ${pullRequestData.title}
Description: ${pullRequestData.description || 'No description provided'}

Focus on:
- Inefficient algorithms or data structures
- Database query optimization
- Memory leaks
- Unnecessary re-renders (React)
- Bundle size issues
- Network request optimization
- Caching opportunities

Provide a JSON response with the following structure:
{
  "findings": [
    {
      "type": "PERFORMANCE_ISSUE",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "title": "Performance issue",
      "description": "Detailed description of the performance problem",
      "file": "filename or null",
      "line": number or null,
      "suggestion": "How to optimize"
    }
  ],
  "summary": "Overall performance assessment"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a performance optimization expert specializing in web applications. Respond only with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      const result = JSON.parse(content || '{}');

      return {
        findings: result.findings || [],
        summary: result.summary || 'Performance analysis completed',
        agentType: AgentType.PERFORMANCE_OPTIMIZER,
      };
    } catch (error: any) {
      console.error('Performance Optimizer Agent Error:', error);
      return {
        findings: [
          {
            type: FindingType.PERFORMANCE_ISSUE,
            severity: Severity.INFO,
            title: 'Performance Analysis Failed',
            description: `Unable to complete performance analysis: ${error.message}`,
            file: null,
            line: null,
            suggestion: 'Manual performance review recommended',
          },
        ],
        summary: 'Performance analysis failed',
        agentType: AgentType.PERFORMANCE_OPTIMIZER,
      };
    }
  }
}
