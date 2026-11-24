import os

# Settings are validated at import time by `app.main`. Tests never reach the network:
# the database engine and JWKS client are constructed lazily and only connect on use.
os.environ.update(
    {
        "ENVIRONMENT": "test",
        "SUPABASE_URL": "https://test-project.supabase.co",
        "SUPABASE_ANON_KEY": "test-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
        "DATABASE_URL": "postgresql+psycopg://postgres:test@localhost:5432/postgres",
        "DATABASE_RUNTIME_URL": "postgresql+psycopg://app_runtime:test@localhost:5432/postgres",
        "AI_PROVIDER_BASE_URL": "https://api.example.test/v1",
        "AI_PROVIDER_API_KEY": "test-provider-key",
        "TRIAL_CREDIT_BUDGET_USD": "5.00",
    }
)
