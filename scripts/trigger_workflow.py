"""Trigger GitHub Actions workflow and check result."""
import os, subprocess, json, sys, time

REPO = "snigellinofficial/-drc-conflict-atlas"
WORKFLOW_FILE = "update_data.yml"

def get_token():
    """Get GitHub token from Windows Credential Manager via git."""
    try:
        result = subprocess.run(
            ["git", "credential-manager", "get"],
            input="protocol=https\nhost=github.com\n\n",
            capture_output=True, text=True, timeout=10
        )
    except FileNotFoundError:
        result = subprocess.run(
            [r"C:\Program Files\Git\mingw64\bin\git-credential-manager.exe", "get"],
            input="protocol=https\nhost=github.com\n\n",
            capture_output=True, text=True, timeout=10
        )
    for line in result.stdout.strip().split("\n"):
        if line.startswith("password="):
            return line.split("=", 1)[1]
    return None

def api_call(method, endpoint, token, data=None):
    import urllib.request, urllib.error
    url = f"https://api.github.com/repos/{REPO}{endpoint}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "DRC-Conflict-Map-CI")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        eb = e.read()
        return e.code, json.loads(eb) if eb else {}

def main():
    token = get_token()
    if not token:
        print("ERROR: Could not get GitHub token")
        sys.exit(1)

    # Dispatch workflow
    print("Triggering workflow dispatch...")
    status, data = api_call("POST", f"/actions/workflows/{WORKFLOW_FILE}/dispatches", token,
                            {"ref": "main"})
    if status == 204:
        print("Workflow triggered successfully!")
    else:
        print(f"Dispatch status: {status}")
        if isinstance(data, dict):
            print(json.dumps(data, indent=2)[:500])
        if status == 404:
            print("Workflow file might not be recognized yet. Has it been pushed?")
            sys.exit(1)

    # Wait and check runs
    print("\nWaiting 10s for workflow to start...")
    time.sleep(10)

    status, data = api_call("GET", "/actions/runs?per_page=3", token)
    if status == 200 and "workflow_runs" in data:
        for run in data["workflow_runs"][:3]:
            name = run.get("name", "?")
            conclusion = run.get("conclusion", "pending")
            status_str = run.get("status", "?")
            print(f"  [{status_str}] {name} — {conclusion} ({run.get('html_url', '')})")
    else:
        print(f"Could not fetch runs: {status}")
        print(json.dumps(data, indent=2)[:500] if isinstance(data, dict) else str(data)[:500])

if __name__ == "__main__":
    main()
