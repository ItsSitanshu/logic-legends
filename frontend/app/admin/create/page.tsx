// pages/admin/problems/create.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'

interface TestCase {
  input: string
  expected_output: string
  hidden: boolean
}

export default function CreateProblem() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    difficulty: 'easy',
    description: '',
    input_format: '',
    output_format: '',
    constraints: '',
    sample_input: '',
    sample_output: '',
    time_limit: 1000,
    memory_limit: 128,
    checker_code: '',
    checker_language: 'python'
  })
  
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: '', expected_output: '', hidden: false }
  ])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-generate slug from title
    if (field === 'title') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }

  const addTestCase = () => {
    setTestCases(prev => [...prev, { input: '', expected_output: '', hidden: false }])
  }

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    setTestCases(prev => prev.map((tc, i) => 
      i === index ? { ...tc, [field]: value } : tc
    ))
  }

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const problemData = {
        ...formData,
        test_cases: testCases.filter(tc => tc.input.trim() && tc.expected_output.trim())
      }

      const response = await fetch('/api/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(problemData),
      })

      if (response.ok) {
        router.push('/problems')
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to create problem')
      }
    } catch (error) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const checkerTemplate = {
    python: `import json
import sys

# Read checker input
input_data = json.loads(sys.stdin.read())
test_input = input_data["input"]
expected = input_data["expected"]
actual = input_data["actual"]

# Your custom checking logic here
# Example: case-insensitive comparison
if actual.strip().lower() == expected.strip().lower():
    print("ACCEPT")
else:
    print("REJECT")`,
    
    javascript: `const input = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const testInput = input.input;
const expected = input.expected;
const actual = input.actual;

// Your custom checking logic here
// Example: case-insensitive comparison
if (actual.trim().toLowerCase() === expected.trim().toLowerCase()) {
    console.log("ACCEPT");
} else {
    console.log("REJECT");
}`
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Problem</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (ms)</label>
                <input
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => handleInputChange('time_limit', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  min="100"
                  max="10000"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Memory Limit (MB)</label>
                <input
                  type="number"
                  value={formData.memory_limit}
                  onChange={(e) => handleInputChange('memory_limit', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  min="32"
                  max="512"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 h-32"
                placeholder="Problem description in HTML format"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Input Format</label>
                <textarea
                  value={formData.input_format}
                  onChange={(e) => handleInputChange('input_format', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-20"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
                <textarea
                  value={formData.output_format}
                  onChange={(e) => handleInputChange('output_format', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Constraints</label>
              <textarea
                value={formData.constraints}
                onChange={(e) => handleInputChange('constraints', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 h-20"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sample Input</label>
                <textarea
                  value={formData.sample_input}
                  onChange={(e) => handleInputChange('sample_input', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-20 font-mono text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sample Output</label>
                <textarea
                  value={formData.sample_output}
                  onChange={(e) => handleInputChange('sample_output', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-20 font-mono text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Test Cases Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Test Cases</h2>
              <button
                type="button"
                onClick={addTestCase}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Add Test Case
              </button>
            </div>

            <div className="space-y-4">
              {testCases.map((testCase, index) => (
                <div key={index} className="border border-gray-200 rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Test Case {index + 1}</h3>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={testCase.hidden}
                          onChange={(e) => updateTestCase(index, 'hidden', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">Hidden</span>
                      </label>
                      {testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Input</label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 h-20 font-mono text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output</label>
                      <textarea
                        value={testCase.expected_output}
                        onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 h-20 font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Checker Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dynamic Checker (Optional)</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Checker Language</label>
              <select
                value={formData.checker_language}
                onChange={(e) => {
                  handleInputChange('checker_language', e.target.value)
                  if (!formData.checker_code) {
                    handleInputChange('checker_code', checkerTemplate[e.target.value as keyof typeof checkerTemplate])
                  }
                }}
                className="border border-gray-300 rounded px-3 py-2"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Checker Code</label>
              <textarea
                value={formData.checker_code}
                onChange={(e) => handleInputChange('checker_code', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 h-64 font-mono text-sm"
                placeholder="Leave empty to use default string comparison"
              />
              <p className="text-xs text-gray-600 mt-1">
                Checker receives JSON input with: input, expected, actual. Should output "ACCEPT" or "REJECT".
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/problems')}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Problem'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}