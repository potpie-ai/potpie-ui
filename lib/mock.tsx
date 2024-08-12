export const diffFile2 = `from app.model import Transaction, PaymentStatus


def compute_loyalty_points(transaction: Transaction, payment_status: PaymentStatus) -> float:
    extra_points = 0

    if payment_status.status == "success" and payment_status.payment_method in ["method1", "method2","eligible_method"]:  # example payment methods
        extra_points = transaction.loyalty_points_earned * 0.20
   


    # Assuming a limit of 100 points as extra for a transaction
    extra_points = min(100, extra_points)
    return min(transaction.loyalty_points_earned,100) + extra_points`;

export const diffFile1 = `from app.model import Transaction, PaymentStatus


def compute_loyalty_points(transaction: Transaction, payment_status: PaymentStatus) -> float:
    extra_points = 0

    if payment_status.status == "success" and payment_status.payment_method in ["method1", "method2","eligible_method"]:  # example payment methods
        extra_points = transaction.loyalty_points_earned * 0.20
    elif payment_status.status != "success":
        return 0

    # Assuming a limit of 100 points as extra for a transaction
    extra_points = min(100, extra_points)
    return min(transaction.loyalty_points_earned,100) + extra_points`;

export const MyProjectsCard = [
  {
    name: "Netflix/dispatch",
    contentPoints: [
      {
        desc: "222 entry points detected",
      },
      {
        desc: "183 tests detected",
      },
      {
        desc: "Last updated 05/03/24",
      },
    ],
    disabled: true,
  },
];

export const codeResponce = [
  `"# imports\nimport pytest\nfrom fastapi.testclient import TestClient\nfrom fastapi import FastAPI, HTTPException\nfrom unittest.mock import AsyncMock\nfrom litellm.proxy.proxy_server import router as proxy_router\nfrom litellm.proxy.utils import PrismaClient\n\n# Setup FastAPI app for testing\n@pytest.fixture\ndef test_app():\n    app = FastAPI()\n    app.include_router(proxy_router)\n    return app\n\n# Mocking the PrismaClient for database interactions\n@pytest.fixture\ndef mock_prisma_client(mocker):\n    mock = mocker.patch(\"litellm.proxy.proxy_server.prisma_client\", autospec=PrismaClient)\n    mock.db.query_raw = AsyncMock()\n    return mock\n\n# Test: Valid SQL query execution with a mix of team aliases and unassigned teams\ndef test_global_spend_per_team_valid_data(test_app, mock_prisma_client):\n    mock_response = [\n        {\"team_alias\": \"Team A\", \"spend_date\": \"2023-01-01\", \"total_spend\": 100.00},\n        {\"team_alias\": None, \"spend_date\": \"2023-01-02\", \"total_spend\": 50.00}\n    ]\n    mock_prisma_client.db.query_raw.return_value = mock_response\n\n    with TestClient(test_app) as client:\n        response = client.get(\"/global/spend/teams\")\n        assert response.status_code == 200\n        assert response.json() == {\n            \"daily_spend\": [\n                {\"date\": \"2023-01-01\", \"Team A\": 100.00},\n                {\"date\": \"2023-01-02\", \"Unassigned\": 50.00}\n            ],\n            \"teams\": [\"Team A\", \"Unassigned\"],\n            \"total_spend_per_team\": [\n                {\"team_id\": \"Team A\", \"total_spend\": 100.00},\n                {\"team_id\": \"Unassigned\", \"total_spend\": 50.00}\n            ]\n        }\n\n# Test: Database connection error handling\ndef test_global_spend_per_team_no_db_connection(test_app, mock_prisma_client):\n    mock_prisma_client.db.query_raw.side_effect = HTTPException(status_code=500, detail={\"error\": \"No db connected\"})\n\n    with TestClient(test_app) as client:\n        response = client.get(\"/global/spend/teams\")\n        assert response.status_code == 500\n        assert response.json() == {\"detail\": {\"error\": \"No db connected\"}}\n\n# Test: Duration string is empty or null for budget reset\ndef test_reset_budget_invalid_duration(test_app, mocker):\n    mock_prisma_client = mocker.patch(\"litellm.proxy.utils.prisma_client\", autospec=PrismaClient)\n    mock_prisma_client.get_data = AsyncMock(return_value=[{\"budget_duration\": \"\"}])\n\n    with pytest.raises(ValueError) as excinfo:\n        test_app.dependency_overrides[PrismaClient] = lambda: mock_prisma_client\n        client = TestClient(test_app)\n        client.get(\"/reset_budget\")  # Assuming there's an endpoint to trigger this\n    assert \"Invalid duration format\" in str(excinfo.value)\n\n# Test: prisma_client is None, leading to database connection error in reset_budget\ndef test_reset_budget_no_db_connection(test_app, mocker):\n    mocker.patch(\"litellm.proxy.utils.prisma_client\", None)\n\n    with pytest.raises(HTTPException) as excinfo:\n        client = TestClient(test_app)\n        client.get(\"/reset_budget\")  # Assuming there's an endpoint to trigger this\n    assert excinfo.value.status_code == 500\n    assert excinfo.value.detail == {\"error\": \"No db connected\"}"`,
];

export const TestResultsMock = {
  message: "Tests failed.",
  details: {
    message: "Tests failed.",
    details: [
      {
        name: "test_log_event_success",
        params: "",
        status: "PASS",
        failure_type: "",
        stacktrace: "",
      },
      {
        name: "test_log_event_different_user_agents",
        params: "",
        status: "PASS",
        failure_type: "",
        stacktrace: "",
      },
      {
        name: "test_log_event_under_load",
        params: "",
        status: "PASS",
        failure_type: "",
        stacktrace: "",
      },
      {
        name: "test_log_event_without_data",
        params: "",
        status: "FAIL",
        failure_type: "",
        stacktrace:
          '_________________________ test_log_event_without_data __________________________\n\nclient = <starlette.testclient.TestClient object at 0x7fdce28b21d0>\n\n    def test_log_event_without_data(client):\n        response = client.post("/log-event", json={})\n>       assert response.status_code == 422  # Expecting a validation error due to empty data\nE       assert 200 == 422\nE        +  where 200 = <Response [200 OK]>.status_code\n\ntests/test_log_event_YnjKgram.py:52: AssertionError\n----------------------------- Captured stdout call -----------------------------\nReceived /log-event request\nReceived request data:\n{}',
      },
      {
        name: "test_log_event_internal_server_error",
        params: "",
        status: "PASS",
        failure_type: "",
        stacktrace: "",
      },
    ],
  },
};
