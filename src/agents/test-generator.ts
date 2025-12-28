import OpenAI from 'openai';
import { AgentType, FindingType, Severity } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class TestGeneratorAgent {
  async analyze(pullRequestData: any) {
    const prompt = `You are a test automation expert. Analyze the following pull request and suggest test cases.

Pull Request: ${pullRequestData.title}
Description: ${pullRequestData.description || 'No description provided'}

Identify:
- Missing unit tests
- Missing integration tests
- Edge cases not covered
- Test coverage gaps
- Areas requiring additional testing

Provide a JSON response with the following structure:
{
  "findings": [
    {
      "type": "TEST_COVERAGE",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "title": "Test coverage issue",
      "description": "Description of what needs testing",
      "file": "filename or null",
      "line": number or null,
      "suggestion": "Suggested test cases or testing approach"
    }
  ],
  "summary": "Overall test coverage assessment"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a test automation expert specializing in comprehensive test coverage. Respond only with valid JSON.',
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
        summary: result.summary || 'Test coverage analysis completed',
        agentType: AgentType.TEST_GENERATOR,
      };
    } catch (error: any) {
      console.error('Test Generator Agent Error:', error);
      return {
        findings: [
          {
            type: FindingType.TEST_COVERAGE,
            severity: Severity.INFO,
            title: 'Test Analysis Failed',
            description: `Unable to complete test coverage analysis: ${error.message}`,
            file: null,
            line: null,
            suggestion: 'Manual test planning recommended',
          },
        ],
        summary: 'Test analysis failed',
        agentType: AgentType.TEST_GENERATOR,
      };
    }
  }
}
