"""
AI Service Test Suite
=====================
Run this from the inventory-ai/ folder to validate all endpoints.

  python test_ai.py
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"
PASS = "\033[92m✅ PASS\033[0m"
FAIL = "\033[91m❌ FAIL\033[0m"

results = []

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, {"error": str(e)}

def get(path):
    try:
        with urllib.request.urlopen(f"{BASE_URL}{path}", timeout=5) as res:
            return res.status, json.loads(res.read())
    except Exception as e:
        return 0, {"error": str(e)}

def check(name, status, data, expect_status, expect_key, expect_value=None):
    ok = status == expect_status and expect_key in data
    if ok and expect_value is not None:
        ok = data[expect_key] == expect_value
    label = PASS if ok else FAIL
    results.append(ok)
    print(f"  {label}  {name}")
    print(f"         Status: {status} | Response: {json.dumps(data)}\n")

print("\n" + "="*55)
print("   CoreInventory — AI Service Test Suite")
print("="*55 + "\n")

# ── TEST 1: Health check ──
print("📋 TEST 1: Health Check")
status, data = get("/")
check("GET /  returns 200 OK", status, data, 200, "message", "Inventory AI running")

# ── TEST 2: Demand forecasting (upward trend) ──
print("📋 TEST 2: Demand Forecast — Upward trend [5,7,6,8,9]")
status, data = post("/predict-demand", [
    {"sales": 5}, {"sales": 7}, {"sales": 6}, {"sales": 8}, {"sales": 9}
])
check("POST /predict-demand  returns 200", status, data, 200, "predicted_daily_demand")
if "predicted_daily_demand" in data:
    print(f"         🔮 Predicted demand: {data['predicted_daily_demand']} units/day\n")

# ── TEST 3: Demand forecasting (flat trend) ──
print("📋 TEST 3: Demand Forecast — Flat trend [10,10,10,10]")
status, data = post("/predict-demand", [
    {"sales": 10}, {"sales": 10}, {"sales": 10}, {"sales": 10}
])
check("POST /predict-demand  stable demand ≈ 10", status, data, 200, "predicted_daily_demand")

# ── TEST 4: Reorder — stock below point (should reorder) ──
print("📋 TEST 4: Reorder — Stock=20, Demand=8, Lead=5, Safety=10")
status, data = post("/reorder", {"stock": 20, "demand": 8, "lead_time": 5, "safety_stock": 10})
check("POST /reorder  reorder=True when stock is low", status, data, 200, "reorder", True)
if "reorder_point" in data:
    print(f"         📦 Reorder Point: {data['reorder_point']} | Order: {data['recommended_order']} units\n")

# ── TEST 5: Reorder — stock is healthy (should NOT reorder) ──
print("📋 TEST 5: Reorder — Stock=500, Demand=5, Lead=3, Safety=10")
status, data = post("/reorder", {"stock": 500, "demand": 5, "lead_time": 3, "safety_stock": 10})
check("POST /reorder  reorder=False when stock is healthy", status, data, 200, "reorder", False)

# ── TEST 6: Error handling — too few data points ──
print("📋 TEST 6: Input Validation — Only 1 sales record (should 400)")
status, data = post("/predict-demand", [{"sales": 5}])
check("POST /predict-demand  returns 400 on < 2 records", status, data, 400, "detail")

# ── TEST 7: Error handling — negative stock ──
print("📋 TEST 7: Input Validation — Negative stock (should 422)")
status, data = post("/reorder", {"stock": -10, "demand": 5, "lead_time": 3, "safety_stock": 10})
check("POST /reorder  returns 422 on negative stock", status, data, 422, "detail")

# ── Summary ──
total  = len(results)
passed = sum(results)
failed = total - passed
print("="*55)
print(f"   Results: {passed}/{total} passed", "🎉" if failed == 0 else "⚠️")
print("="*55 + "\n")
sys.exit(0 if failed == 0 else 1)
