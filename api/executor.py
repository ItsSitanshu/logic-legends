# executor.py
import docker
import json
import redis
import tempfile
import os
import subprocess
import time
from pathlib import Path

REDIS_URL = "redis://localhost:6379"
redis_client = redis.from_url(REDIS_URL)
docker_client = docker.from_env()

class CodeExecutor:
    def __init__(self):
        self.language_configs = {
            "c": {
                "image": "gcc:11-alpine",
                "compile_cmd": ["gcc", "-o", "/tmp/solution", "/tmp/solution.c", "-std=c11", "-O2"],
                "run_cmd": ["/tmp/solution"],
                "file_ext": ".c",
                "timeout": 10
            },
            "python": {
                "image": "python:3.11-alpine",
                "compile_cmd": None,
                "run_cmd": ["python3", "/tmp/solution.py"],
                "file_ext": ".py", 
                "timeout": 10
            },
            "javascript": {
                "image": "node:20-alpine",
                "compile_cmd": None,
                "run_cmd": ["node", "/tmp/solution.js"],
                "file_ext": ".js",
                "timeout": 10
            }
        }
    
    def execute_code(self, language: str, code: str, test_input: str, time_limit: int, memory_limit: int):
        """Execute code in a sandboxed Docker container"""
        config = self.language_configs.get(language)
        if not config:
            return {"verdict": "CE", "error": "Unsupported language"}
        
        try:
            # Create temporary directory for this execution
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write source code
                source_file = os.path.join(temp_dir, f"solution{config['file_ext']}")
                with open(source_file, 'w') as f:
                    f.write(code)
                
                # Create input file
                input_file = os.path.join(temp_dir, "input.txt")
                with open(input_file, 'w') as f:
                    f.write(test_input)
                
                # Docker security settings
                security_opt = ["no-new-privileges:true"]
                cap_drop = ["ALL"]
                
                # Resource limits
                mem_limit = f"{memory_limit}m"
                
                # Container configuration
                container_config = {
                    "image": config["image"],
                    "volumes": {temp_dir: {"bind": "/tmp", "mode": "rw"}},
                    "working_dir": "/tmp",
                    "mem_limit": mem_limit,
                    "memswap_limit": mem_limit,
                    "cpu_period": 100000,
                    "cpu_quota": 50000,  # 50% CPU
                    "network_disabled": True,
                    "security_opt": security_opt,
                    "cap_drop": cap_drop,
                    "pids_limit": 50,
                    "read_only": False,  # Need write access to /tmp
                    "tmpfs": {"/tmp": "rw,noexec,nosuid,size=100m"},
                    "stdin_open": True,
                    "tty": False,
                    "detach": True
                }
                
                start_time = time.time()
                
                # Compilation step (if needed)
                if config["compile_cmd"]:
                    compile_container = docker_client.containers.run(
                        command=config["compile_cmd"],
                        **container_config
                    )
                    
                    compile_result = compile_container.wait(timeout=30)
                    compile_logs = compile_container.logs().decode('utf-8')
                    compile_container.remove()
                    
                    if compile_result["StatusCode"] != 0:
                        return {
                            "verdict": "CE",
                            "error": compile_logs,
                            "execution_time": 0,
                            "memory_used": 0
                        }
                
                # Execution step
                run_container = docker_client.containers.run(
                    command=config["run_cmd"] + ["<", "/tmp/input.txt"],
                    **container_config
                )
                
                try:
                    # Wait for execution with timeout
                    result = run_container.wait(timeout=time_limit/1000)
                    execution_time = int((time.time() - start_time) * 1000)
                    
                    # Get output
                    output = run_container.logs(stdout=True, stderr=False).decode('utf-8')
                    error_output = run_container.logs(stdout=False, stderr=True).decode('utf-8')
                    
                    # Get container stats for memory usage
                    stats = run_container.stats(stream=False)
                    memory_used = stats['memory_stats'].get('usage', 0) // 1024  # Convert to KB
                    
                    run_container.remove()
                    
                    if result["StatusCode"] != 0:
                        if execution_time >= time_limit:
                            return {"verdict": "TLE", "execution_time": execution_time, "memory_used": memory_used}
                        else:
                            return {"verdict": "RE", "error": error_output, "execution_time": execution_time, "memory_used": memory_used}
                    
                    if memory_used > memory_limit * 1024:  # Convert MB to KB
                        return {"verdict": "MLE", "execution_time": execution_time, "memory_used": memory_used}
                    
                    return {
                        "verdict": "SUCCESS",
                        "output": output.strip(),
                        "execution_time": execution_time,
                        "memory_used": memory_used
                    }
                    
                except docker.errors.APIError as e:
                    if "timeout" in str(e).lower():
                        run_container.kill()
                        run_container.remove()
                        return {"verdict": "TLE", "execution_time": time_limit, "memory_used": 0}
                    raise e
                
        except Exception as e:
            return {"verdict": "RE", "error": str(e), "execution_time": 0, "memory_used": 0}

def run_dynamic_checker(checker_code: str, checker_language: str, user_output: str, expected_output: str, test_input: str):
    """Run the dynamic checker to validate user output"""
    executor = CodeExecutor()
    
    # Prepare checker input
    checker_input = json.dumps({
        "input": test_input,
        "expected": expected_output,
        "actual": user_output
    })
    
    result = executor.execute_code(checker_language, checker_code, checker_input, 5000, 64)
    
    if result["verdict"] != "SUCCESS":
        return False, "Checker execution failed"
    
    # Checker should output "ACCEPT" or "REJECT"
    checker_output = result["output"].strip().upper()
    return checker_output == "ACCEPT", result["output"]

def judge_submission(submission_data):
    """Main judging logic"""
    from supabase import create_client
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    submission_id = submission_data["submission_id"]
    problem_id = submission_data["problem_id"]
    language = submission_data["language"]
    code = submission_data["code"]
    
    # Update status to judging
    supabase.table("submissions").update({"verdict": "JUDGING"}).eq("id", submission_id).execute()
    
    # Get problem details
    problem = supabase.table("problems").select("*").eq("id", problem_id).single().execute()
    if not problem.data:
        return
    
    problem_data = problem.data
    test_cases = problem_data["test_cases"]
    time_limit = problem_data["time_limit"]
    memory_limit = problem_data["memory_limit"]
    checker_code = problem_data.get("checker_code")
    checker_language = problem_data.get("checker_language")
    
    executor = CodeExecutor()
    results = []
    passed_count = 0
    max_time = 0
    max_memory = 0
    
    for i, test_case in enumerate(test_cases):
        test_input = test_case["input"]
        expected_output = test_case["expected_output"]
        
        # Execute user code
        result = executor.execute_code(language, code, test_input, time_limit, memory_limit)
        
        max_time = max(max_time, result.get("execution_time", 0))
        max_memory = max(max_memory, result.get("memory_used", 0))
        
        if result["verdict"] != "SUCCESS":
            results.append({
                "test_case": i + 1,
                "verdict": result["verdict"],
                "execution_time": result.get("execution_time", 0),
                "memory_used": result.get("memory_used", 0),
                "error": result.get("error", "")
            })
            # Stop on first failure for efficiency
            break
        
        # Check output
        user_output = result["output"]
        
        if checker_code and checker_language:
            # Use dynamic checker
            is_correct, checker_msg = run_dynamic_checker(
                checker_code, checker_language, user_output, expected_output, test_input
            )
        else:
            # Simple string comparison
            is_correct = user_output.strip() == expected_output.strip()
            checker_msg = ""
        
        if is_correct:
            passed_count += 1
            verdict = "AC"
        else:
            verdict = "WA"
        
        results.append({
            "test_case": i + 1,
            "verdict": verdict,
            "execution_time": result["execution_time"],
            "memory_used": result["memory_used"],
            "checker_message": checker_msg
        })
        
        if not is_correct:
            break  # Stop on wrong answer
    
    # Determine final verdict
    if passed_count == len(test_cases):
        final_verdict = "AC"
    else:
        # Find the worst verdict
        verdicts = [r["verdict"] for r in results]
        if "TLE" in verdicts:
            final_verdict = "TLE"
        elif "MLE" in verdicts:
            final_verdict = "MLE"
        elif "RE" in verdicts:
            final_verdict = "RE"
        else:
            final_verdict = "WA"
    
    # Update submission
    update_data = {
        "verdict": final_verdict,
        "execution_time": max_time,
        "memory_used": max_memory,
        "test_cases_passed": passed_count,
        "total_test_cases": len(test_cases),
        "judge_output": results,
        "judged_at": datetime.now().isoformat()
    }
    
    supabase.table("submissions").update(update_data).eq("id", submission_id).execute()

# Worker loop
def main():
    print("Judge worker started...")
    while True:
        try:
            # Get job from queue (blocking)
            job_data = redis_client.brpop("judge_queue", timeout=1)
            if job_data:
                submission_data = json.loads(job_data[1])
                print(f"Processing submission {submission_data['submission_id']}")
                judge_submission(submission_data)
                print(f"Finished judging submission {submission_data['submission_id']}")
        except Exception as e:
            print(f"Error processing job: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()