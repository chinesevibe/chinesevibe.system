    CONSTRAINT "hr_work_shifts_start_hour_check" CHECK ((("start_hour" >= 0) AND ("start_hour" <= 23))),
    CONSTRAINT "hr_work_shifts_start_minute_check" CHECK ((("start_minute" >= 0) AND ("start_minute" <= 59)))
);


ALTER TABLE "public"."hr_work_shifts" OWNER TO "postgres";


COMMENT ON TABLE "public"."hr_work_shifts" IS 'Master work shift templates for attendance late/OT rules';



CREATE TABLE IF NOT EXISTS "public"."inv_boms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku_id" "uuid",
    "ingredient_sku_id" "uuid",
    "quantity" numeric NOT NULL,
    "unit_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_boms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hr_branch_id" "uuid"
);


ALTER TABLE "public"."inv_branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_consumptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty" numeric NOT NULL,
    "consumption_type" "text" NOT NULL,
    "recorded_by" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_consumptions_consumption_type_check" CHECK (("consumption_type" = ANY (ARRAY['production'::"text", 'sampling'::"text", 'testing'::"text"]))),
    CONSTRAINT "inv_consumptions_qty_check" CHECK (("qty" > (0)::numeric))
);


ALTER TABLE "public"."inv_consumptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_damages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty" numeric NOT NULL,
    "damage_type" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "photo_url" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "cost_value" numeric NOT NULL,
    "approval_required_role" "text" DEFAULT 'hr'::"text" NOT NULL,
    "auto_approved" boolean DEFAULT false NOT NULL,
    "approver_id" "uuid",
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "lot_id" "uuid",
    CONSTRAINT "inv_damages_approval_required_role_check" CHECK (("approval_required_role" = ANY (ARRAY['auto'::"text", 'hr'::"text", 'admin'::"text"]))),
    CONSTRAINT "inv_damages_approved_has_approver" CHECK ((("status" <> 'approved'::"text") OR (("approver_id" IS NOT NULL) AND ("approved_at" IS NOT NULL)))),
    CONSTRAINT "inv_damages_cost_value_check" CHECK (("cost_value" >= (0)::numeric)),
    CONSTRAINT "inv_damages_damage_type_check" CHECK (("damage_type" = ANY (ARRAY['damaged'::"text", 'spoiled'::"text", 'expired'::"text", 'lost'::"text", 'adjustment'::"text"]))),
    CONSTRAINT "inv_damages_pending_has_no_decision" CHECK ((("status" <> 'pending'::"text") OR (("approved_at" IS NULL) AND ("rejected_at" IS NULL)))),
    CONSTRAINT "inv_damages_qty_check" CHECK (("qty" > (0)::numeric)),
    CONSTRAINT "inv_damages_reason_check" CHECK (("length"(TRIM(BOTH FROM "reason")) > 0)),
    CONSTRAINT "inv_damages_rejected_has_timestamp" CHECK ((("status" <> 'rejected'::"text") OR ("rejected_at" IS NOT NULL))),
    CONSTRAINT "inv_damages_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."inv_damages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_inbound_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inbound_order_id" "uuid" NOT NULL,
    "sku_id" "uuid",
    "quantity" numeric NOT NULL,
    "cost_per_unit" numeric,
    "lot_number" "text",
    "expiry_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_inbound_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_inbound_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid",
    "warehouse_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "received_date" timestamp with time zone,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_inbound_orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."inv_inbound_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_requisition_issue_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requisition_item_id" "uuid" NOT NULL,
    "lot_id" "uuid" NOT NULL,
    "qty_issued" numeric NOT NULL,
    "override_reason" "text",
    "overridden_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_requisition_issue_lines_qty_issued_check" CHECK (("qty_issued" > (0)::numeric))
);


ALTER TABLE "public"."inv_requisition_issue_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_requisition_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requisition_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty_requested" numeric NOT NULL,
    "qty_approved" numeric DEFAULT 0 NOT NULL,
    "qty_issued" numeric DEFAULT 0 NOT NULL,
    "qty_received" numeric DEFAULT 0 NOT NULL,
    "lot_number" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_req_items_qty_approved_lte_requested" CHECK (("qty_approved" <= "qty_requested")),
    CONSTRAINT "inv_req_items_qty_issued_lte_approved" CHECK (("qty_issued" <= "qty_approved")),
    CONSTRAINT "inv_req_items_qty_received_lte_issued" CHECK (("qty_received" <= "qty_issued")),
    CONSTRAINT "inv_requisition_items_qty_approved_check" CHECK (("qty_approved" >= (0)::numeric)),
    CONSTRAINT "inv_requisition_items_qty_issued_check" CHECK (("qty_issued" >= (0)::numeric)),
    CONSTRAINT "inv_requisition_items_qty_received_check" CHECK (("qty_received" >= (0)::numeric)),
    CONSTRAINT "inv_requisition_items_qty_requested_check" CHECK (("qty_requested" > (0)::numeric))
);


ALTER TABLE "public"."inv_requisition_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_requisitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "notes" "text",
    "rejection_reason" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "issued_by" "uuid",
    "issued_at" timestamp with time zone,
    "received_by" "uuid",
    "received_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_requisitions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'issued'::"text", 'completed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."inv_requisitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_skus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "unit_id" "uuid",
    "barcode" "text",
    "min_stock" numeric DEFAULT 0 NOT NULL,
    "max_stock" numeric DEFAULT 0 NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expiry_required" boolean DEFAULT false NOT NULL,
    "lot_tracking_required" boolean DEFAULT true NOT NULL,
    "default_issue_method" "text" DEFAULT 'fefo'::"text" NOT NULL,
    "shelf_life_days" integer,
    "storage_type" "text",
    CONSTRAINT "inv_skus_default_issue_method_check" CHECK (("default_issue_method" = ANY (ARRAY['fefo'::"text", 'fifo'::"text", 'manual'::"text"]))),
    CONSTRAINT "inv_skus_shelf_life_days_check" CHECK ((("shelf_life_days" IS NULL) OR ("shelf_life_days" > 0))),
    CONSTRAINT "inv_skus_storage_type_check" CHECK ((("storage_type" IS NULL) OR ("storage_type" = ANY (ARRAY['dry'::"text", 'chilled'::"text", 'frozen'::"text"]))))
);


ALTER TABLE "public"."inv_skus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid",
    "warehouse_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty_delta" numeric NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "applied_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_stock_adjustments_qty_delta_check" CHECK (("qty_delta" <> (0)::numeric)),
    CONSTRAINT "inv_stock_adjustments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'applied'::"text"])))
);


ALTER TABLE "public"."inv_stock_adjustments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "quantity" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_stock_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_count_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "system_qty" numeric NOT NULL,
    "physical_qty" numeric,
    "lot_number" "text",
    "counted_by" "uuid",
    "counted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lot_id" "uuid",
    CONSTRAINT "inv_stock_count_items_physical_qty_check" CHECK ((("physical_qty" IS NULL) OR ("physical_qty" >= (0)::numeric))),
    CONSTRAINT "inv_stock_count_items_system_qty_check" CHECK (("system_qty" >= (0)::numeric))
);


ALTER TABLE "public"."inv_stock_count_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_counts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "scope" "text" DEFAULT 'all'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "planned_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_stock_counts_scope_check" CHECK (("scope" = ANY (ARRAY['all'::"text", 'category'::"text", 'sku'::"text"]))),
    CONSTRAINT "inv_stock_counts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'counting'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."inv_stock_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "lot_number" "text" NOT NULL,
    "batch_number" "text",
    "supplier_lot_ref" "text",
    "expiry_date" "date",
    "manufactured_date" "date",
    "received_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "received_qty" numeric NOT NULL,
    "remaining_qty" numeric NOT NULL,
    "unit_cost" numeric,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "inbound_item_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_stock_lots_received_qty_check" CHECK (("received_qty" > (0)::numeric)),
    CONSTRAINT "inv_stock_lots_remaining_lte_received" CHECK (("remaining_qty" <= "received_qty")),
    CONSTRAINT "inv_stock_lots_remaining_qty_check" CHECK (("remaining_qty" >= (0)::numeric)),
    CONSTRAINT "inv_stock_lots_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'reserved'::"text", 'expired'::"text", 'damaged'::"text", 'depleted'::"text"])))
);


ALTER TABLE "public"."inv_stock_lots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "movement_type" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "reference_type" "text",
    "reference_id" "uuid",
    "lot_number" "text",
    "created_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lot_id" "uuid",
    "qty_before" numeric,
    "qty_after" numeric,
    CONSTRAINT "inv_stock_movements_quantity_nonzero" CHECK (("quantity" <> (0)::numeric))
);


ALTER TABLE "public"."inv_stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "contact" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_transfer_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty_sent" numeric NOT NULL,
    "qty_received" numeric DEFAULT 0 NOT NULL,
    "lot_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lot_id" "uuid",
    "source_lot_id" "uuid",
    CONSTRAINT "inv_transfer_items_qty_received_check" CHECK (("qty_received" >= (0)::numeric)),
    CONSTRAINT "inv_transfer_items_qty_received_lte_sent" CHECK (("qty_received" <= "qty_sent")),
    CONSTRAINT "inv_transfer_items_qty_sent_check" CHECK (("qty_sent" > (0)::numeric))
);


ALTER TABLE "public"."inv_transfer_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_warehouse_id" "uuid" NOT NULL,
    "to_warehouse_id" "uuid" NOT NULL,
    "from_branch_id" "uuid" NOT NULL,
    "to_branch_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "shipper" "text",
    "created_by" "uuid" NOT NULL,
    "sent_by" "uuid",
    "received_by" "uuid",
    "sent_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_transfers_branches_distinct" CHECK (("from_branch_id" <> "to_branch_id")),
    CONSTRAINT "inv_transfers_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'in_transit'::"text", 'received'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "inv_transfers_warehouses_distinct" CHECK (("from_warehouse_id" <> "to_warehouse_id"))
);


ALTER TABLE "public"."inv_transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_unit_conversions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_unit_id" "uuid",
    "to_unit_id" "uuid",
    "factor" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_unit_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "abbreviation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_warehouses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'main'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_warehouses_type_check" CHECK (("type" = ANY (ARRAY['main'::"text", 'sub'::"text"])))
);


ALTER TABLE "public"."inv_warehouses" OWNER TO "postgres";


ALTER TABLE ONLY "public"."hr_alerts"
    ADD CONSTRAINT "hr_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_announcements"
    ADD CONSTRAINT "hr_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_attendance_corrections"
    ADD CONSTRAINT "hr_attendance_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_attendance"
    ADD CONSTRAINT "hr_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_attendance_submissions"
    ADD CONSTRAINT "hr_attendance_submissions_attendance_id_key" UNIQUE ("attendance_id");



ALTER TABLE ONLY "public"."hr_attendance_submissions"
    ADD CONSTRAINT "hr_attendance_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_branches"
    ADD CONSTRAINT "hr_branches_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."hr_branches"
    ADD CONSTRAINT "hr_branches_manager_employee_id_key" UNIQUE ("manager_employee_id");



ALTER TABLE ONLY "public"."hr_branches"
    ADD CONSTRAINT "hr_branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_complaint_replies"
    ADD CONSTRAINT "hr_complaint_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_complaints"
    ADD CONSTRAINT "hr_complaints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_complaints"
    ADD CONSTRAINT "hr_complaints_ticket_code_key" UNIQUE ("ticket_code");



ALTER TABLE ONLY "public"."hr_compliance_notes"
    ADD CONSTRAINT "hr_compliance_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_departments"
    ADD CONSTRAINT "hr_departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_document_requests"
    ADD CONSTRAINT "hr_document_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_employees"
    ADD CONSTRAINT "hr_employees_line_user_id_key" UNIQUE ("line_user_id");



ALTER TABLE ONLY "public"."hr_employees"
    ADD CONSTRAINT "hr_employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_leave_balances"
    ADD CONSTRAINT "hr_leave_balances_pkey" PRIMARY KEY ("employee_id", "leave_type");



ALTER TABLE ONLY "public"."hr_leave_policy_defaults"
    ADD CONSTRAINT "hr_leave_policy_defaults_pkey" PRIMARY KEY ("leave_type");



ALTER TABLE ONLY "public"."hr_leaves"
    ADD CONSTRAINT "hr_leaves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_line_pending_actions"
    ADD CONSTRAINT "hr_line_pending_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_overtime_requests"
    ADD CONSTRAINT "hr_overtime_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payroll_config"
    ADD CONSTRAINT "hr_payroll_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."hr_payroll_hour_lines"
    ADD CONSTRAINT "hr_payroll_hour_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payroll_hour_lines"
    ADD CONSTRAINT "hr_payroll_hour_lines_source_type_source_id_key" UNIQUE ("source_type", "source_id");



ALTER TABLE ONLY "public"."hr_payroll_periods"
    ADD CONSTRAINT "hr_payroll_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payroll_periods"
    ADD CONSTRAINT "hr_payroll_periods_year_month_branch_id_key" UNIQUE ("year", "month", "branch_id");



ALTER TABLE ONLY "public"."hr_payroll_runs"
    ADD CONSTRAINT "hr_payroll_runs_period_key" UNIQUE ("period");



ALTER TABLE ONLY "public"."hr_payroll_runs"
    ADD CONSTRAINT "hr_payroll_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payslip_lines"
    ADD CONSTRAINT "hr_payslip_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payslips"
    ADD CONSTRAINT "hr_payslips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payslips"
    ADD CONSTRAINT "hr_payslips_run_id_employee_id_key" UNIQUE ("run_id", "employee_id");



ALTER TABLE ONLY "public"."hr_positions"
    ADD CONSTRAINT "hr_positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_runtime_config"
    ADD CONSTRAINT "hr_runtime_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."hr_work_shifts"
    ADD CONSTRAINT "hr_work_shifts_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."hr_work_shifts"
    ADD CONSTRAINT "hr_work_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_boms"
    ADD CONSTRAINT "inv_boms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_branches"
    ADD CONSTRAINT "inv_branches_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."inv_branches"
    ADD CONSTRAINT "inv_branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_consumptions"
    ADD CONSTRAINT "inv_consumptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_inbound_items"
    ADD CONSTRAINT "inv_inbound_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_inbound_orders"
    ADD CONSTRAINT "inv_inbound_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_requisition_issue_lines"
    ADD CONSTRAINT "inv_requisition_issue_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_requisition_items"
    ADD CONSTRAINT "inv_requisition_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_skus"
    ADD CONSTRAINT "inv_skus_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."inv_skus"
    ADD CONSTRAINT "inv_skus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_balances"
    ADD CONSTRAINT "inv_stock_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_balances"
    ADD CONSTRAINT "inv_stock_balances_sku_id_warehouse_id_key" UNIQUE ("sku_id", "warehouse_id");



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_counts"
    ADD CONSTRAINT "inv_stock_counts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_warehouse_sku_lot_unique" UNIQUE ("warehouse_id", "sku_id", "lot_number");



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_suppliers"
    ADD CONSTRAINT "inv_suppliers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."inv_suppliers"
    ADD CONSTRAINT "inv_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_transfer_sku_unique" UNIQUE ("transfer_id", "sku_id");



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_unit_conversions"
    ADD CONSTRAINT "inv_unit_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_units"
