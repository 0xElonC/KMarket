import requests
import json

resp = requests.get("http://localhost:3000/api/market/grid")
print(json.dumps(resp.json(), indent=2, ensure_ascii=False))
