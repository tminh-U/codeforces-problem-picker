const API_BASE = '/api/cf';

export interface CFProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  rating?: number;
  tags: string[];
}

export interface CFSubmission {
  id: number;
  contestId: number;
  creationTimeSeconds: number;
  problem: CFProblem;
  author: any;
  programmingLanguage: string;
  verdict: string;
  testset: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

export async function getUserSubmissions(handle: string): Promise<CFSubmission[]> {
  const res = await fetch(`${API_BASE}/user.status?handle=${handle}`);
  const data = await res.json();
  if (data.status === 'OK') {
    return data.result;
  }
  throw new Error(data.comment || "Failed to fetch user submissions");
}

export async function getAllProblems(): Promise<CFProblem[]> {
  const res = await fetch(`${API_BASE}/problemset.problems`);
  const data = await res.json();
  if (data.status === 'OK') {
    return data.result.problems;
  }
  throw new Error("Failed to fetch problems");
}

export interface ProblemStatement {
  timeLimit: string;
  memoryLimit: string;
  body: string;
  inputSpec: string;
  outputSpec: string;
  samples: { input: string, output: string }[];
  note: string;
}

export async function translateProblem(url: string): Promise<{original: ProblemStatement, translated: ProblemStatement | null}> {
  const res = await fetch('/api/problem/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to translate');
  }
  return res.json();
}
