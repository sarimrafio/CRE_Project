"""Automated unit and integration test for FastAPI backend endpoints."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_defaults():
    response = client.get("/api/calibrated-defaults")
    assert response.status_code == 200
    data = response.json()
    assert "wastewater" in data
    assert "kinetics" in data
    assert data["wastewater"]["Q_m3_day"] == 1000.0

def test_compare_endpoint():
    payload = {
        "Q": 1000.0,
        "S0": 750.0,
        "Se_target": 75.0,
        "theta_c": 10.0
    }
    response = client.post("/api/simulate/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "cstr" in data
    assert "pfr" in data
    assert "comparison" in data
    # Volumes should be close to 490 m3
    assert 450.0 <= data["cstr"]["volume_m3"] <= 530.0
    assert 450.0 <= data["pfr"]["volume_m3"] <= 530.0
    # Ratio should be near 1.0 (between 0.95 and 1.05)
    assert 0.90 <= data["comparison"]["volume_ratio_cstr_over_pfr"] <= 1.10

def test_profiles_endpoint():
    payload = {
        "S0": 750.0,
        "Xb0": 3800.0,
        "DO0": 2.0,
        "tau_days": 0.495,
        "n_points": 50
    }
    response = client.post("/api/simulate/profiles", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["S"]) == 50
    assert data["S"][-1] < data["S"][0]  # Substrate consumed

def test_levenspiel_endpoint():
    payload = {
        "Q": 1000.0,
        "S0": 750.0,
        "Se_target": 75.0,
        "theta_c": 10.0
    }
    response = client.post("/api/simulate/levenspiel", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "curve" in data
    assert len(data["curve"]) > 50

def test_csv_export():
    response = client.get("/api/export/csv")
    assert response.status_code == 200
    assert "Parameter,CSTR Design,PFR Design,Unit" in response.text

if __name__ == "__main__":
    test_root()
    test_health()
    test_defaults()
    test_compare_endpoint()
    test_profiles_endpoint()
    test_levenspiel_endpoint()
    test_csv_export()
    print("ALL FASTAPI BACKEND TESTS PASSED SUCCESSFULLY!")
