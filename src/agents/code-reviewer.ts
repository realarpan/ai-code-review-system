import OpenAI from 'openai';
import { AgentType, FindingType, Severity } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class CodeReviewerAgent {
  async analyze(pullRequestData: any) {
    const prompt = `You are an expert code reviewer. Analyze the following pull request and provide detailed feedback.

Pull Request: ${pullRequestData.title}
Description: ${pullRequestData.description || 'No description provided'}
Files Changed: ${pullRequestData.filesChanged || 0}

Provide a JSON response with the following structure:
{
  "findings": [
    {
      "type": "CODE_QUALITY | BEST_PRACTICE | BUG_RISK",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "title": "Brief title",
      "description": "Detailed description",
      "file": "filename or null",
      "line": number or null,
      "suggestion": "How to fix"
    }
  ],
  "summary": "Overall assessment"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert code reviewer specializing in code quality, best practices, and bug detection. Respond only with valid JSON.',
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
        summary: result.summary || 'Code review completed',
        agentType: AgentType.CODE_REVIEWER,
      };
    } catch (error: any) {
      console.error('Code Reviewer Agent Error:', error);
      return {
        findings: [
          {
            type: FindingType.CODE_QUALITY,
            severity: Severity.INFO,
            title: 'Review Analysis Failed',
            description: `Unable to complete code review: ${error.message}`,
            file: null,
            line: null,
            suggestion: 'Manual review recommended',
          },
        ],
        summary: 'Analysis failed',
        agentType: AgentType.CODE_REVIEWER,
      };
    }
  }
}
