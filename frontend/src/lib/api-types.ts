/**
 * API contract types. Every field cites its source:
 * - "backend": `backend/app/...` as merged on `master` (the real, running API);
 * - "§x.y": `docs/implementation-plan.md`;
 * - "SSE contract": `docs/contracts/sse-turn-contract.md` (merged on `master`; content side
 *   by Yassine, transport not yet built by Mohamed).
 *
 * Only `GET /api/v1/me` exists in the backend today. For every other resource the plan gives
 * the stored columns (§5.1) but not the response body, so those types are marked
 * TODO(contract) and keep the §5.1 column names; casing and exposed fields may change.
 */

// ---------------------------------------------------------------------------------------------
// Shared enums (§5.1, §7.4, Appendix C) — values are fixed by the plan.
// ---------------------------------------------------------------------------------------------

/** §6.2; backend `auth/dependencies.py` `_role_from_claims`. */
export type Role = 'student' | 'reviewer' | 'admin'

/** §7.4 */
export type EducationalStatus =
  | 'accepted'
  | 'outside_scope'
  | 'insufficient_evidence'
  | 'clarification_required'
  | 'validation_failed'
  | 'provider_unavailable'
  | 'credit_exhausted'
  | 'source_withdrawn'
  | 'cancelled'

/** Appendix C */
export type RefusalCode =
  | 'OUT_OF_SCOPE_LEVEL'
  | 'OUT_OF_SCOPE_CHAPTER'
  | 'INSUFFICIENT_EVIDENCE'
  | 'AMBIGUOUS_QUESTION'
  | 'MATH_UNVERIFIABLE'
  | 'MATH_INCORRECT'
  | 'RENDERING_UNSAFE'
  | 'SOURCE_WITHDRAWN'
  | 'PROVIDER_UNAVAILABLE'
  | 'CREDIT_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'TURN_LIMIT_REACHED'

/** §5.1 `session_turns.response_status` */
export type ResponseStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/** Appendix D, SSE contract */
export type GateName = 'source' | 'scope' | 'grounding' | 'math_render'

// ---------------------------------------------------------------------------------------------
// Errors (§7.6)
// ---------------------------------------------------------------------------------------------

/**
 * §7.6 error body.
 * TODO(contract): the backend still returns FastAPI's `{ detail }`. Owner: Mohamed.
 */
export type ApiErrorBody = {
  code: string
  messageFr: string
  requestId: string
}

// ---------------------------------------------------------------------------------------------
// Profile — backend `api/auth.py` `MeResponse` (real)
// ---------------------------------------------------------------------------------------------

/**
 * TODO(contract): snake_case here (`academic_track`) vs camelCase in §7.3; confirm the casing
 * rule for REST bodies. `display_name` (§5.1) and the `PATCH /me` fields are not exposed yet.
 * Owner: Mohamed.
 */
export type Me = {
  id: string
  email: string | null
  role: Role
  academic_track: string
}

// ---------------------------------------------------------------------------------------------
// Turns and citations (§7.2–§7.5, SSE contract)
// ---------------------------------------------------------------------------------------------

/** §7.3, SSE contract `Citation`. No chapter field: the session's chapter is fixed (§11.5). */
export type Citation = {
  claimId: string
  chunkId: string
  revisionId: string
  page: number
  section: string
  quote: string
}

/** §7.3, SSE contract `Usage` */
export type Usage = {
  inputTokens: number
  outputTokens: number
  costUsd: number
}

/** SSE contract `GateResult` */
export type GateResult = {
  gate: GateName
  passed: boolean
}

/** §7.3 turn response payload (also the shape replayed on an idempotent retry, §7.5). */
export type TurnResponse = {
  turnId: string
  status: ResponseStatus
  educationalStatus: EducationalStatus
  refusalCode: RefusalCode | null
  messageFr: string
  citations: Citation[]
  nextActions: string[]
  usage: Usage
}

/** §7.2, SSE contract `TurnFailed` */
export type TurnFailure = {
  code: RefusalCode
  educationalStatus: EducationalStatus
  messageFr: string
  retryable: boolean
}

/**
 * Turn request fields besides the prompt (§22.3).
 * TODO(contract): which fields are required? The session's chapter is fixed at creation
 * (§11.5), so `chapterId` may be redundant on each turn. `options` has no defined shape.
 * Owner: Mohamed.
 */
export type TurnFields = {
  chapterId?: string
  objectiveId?: string
  options?: Record<string, unknown>
  mediaAssetId?: string
  confirmedExpression?: string
}

// ---------------------------------------------------------------------------------------------
// Resources without a response contract yet. Columns from §5.1; owner: Mohamed (OpenAPI, Week 2).
// TODO(contract): response bodies, casing, exposed columns, and column types (§5.1 lists names,
// not types: `number` / `string` below are the obvious reading) are not defined.
// Server-only columns (student_id, answer_schema, internal hashes) are deliberately left out.
// ---------------------------------------------------------------------------------------------

/** §5.1 `curriculum_chapters`; `GET /curriculum/chapters` returns published ones only (§7.1). */
export type Chapter = {
  id: string
  chapter_number: number
  title_fr: string
}

/** §5.1 `curriculum_objectives` */
export type Objective = {
  id: string
  chapter_id: string
  code: string
  title_fr: string
  order_index: number
}

/** §5.1 `tutoring_sessions.status` */
export type SessionStatus = 'active' | 'archived' | 'deleted'

/** §5.1 `tutoring_sessions` */
export type TutoringSession = {
  id: string
  chapter_id: string
  objective_id: string | null
  title: string
  status: SessionStatus
  turn_count: number
}

/** §5.1 `exercises.exercise_type`; guided multi-step is deferred (D-42). */
export type ExerciseType = 'mcq' | 'numeric_tolerance' | 'algebraic_expression'

/**
 * §5.1 `exercises` + `exercise_revisions.problem_statement_fr`.
 * `answer_schema` is never returned (§12.1, §22.3). Hints come one at a time from
 * `POST /exercises/{id}/hints`, so `hints_fr` is not part of this type.
 */
export type Exercise = {
  id: string
  chapter_id: string
  objective_id: string
  code: string
  exercise_type: ExerciseType
  difficulty_level: number
  problem_statement_fr: string
}

/** §5.1 `exercise_attempts.evaluation_result` */
export type EvaluationResult = 'correct' | 'incorrect' | 'inconclusive'

/** §5.1 `exercise_attempts` (student-visible part). */
export type ExerciseAttempt = {
  id: string
  exercise_id: string
  evaluation_result: EvaluationResult
  error_category: string | null
  feedback_fr: string
  hints_requested: number
}

/** §5.1 `study_tasks.status` */
export type StudyTaskStatus = 'pending' | 'completed' | 'skipped'

/** §5.1 `availability_windows`; `day_of_week` is 1–7. Time format is not defined. */
export type AvailabilityWindow = {
  id: string
  day_of_week: 1 | 2 | 3 | 4 | 5 | 6 | 7
  start_time: string
  end_time: string
}

/** §5.1 `study_tasks` */
export type StudyTask = {
  id: string
  objective_id: string
  title_fr: string
  scheduled_date: string
  allocated_minutes: number
  status: StudyTaskStatus
  completed_at: string | null
  order_index: number
}

/**
 * §5.1 `study_plans`. Windows and tasks are separate tables; how `GET /study-plan` returns
 * them (nested or separate) is part of the same TODO(contract).
 */
export type StudyPlan = {
  id: string
  target_weekly_hours: number
  timezone: string
  version: number
}

/**
 * §7.6 cursor pagination: `?limit=20&cursor=<opaque>`.
 * TODO(contract): the list response envelope (items + next cursor field names) is not defined.
 * Owner: Mohamed.
 */
export type PageQuery = {
  limit?: number
  cursor?: string
}
