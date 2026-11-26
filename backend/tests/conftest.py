import asyncio
import os
import sys

# Psycopg's async mode cannot run on Windows' default ProactorEventLoop.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Settings are validated at import time by `app.main`. Tests never reach the network:
# the database engine and JWKS client are constructed lazily and only connect on use.
_TEST_ENV = {
    "ENVIRONMENT": "test",
    "SUPABASE_URL": "https://test-project.supabase.co",
    "SUPABASE_ANON_KEY": "test-anon-key",
    "DATABASE_URL": "postgresql+psycopg://postgres:test@localhost:5432/postgres",
    "DATABASE_RUNTIME_URL": "postgresql+psycopg://app_runtime:test@localhost:5432/postgres",
    "AI_PROVIDER_BASE_URL": "https://api.example.test/v1",
    "AI_PROVIDER_API_KEY": "test-provider-key",
    "TRIAL_CREDIT_BUDGET_USD": "5.00",
}

# setdefault so CI can point integration tests at its own Postgres via DATABASE_URL.
for key, value in _TEST_ENV.items():
    os.environ.setdefault(key, value)

# The API must start without the service-role key (D-28); make sure no shell leaks it in.
os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
