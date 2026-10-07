import { pool } from "@/lib/db";
export async function assertJudgeApplicationApproved(judgeId: string) {
  const result = await pool.query(
    "SELECT status,email_verified_at FROM form_submissions WHERE judge_id=$1 AND event_id='revuc-2027'",
    [judgeId],
  );
  if (result.rows.some((s) => !s.email_verified_at || !["APPROVED", "ASSIGNED"].includes(s.status)))
    throw new Error("This judging application is not currently approved. Contact the organizers.");
}
