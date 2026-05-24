-- Drop the feedback-rounds feature added in 0010. Decided against this
-- direction during UX review.

drop table if exists public.task_feedback_rounds;
drop type  if exists public.feedback_round_status;
