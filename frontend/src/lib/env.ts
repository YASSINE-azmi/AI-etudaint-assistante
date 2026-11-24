const REQUIRED_ENV_VARS = [
  'VITE_API_BASE_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const

export type EnvVarName = (typeof REQUIRED_ENV_VARS)[number]

function readEnv(name: EnvVarName): string | undefined {
  const value = import.meta.env[name]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/**
 * Returns the required `VITE_` variables that are missing or empty.
 * This is the only module that reads `import.meta.env` directly.
 */
export function missingEnvVars(): EnvVarName[] {
  return REQUIRED_ENV_VARS.filter((name) => readEnv(name) === undefined)
}

export const env = {
  apiBaseUrl: readEnv('VITE_API_BASE_URL'),
  supabaseUrl: readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY'),
} as const
