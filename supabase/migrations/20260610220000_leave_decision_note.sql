-- T18/T19: HR decision note on leave requests (approve comment or reject reason).
alter table hr_leaves add column if not exists decision_note text;
