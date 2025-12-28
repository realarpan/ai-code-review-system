import OpenAI from 'openai';
import { AgentType, FindingType, Severity } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class SecurityScannerAgent {
  async analyze(pullRequestData: any) {
    const prompt = `You are a security expert. Scan the following pull request for security vulnerabilities.

Pull Request: ${pullRequestData.title}
Description: ${pullRequestData.description || 'No description provided'}

Focus on:
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication/authorization issues
- Sensitive data exposure
- Insecure dependencies
- CSRF vulnerabilities
- Input validation issues

Provide a JSON response with the following structure:
{
  "findings": [
    {
      "type": "SECURITY_VULNERABILITY",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "title": "Vulnerability name",
      "description": "Detailed description of the security issue",
      "file": "filename or null",
      "line": number or null,
      "suggestion": "How to fix the vulnerability"
    }
  ],
  "summary": "Overall security assessment"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a security expert specializing in web application security. Focus on identifying vulnerabilities. Respond only with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      const result = JSON.parse(content || '{}');

      return {
        findings: result.findings || [],
        summary: result.summary || 'Security scan completed',
        agentType: AgentType.SECURITY_SCANNER,
      };
    } catch (error: any) {
      console.error('Security Scanner Agent Error:', error);
      return {
        findings: [
          {
            type: FindingType.SECURITY_VULNERABILITY,
            severity: Severity.INFO,
            title: 'Security Scan Failed',
            description: `Unable to complete security scan: ${error.message}`,
            file: null,
            line: null,
            suggestion: 'Manual security review recommended',
          },
        ],
        summary: 'Security analysis failed',
        agentType: AgentType.SECURITY_SCANNER,
      };
    }
  }
}
