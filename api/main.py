# main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
from supabase import create_client, Client
from typing import List, Optional
import uuid
from datetime import datetime

app = FastAPI(title="Logic Legends Judge API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
SUPABASE_URL = "your-supabase-url"
SUPABASE_KEY = "your-supabase-anon-key"
REDIS_URL = "redis://localhost:6379"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
redis_client = redis.from_url(REDIS_URL)
security = HTTPBearer()

# Models
from pydantic import BaseModel

class ProblemCreate(BaseModel):
    title: str
    slug: str
    difficulty: str
    description: str
    input_format: str
    output_format: str
    constraints: str
    sample_input: str
    sample_output: str
    time_limit: int = 1000
    memory_limit: int = 128
    checker_code: Optional[str] = None
    checker_language: Optional[str] = None
    test_cases: List[dict]

class SubmissionCreate(BaseModel):
    problem_id: int
    language: str
    code: str

# Authentication middleware
async def get_current_user(token: str = Depends(security)):
    try:
        response = supabase.auth.get_user(token.credentials)
        if response.user:
            return response.user
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")

async def get_admin_user(user = Depends(get_current_user)):
    profile = supabase.table("profiles").select("role").eq("id", user.id).single().execute()
    if not profile.data or profile.data["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Problem endpoints
@app.get("/api/problems")
async def get_problems(user = Depends(get_current_user)):
    problems = supabase.table("problems").select("id,title,slug,difficulty").eq("is_active", True).execute()
    return {"problems": problems.data}

@app.get("/api/problems/{slug}")
async def get_problem(slug: str, user = Depends(get_current_user)):
    problem = supabase.table("problems").select("*").eq("slug", slug).eq("is_active", True).single().execute()
    if not problem.data:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Don't expose hidden test cases
    test_cases = problem.data.get("test_cases", [])
    visible_test_cases = [tc for tc in test_cases if not tc.get("hidden", False)]
    problem.data["test_cases"] = visible_test_cases
    
    return {"problem": problem.data}

@app.post("/api/problems")
async def create_problem(problem: ProblemCreate, admin = Depends(get_admin_user)):
    problem_data = problem.dict()
    problem_data["created_by"] = admin.id
    
    result = supabase.table("problems").insert(problem_data).execute()
    return {"problem": result.data[0]}

# Submission endpoints
@app.post("/api/submissions")
async def submit_solution(submission: SubmissionCreate, user = Depends(get_current_user)):
    # Verify problem exists
    problem = supabase.table("problems").select("id").eq("id", submission.problem_id).single().execute()
    if not problem.data:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Create submission record
    submission_data = {
        "problem_id": submission.problem_id,
        "user_id": user.id,
        "language": submission.language,
        "code": submission.code,
        "verdict": "PENDING"
    }
    
    result = supabase.table("submissions").insert(submission_data).execute()
    submission_id = result.data[0]["id"]
    
    # Queue for judgment
    job_data = {
        "submission_id": submission_id,
        "problem_id": submission.problem_id,
        "language": submission.language,
        "code": submission.code
    }
    
    redis_client.lpush("judge_queue", json.dumps(job_data))
    
    return {"submission_id": submission_id, "status": "queued"}

@app.get("/api/submissions/{submission_id}")
async def get_submission(submission_id: int, user = Depends(get_current_user)):
    submission = supabase.table("submissions").select("*").eq("id", submission_id).single().execute()
    if not submission.data:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Users can only view their own submissions (or admins can view all)
    profile = supabase.table("profiles").select("role").eq("id", user.id).single().execute()
    is_admin = profile.data and profile.data["role"] == "admin"
    
    if submission.data["user_id"] != user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {"submission": submission.data}

@app.get("/api/submissions")
async def get_user_submissions(user = Depends(get_current_user), limit: int = 50):
    submissions = (supabase.table("submissions")
                  .select("id,problem_id,language,verdict,execution_time,memory_used,submitted_at")
                  .eq("user_id", user.id)
                  .order("submitted_at", desc=True)
                  .limit(limit)
                  .execute())
    
    return {"submissions": submissions.data}