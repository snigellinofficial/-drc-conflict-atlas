import urllib.request, urllib.parse, json

url = "https://acleddata.com/oauth/token"
data = urllib.parse.urlencode({
    "username": "2501211080@stu.pku.edu.cn",
    "password": "ysl3197887",
    "grant_type": "password",
    "client_id": "acled"
}).encode()

headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Origin": "https://acleddata.com",
    "Referer": "https://acleddata.com/api-documentation/getting-started",
}

req = urllib.request.Request(url, data=data, headers=headers)
try:
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read().decode())
    print("SUCCESS!")
    print("access_token:", result.get("access_token", "NOT FOUND"))
    print("expires_in:", result.get("expires_in", "?"))
    with open("data/acled_token.json", "w") as f:
        json.dump(result, f)
    print("\nToken saved.")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:1000]
    print(f"HTTP {e.code}")
    print(f"Response: {body}")
except Exception as e:
    print(f"ERROR: {e}")
