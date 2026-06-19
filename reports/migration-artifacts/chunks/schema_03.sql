    where w.id = p_warehouse_id
      and w.branch_id = p_branch_id
      and w.is_active = true
  ) then
    raise exception 'warehouse does not belong to branch';
  end if;
end;
$$;


ALTER FUNCTION "public"."inv_validate_branch_warehouse"("p_branch_id" "uuid", "p_warehouse_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."hr_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "alert_type" "text" NOT NULL,
    "trigger_date" "date" NOT NULL,
    "sent_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_alerts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."hr_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "target_type" "text" DEFAULT 'all'::"text" NOT NULL,
    "target_value" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_at" timestamp with time zone,
    "image_path" "text",
    CONSTRAINT "hr_announcements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sent'::"text"]))),
    CONSTRAINT "hr_announcements_target_type_check" CHECK (("target_type" = ANY (ARRAY['all'::"text", 'department'::"text"])))
);


ALTER TABLE "public"."hr_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "check_in_at" timestamp with time zone NOT NULL,
    "check_out_at" timestamp with time zone,
    "check_in_location" "jsonb",
    "is_late" boolean DEFAULT false NOT NULL,
    "work_hours" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "work_shift_id" "uuid",
    "shift_date" "date",
    "check_out_location" "jsonb",
    "location_review_status" "text" DEFAULT 'clear'::"text" NOT NULL,
    "location_review_flags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "location_review_note" "text",
    "location_reviewed_by" "uuid",
    "location_reviewed_at" timestamp with time zone,
    CONSTRAINT "hr_attendance_location_review_status_check" CHECK (("location_review_status" = ANY (ARRAY['clear'::"text", 'pending_hr'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hr_attendance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hr_attendance"."check_in_location" IS 'Raw check-in location payload including lat/lng and optional anti-spoof metadata';



COMMENT ON COLUMN "public"."hr_attendance"."work_shift_id" IS 'Shift snapshot at check-in';



COMMENT ON COLUMN "public"."hr_attendance"."shift_date" IS 'Logical shift day (important for overnight shifts)';



COMMENT ON COLUMN "public"."hr_attendance"."check_out_location" IS 'Raw check-out location payload including lat/lng and optional anti-spoof metadata';



COMMENT ON COLUMN "public"."hr_attendance"."location_review_status" IS 'Location trust state: clear, pending_hr, approved, rejected';



COMMENT ON COLUMN "public"."hr_attendance"."location_review_flags" IS 'Suspicious location flags collected during check-in/out review';



CREATE TABLE IF NOT EXISTS "public"."hr_attendance_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "correction_type" "text" NOT NULL,
    "source" "text" DEFAULT 'employee'::"text" NOT NULL,
    "attendance_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_attendance_corrections_correction_type_check" CHECK (("correction_type" = ANY (ARRAY['checkin'::"text", 'checkout'::"text"]))),
    CONSTRAINT "hr_attendance_corrections_source_check" CHECK (("source" = ANY (ARRAY['employee'::"text", 'hr'::"text"])))
);


ALTER TABLE "public"."hr_attendance_corrections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_attendance_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attendance_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "approval_status" "text" DEFAULT 'pending_manager'::"text" NOT NULL,
    "manager_decided_by" "uuid",
    "manager_decided_at" timestamp with time zone,
    "hr_decided_by" "uuid",
    "hr_decided_at" timestamp with time zone,
    "decision_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_attendance_submissions_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending_manager'::"text", 'pending_hr'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."hr_attendance_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "manager_employee_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "geofence_radius_m" integer DEFAULT 200 NOT NULL,
    "geofence_enabled" boolean DEFAULT true NOT NULL,
    CONSTRAINT "hr_branches_geofence_radius_m_check" CHECK ((("geofence_radius_m" > 0) AND ("geofence_radius_m" <= 200)))
);


ALTER TABLE "public"."hr_branches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hr_branches"."address" IS 'ที่อยู่สาขา — แสดงใน Branch detail';



COMMENT ON COLUMN "public"."hr_branches"."latitude" IS 'ศูนย์ geofence — ละติจูด';



COMMENT ON COLUMN "public"."hr_branches"."longitude" IS 'ศูนย์ geofence — ลองจิจูด';



COMMENT ON COLUMN "public"."hr_branches"."geofence_radius_m" IS 'รัศมี geofence (สูงสุด 200m)';



COMMENT ON COLUMN "public"."hr_branches"."geofence_enabled" IS 'เปิด geofence สำหรับเช็คอิน/ออก — Head Office (000) ไม่ใช้';



CREATE TABLE IF NOT EXISTS "public"."hr_complaint_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "complaint_id" "uuid" NOT NULL,
    "author_employee_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_complaint_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_complaints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "ticket_code" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_complaints_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'replied'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."hr_complaints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_compliance_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "note" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_compliance_notes_category_check" CHECK (("category" = ANY (ARRAY['probation'::"text", 'visa'::"text", 'work_permit'::"text", 'contract'::"text", 'blacklist'::"text"])))
);


ALTER TABLE "public"."hr_compliance_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "branch_id" "uuid"
);


ALTER TABLE "public"."hr_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_document_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "doc_type" "text" NOT NULL,
    "copies" smallint DEFAULT 1 NOT NULL,
    "purpose" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "hr_note" "text",
    "result_file_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_document_requests_copies_check" CHECK ((("copies" >= 1) AND ("copies" <= 10))),
    CONSTRAINT "hr_document_requests_doc_type_check" CHECK (("doc_type" = ANY (ARRAY['employment_cert'::"text", 'salary_cert'::"text", 'tax_cert'::"text", 'other'::"text"]))),
    CONSTRAINT "hr_document_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'on_hold'::"text", 'processing'::"text", 'ready'::"text", 'completed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hr_document_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_user_id" "text",
    "name" "text" NOT NULL,
    "position" "text",
    "department" "text",
    "salary" numeric(12,2),
    "contract_start" "date",
    "probation_end" "date",
    "visa_expiry" "date",
    "work_permit_expiry" "date",
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date_of_birth" "date",
    "phone" "text",
    "email" "text",
    "contract_type" "text",
    "contract_end" "date",
    "probation_outcome" "text",
    "probation_outcome_note" "text",
    "probation_extended_until" "date",
    "branch_id" "uuid",
    "department_id" "uuid",
    "employee_code" "text",
    "salary_payment_method" "text",
    "bank_name" "text",
    "bank_account_name" "text",
    "bank_account_number" "text",
    "bank_branch" "text",
    "leave_blacklisted" boolean DEFAULT false NOT NULL,
    "leave_blacklist_reason" "text",
    "leave_blacklisted_at" timestamp with time zone,
    "avatar_path" "text",
    "contract_file_path" "text",
    "contract_file_name" "text",
    "contract_uploaded_at" timestamp with time zone,
    "work_shift_id" "uuid",
    "default_check_in_time" time without time zone,
    "default_check_out_time" time without time zone,
    "pay_type" "text" DEFAULT 'hourly'::"text" NOT NULL,
    "nationality" "text",
    "pay_day" smallint,
    "preferred_locale" "text" DEFAULT 'th'::"text" NOT NULL,
    "locale_source" "text" DEFAULT 'line'::"text" NOT NULL,
    "housing_allowance" numeric(12,2),
    "portal_password_hash" "text",
    CONSTRAINT "hr_employees_contract_type_check" CHECK ((("contract_type" IS NULL) OR ("contract_type" = ANY (ARRAY['full_time'::"text", 'part_time'::"text", 'contract'::"text"])))),
    CONSTRAINT "hr_employees_locale_source_check" CHECK (("locale_source" = ANY (ARRAY['line'::"text", 'manual'::"text"]))),
    CONSTRAINT "hr_employees_nationality_check" CHECK ((("nationality" IS NULL) OR ("nationality" = ANY (ARRAY['thai'::"text", 'myanmar'::"text", 'chinese'::"text"])))),
    CONSTRAINT "hr_employees_pay_day_check" CHECK ((("pay_day" IS NULL) OR ("pay_day" = ANY (ARRAY[4, 5])))),
    CONSTRAINT "hr_employees_pay_type_check" CHECK (("pay_type" = ANY (ARRAY['monthly'::"text", 'hourly'::"text"]))),
    CONSTRAINT "hr_employees_preferred_locale_check" CHECK (("preferred_locale" = ANY (ARRAY['th'::"text", 'en'::"text", 'zh'::"text", 'my'::"text"]))),
    CONSTRAINT "hr_employees_probation_outcome_check" CHECK ((("probation_outcome" IS NULL) OR ("probation_outcome" = ANY (ARRAY['passed'::"text", 'failed'::"text", 'extended'::"text"])))),
    CONSTRAINT "hr_employees_role_check" CHECK (("role" = ANY (ARRAY['employee'::"text", 'hr'::"text", 'inventory'::"text", 'branch_manager'::"text", 'ceo'::"text", 'dev'::"text"]))),
    CONSTRAINT "hr_employees_salary_payment_method_check" CHECK ((("salary_payment_method" IS NULL) OR ("salary_payment_method" = ANY (ARRAY['cash'::"text", 'bank'::"text"])))),
    CONSTRAINT "hr_employees_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."hr_employees" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hr_employees"."salary_payment_method" IS 'cash = รับเงินสด, bank = โอนเข้าบัญชีธนาคาร';



COMMENT ON COLUMN "public"."hr_employees"."work_shift_id" IS 'HR-assigned shift; used by check-in/out (Phase 3)';



COMMENT ON COLUMN "public"."hr_employees"."default_check_in_time" IS 'Employee-level default check-in time. Used as attendance fallback when no shift is assigned.';



COMMENT ON COLUMN "public"."hr_employees"."default_check_out_time" IS 'Employee-level default check-out time. Used as attendance fallback when no shift is assigned.';



COMMENT ON COLUMN "public"."hr_employees"."nationality" IS 'thai | myanmar | chinese — drives default pay_day';



COMMENT ON COLUMN "public"."hr_employees"."pay_day" IS 'Payroll transfer day of month (4 or 5). Overrides nationality default when set.';



COMMENT ON COLUMN "public"."hr_employees"."preferred_locale" IS 'UI language: th=Thai, en=English, zh=Chinese, my=Myanmar (Burmese)';



COMMENT ON COLUMN "public"."hr_employees"."locale_source" IS 'line = follow LINE app language (LIFF sync); manual = user picked in Portal';



COMMENT ON COLUMN "public"."hr_employees"."portal_password_hash" IS 'Scrypt hash for employee-code portal login; required for Officer department staff.';



CREATE TABLE IF NOT EXISTS "public"."hr_leave_balances" (
    "employee_id" "uuid" NOT NULL,
    "leave_type" "text" NOT NULL,
    "total_days" numeric(5,2) DEFAULT 0 NOT NULL,
    "used_days" numeric(5,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_leave_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_leave_policy_defaults" (
    "leave_type" "text" NOT NULL,
    "annual_days" numeric(5,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_leave_policy_defaults_leave_type_check" CHECK (("leave_type" = ANY (ARRAY['sick'::"text", 'personal'::"text", 'annual'::"text", 'maternity'::"text", 'unpaid'::"text", 'emergency'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."hr_leave_policy_defaults" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_leaves" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "attachment_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decision_note" "text",
    "leave_unit" "text" DEFAULT 'days'::"text" NOT NULL,
    "leave_hours" numeric(5,2),
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "approval_status" "text" DEFAULT 'pending_manager'::"text" NOT NULL,
    "manager_decided_by" "uuid",
    "manager_decided_at" timestamp with time zone,
    "hr_decided_by" "uuid",
    "hr_decided_at" timestamp with time zone,
    "medical_certificate_url" "text",
    CONSTRAINT "hr_leaves_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending_manager'::"text", 'pending_hr'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "hr_leaves_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "hr_leaves_leave_unit_check" CHECK (("leave_unit" = ANY (ARRAY['days'::"text", 'hours'::"text"]))),
    CONSTRAINT "hr_leaves_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hr_leaves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_line_pending_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_user_id" "text" NOT NULL,
    "approver_employee_id" "uuid" NOT NULL,
    "action_kind" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_line_pending_actions_action_kind_check" CHECK (("action_kind" = ANY (ARRAY['reject_leave'::"text", 'reject_ot'::"text", 'reject_registration'::"text", 'reject_document'::"text", 'reject_attendance'::"text", 'complaint_reply'::"text", 'complaint_close'::"text"])))
);


ALTER TABLE "public"."hr_line_pending_actions" OWNER TO "postgres";


COMMENT ON TABLE "public"."hr_line_pending_actions" IS 'LINE OA pending HR text input (reject reason / complaint reply). Service role only.';



CREATE TABLE IF NOT EXISTS "public"."hr_overtime_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "decision_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_by" "uuid",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approval_status" "text" DEFAULT 'pending_hr'::"text" NOT NULL,
    "hr_decided_by" "uuid",
    "hr_decided_at" timestamp with time zone,
    "manager_decided_by" "uuid",
    "manager_decided_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    CONSTRAINT "hr_overtime_end_after_start" CHECK (("end_time" > "start_time")),
    CONSTRAINT "hr_overtime_requests_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending_manager'::"text", 'pending_hr'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "hr_overtime_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hr_overtime_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payroll_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_payroll_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payroll_hour_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "line_type" "text" NOT NULL,
    "hours" numeric(8,2) NOT NULL,
    "work_date" "date" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_payroll_hour_lines_line_type_check" CHECK (("line_type" = ANY (ARRAY['regular'::"text", 'overtime'::"text", 'sick_hourly'::"text"])))
);


ALTER TABLE "public"."hr_payroll_hour_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payroll_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "branch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_payroll_periods_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."hr_payroll_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payroll_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "cutoff_day" integer,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "locked_at" timestamp with time zone,
    "locked_by" "uuid",
    "employee_count" integer DEFAULT 0 NOT NULL,
    "total_gross" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_net" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_payroll_runs_cutoff_day_check" CHECK ((("cutoff_day" >= 1) AND ("cutoff_day" <= 31))),
    CONSTRAINT "hr_payroll_runs_period_check" CHECK (("period" ~ '^\d{4}-\d{2}$'::"text")),
    CONSTRAINT "hr_payroll_runs_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'locked'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."hr_payroll_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payslip_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payslip_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_payslip_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payslips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "pay_type" "text" NOT NULL,
    "pay_day" integer NOT NULL,
    "payment_date" "date" NOT NULL,
    "gross_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "sso_deduction" numeric(12,2) DEFAULT 0 NOT NULL,
    "other_deductions" numeric(12,2) DEFAULT 0 NOT NULL,
    "tax_deduction" numeric(12,2) DEFAULT 0 NOT NULL,
    "net_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "pdf_path" "text",
    "regular_hours" numeric(8,2) DEFAULT 0 NOT NULL,
    "ot_hours" numeric(8,2) DEFAULT 0 NOT NULL,
    "sick_hours" numeric(8,2) DEFAULT 0 NOT NULL,
    "annual_hours" numeric(8,2) DEFAULT 0 NOT NULL,
    "base_rate" numeric(12,2),
    "monthly_salary" numeric(12,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_payslips_pay_day_check" CHECK (("pay_day" = ANY (ARRAY[4, 5]))),
    CONSTRAINT "hr_payslips_pay_type_check" CHECK (("pay_type" = ANY (ARRAY['monthly'::"text", 'hourly'::"text"]))),
    CONSTRAINT "hr_payslips_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'final'::"text"])))
);


ALTER TABLE "public"."hr_payslips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "department_id" "uuid",
    "branch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_runtime_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_runtime_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_work_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "start_hour" smallint NOT NULL,
    "start_minute" smallint DEFAULT 0 NOT NULL,
    "end_hour" smallint NOT NULL,
    "end_minute" smallint DEFAULT 0 NOT NULL,
    "crosses_midnight" boolean DEFAULT false NOT NULL,
    "grace_minutes" smallint DEFAULT 10 NOT NULL,
    "standard_hours" numeric(4,2) NOT NULL,
    "check_in_early_minutes" smallint DEFAULT 60 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_work_shifts_check_in_early_minutes_check" CHECK ((("check_in_early_minutes" >= 0) AND ("check_in_early_minutes" <= 240))),
    CONSTRAINT "hr_work_shifts_end_hour_check" CHECK ((("end_hour" >= 0) AND ("end_hour" <= 23))),
    CONSTRAINT "hr_work_shifts_end_minute_check" CHECK ((("end_minute" >= 0) AND ("end_minute" <= 59))),
    CONSTRAINT "hr_work_shifts_grace_minutes_check" CHECK ((("grace_minutes" >= 0) AND ("grace_minutes" <= 120))),
    CONSTRAINT "hr_work_shifts_standard_hours_check" CHECK ((("standard_hours" > (0)::numeric) AND ("standard_hours" <= (24)::numeric))),
