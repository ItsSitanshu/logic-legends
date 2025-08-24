// pages/problems/[slug].tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import Editor from '@monaco-editor/react'

interface Problem {
  id: number
  title: string
  difficulty: string
  description: string
  input_format: string
  output_format: string
  constraints: string
  sample_input: string
  sample_output: string
  time_limit: number
  memory_limit: number
  test_cases: Array<{
    input: string
    expected_output: string
  }>
}

const languageTemplates = {
  c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Your code here
    return 0;
}`,
  python: `# Your code here
def solve():
    pass

if __name__ == "__main__":
    solve()`,
  javascript: `// Your code here
function solve() {
    
}

solve();`
}

export default function ProblemDetail() {
  const router = useRouter()
  const { slug } = router.query
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<'c' | 'python' | 'javascript'>('python')
  const [submitting, setSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any>(null)

  useEffect(() => {
    if (slug) {
      fetchProblem(slug as string)
    }
  }, [slug])

  useEffect(() => {
    setCode(languageTemplates[language])
  }, [language])

  const fetchProblem = async (slug: string) => {
    try {
      const response = await fetch(`/api/problems/${slug}`)
      const data = await response.json()
      setProblem(data.problem)
      setCode(languageTemplates[language])
    } catch (error) {
      console.error('Error fetching problem:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!problem || !code.trim()) return

    setSubmitting(true)
    setSubmissionResult(null)

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem_id: problem.id,
          language,
          code,
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        // Poll for results
        pollSubmissionResult(data.submission_id)
      } else {
        setSubmissionResult({ error: data.detail || 'Submission failed' })
      }
    } catch (error) {
      setSubmissionResult({ error: 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  const pollSubmissionResult = async (submissionId: number) => {
    const maxAttempts = 30
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/submissions/${submissionId}`)
        const data = await response.json()
        
        if (response.ok) {
          const submission = data.submission
          
          if (submission.verdict !== 'PENDING' && submission.verdict !== 'JUDGING') {
            setSubmissionResult(submission)
            return
          }
          
          if (attempts < maxAttempts) {
            attempts++
            setTimeout(poll, 1000)
          } else {
            setSubmissionResult({ error: 'Judging timeout' })
          }
        }
      } catch (error) {
        setSubmissionResult({ error: 'Error fetching result' })
      }
    }

    poll()
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'AC': return 'text-green-600 bg-green-100'
      case 'WA': return 'text-red-600 bg-red-100'
      case 'TLE': return 'text-yellow-600 bg-yellow-100'
      case 'MLE': return 'text-purple-600 bg-purple-100'
      case 'RE': return 'text-red-600 bg-red-100'
      case 'CE': return 'text-gray-600 bg-gray-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!problem) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Problem not found</h2>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-screen">
        {/* Problem Description */}
        <div className="bg-white rounded-lg shadow p-6 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">{problem.title}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getDifficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
            </div>

            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: problem.description }} />
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Input Format</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{problem.input_format}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">Output Format</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{problem.output_format}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">Constraints</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{problem.constraints}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sample Input</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm">{problem.sample_input}</pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sample Output</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm">{problem.sample_output}</pre>
              </div>

              <div className="text-sm text-gray-600">
                <p>Time Limit: {problem.time_limit}ms | Memory Limit: {problem.memory_limit}MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="bg-white rounded-lg shadow flex flex-col">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value="python">Python</option>
                  <option value="c">C</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={submitting || !code.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          <div className="flex-1">
            <Editor
              height="60vh"
              language={language === 'javascript' ? 'javascript' : language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </div>

          {/* Submission Result */}
          {submissionResult && (
            <div className="border-t p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Submission Result</h3>
              
              {submissionResult.error ? (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {submissionResult.error}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerdictColor(submissionResult.verdict)}`}>
                      {submissionResult.verdict}
                    </span>
                    
                    <span className="text-sm text-gray-600">
                      {submissionResult.test_cases_passed}/{submissionResult.total_test_cases} test cases passed
                    </span>
                    
                    {submissionResult.execution_time && (
                      <span className="text-sm text-gray-600">
                        {submissionResult.execution_time}ms
                      </span>
                    )}
                    
                    {submissionResult.memory_used && (
                      <span className="text-sm text-gray-600">
                        {Math.round(submissionResult.memory_used / 1024)}MB
                      </span>
                    )}
                  </div>

                  {submissionResult.error_message && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                      <pre className="whitespace-pre-wrap">{submissionResult.error_message}</pre>
                    </div>
                  )}

                  {submissionResult.judge_output && submissionResult.judge_output.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Test Case Results:</h4>
                      <div className="space-y-1">
                        {submissionResult.judge_output.map((result: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                            <span>Test Case {result.test_case}</span>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs ${getVerdictColor(result.verdict)}`}>
                                {result.verdict}
                              </span>
                              <span className="text-gray-600">{result.execution_time}ms</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}