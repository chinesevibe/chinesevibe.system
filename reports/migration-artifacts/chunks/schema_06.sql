    ADD CONSTRAINT "inv_damages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_inbound_items"
    ADD CONSTRAINT "inv_inbound_items_inbound_order_id_fkey" FOREIGN KEY ("inbound_order_id") REFERENCES "public"."inv_inbound_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_inbound_items"
    ADD CONSTRAINT "inv_inbound_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id");



ALTER TABLE ONLY "public"."inv_inbound_orders"
    ADD CONSTRAINT "inv_inbound_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id");



ALTER TABLE ONLY "public"."inv_inbound_orders"
    ADD CONSTRAINT "inv_inbound_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."inv_suppliers"("id");



ALTER TABLE ONLY "public"."inv_inbound_orders"
    ADD CONSTRAINT "inv_inbound_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id");



ALTER TABLE ONLY "public"."inv_requisition_issue_lines"
    ADD CONSTRAINT "inv_requisition_issue_lines_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_requisition_issue_lines"
    ADD CONSTRAINT "inv_requisition_issue_lines_overridden_by_fkey" FOREIGN KEY ("overridden_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_requisition_issue_lines"
    ADD CONSTRAINT "inv_requisition_issue_lines_requisition_item_id_fkey" FOREIGN KEY ("requisition_item_id") REFERENCES "public"."inv_requisition_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_requisition_items"
    ADD CONSTRAINT "inv_requisition_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."inv_requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_requisition_items"
    ADD CONSTRAINT "inv_requisition_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_skus"
    ADD CONSTRAINT "inv_skus_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."inv_units"("id");



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."inv_stock_counts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_balances"
    ADD CONSTRAINT "inv_stock_balances_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_stock_balances"
    ADD CONSTRAINT "inv_stock_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."inv_stock_counts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_counted_by_fkey" FOREIGN KEY ("counted_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_counts"
    ADD CONSTRAINT "inv_stock_counts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_counts"
    ADD CONSTRAINT "inv_stock_counts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_counts"
    ADD CONSTRAINT "inv_stock_counts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_inbound_item_id_fkey" FOREIGN KEY ("inbound_item_id") REFERENCES "public"."inv_inbound_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_source_lot_id_fkey" FOREIGN KEY ("source_lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."inv_transfers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_unit_conversions"
    ADD CONSTRAINT "inv_unit_conversions_from_unit_id_fkey" FOREIGN KEY ("from_unit_id") REFERENCES "public"."inv_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_unit_conversions"
    ADD CONSTRAINT "inv_unit_conversions_to_unit_id_fkey" FOREIGN KEY ("to_unit_id") REFERENCES "public"."inv_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_warehouses"
    ADD CONSTRAINT "inv_warehouses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE CASCADE;



CREATE POLICY "alerts delete hr only" ON "public"."hr_alerts" FOR DELETE TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "alerts insert hr only" ON "public"."hr_alerts" FOR INSERT TO "authenticated" WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "alerts select hr only" ON "public"."hr_alerts" FOR SELECT TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "alerts update hr only" ON "public"."hr_alerts" FOR UPDATE TO "authenticated" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "attendance delete hr only" ON "public"."hr_attendance" FOR DELETE TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "attendance insert self or hr" ON "public"."hr_attendance" FOR INSERT TO "authenticated" WITH CHECK ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "attendance select self or hr" ON "public"."hr_attendance" FOR SELECT TO "authenticated" USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_can_read_company"()));



CREATE POLICY "attendance update self or hr" ON "public"."hr_attendance" FOR UPDATE TO "authenticated" USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"())) WITH CHECK ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "employees delete hr only" ON "public"."hr_employees" FOR DELETE TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "employees insert hr only" ON "public"."hr_employees" FOR INSERT TO "authenticated" WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "employees select self or hr" ON "public"."hr_employees" FOR SELECT TO "authenticated" USING ((("id" = "public"."hr_employee_id"()) OR "public"."hr_can_read_company"()));



CREATE POLICY "employees update hr or ceo" ON "public"."hr_employees" FOR UPDATE TO "authenticated" USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"())) WITH CHECK (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"()));



ALTER TABLE "public"."hr_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_announcements_delete" ON "public"."hr_announcements" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_announcements_insert" ON "public"."hr_announcements" FOR INSERT WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_announcements_select" ON "public"."hr_announcements" FOR SELECT USING (("public"."hr_can_read_company"() OR ("status" = 'sent'::"text")));



CREATE POLICY "hr_announcements_update" ON "public"."hr_announcements" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_att_sub_insert" ON "public"."hr_attendance_submissions" FOR INSERT WITH CHECK (("employee_id" = "public"."hr_employee_id"()));



CREATE POLICY "hr_att_sub_select" ON "public"."hr_attendance_submissions" FOR SELECT USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_can_read_company"() OR ("public"."hr_is_branch_manager"() AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



CREATE POLICY "hr_att_sub_update" ON "public"."hr_attendance_submissions" FOR UPDATE USING (("public"."hr_is_hr_admin"() OR ("public"."hr_is_branch_manager"() AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



ALTER TABLE "public"."hr_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_attendance_corrections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_attendance_corrections_hr_all" ON "public"."hr_attendance_corrections" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."hr_employees" "e"
  WHERE (("e"."line_user_id" = ("auth"."jwt"() ->> 'line_user_id'::"text")) AND ("e"."role" = ANY (ARRAY['hr'::"text", 'ceo'::"text", 'dev'::"text", 'inventory'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."hr_employees" "e"
  WHERE (("e"."line_user_id" = ("auth"."jwt"() ->> 'line_user_id'::"text")) AND ("e"."role" = ANY (ARRAY['hr'::"text", 'ceo'::"text", 'dev'::"text", 'inventory'::"text"]))))));



CREATE POLICY "hr_attendance_corrections_self_select" ON "public"."hr_attendance_corrections" FOR SELECT TO "authenticated" USING (("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."line_user_id" = ("auth"."jwt"() ->> 'line_user_id'::"text")))));



ALTER TABLE "public"."hr_attendance_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_branches_select" ON "public"."hr_branches" FOR SELECT USING (("public"."hr_can_read_company"() OR "public"."hr_is_branch_manager"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "hr_branches_write" ON "public"."hr_branches" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_complaint_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_complaint_replies_delete" ON "public"."hr_complaint_replies" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_complaint_replies_insert" ON "public"."hr_complaint_replies" FOR INSERT WITH CHECK (("public"."hr_is_hr_admin"() AND ("author_employee_id" = "public"."hr_employee_id"())));



CREATE POLICY "hr_complaint_replies_select" ON "public"."hr_complaint_replies" FOR SELECT USING (("public"."hr_is_hr_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."hr_complaints" "c"
  WHERE (("c"."id" = "hr_complaint_replies"."complaint_id") AND (NOT "c"."is_anonymous") AND ("c"."employee_id" = "public"."hr_employee_id"()))))));



ALTER TABLE "public"."hr_complaints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_complaints_insert" ON "public"."hr_complaints" FOR INSERT WITH CHECK ((("public"."hr_employee_id"() IS NOT NULL) AND (((NOT "is_anonymous") AND ("employee_id" = "public"."hr_employee_id"())) OR ("is_anonymous" AND ("employee_id" IS NULL)))));



CREATE POLICY "hr_complaints_select" ON "public"."hr_complaints" FOR SELECT USING (("public"."hr_is_hr_admin"() OR ((NOT "is_anonymous") AND ("employee_id" = "public"."hr_employee_id"()))));



CREATE POLICY "hr_complaints_update" ON "public"."hr_complaints" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_compliance_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_compliance_notes_delete" ON "public"."hr_compliance_notes" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_compliance_notes_insert" ON "public"."hr_compliance_notes" FOR INSERT WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_compliance_notes_select" ON "public"."hr_compliance_notes" FOR SELECT USING ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_departments_delete" ON "public"."hr_departments" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_departments_insert" ON "public"."hr_departments" FOR INSERT WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_departments_select" ON "public"."hr_departments" FOR SELECT USING (("public"."hr_can_read_company"() OR ("public"."hr_employee_id"() IS NOT NULL) OR "public"."hr_is_branch_manager"()));



CREATE POLICY "hr_departments_update" ON "public"."hr_departments" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_document_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_document_requests_delete" ON "public"."hr_document_requests" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_document_requests_insert" ON "public"."hr_document_requests" FOR INSERT WITH CHECK (("employee_id" = "public"."hr_employee_id"()));



CREATE POLICY "hr_document_requests_select" ON "public"."hr_document_requests" FOR SELECT USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "hr_document_requests_update" ON "public"."hr_document_requests" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_leave_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_leave_policy_defaults" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_leaves" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_leaves_update" ON "public"."hr_leaves" FOR UPDATE USING (("public"."hr_is_hr_admin"() OR ("public"."hr_is_branch_manager"() AND ("approval_status" = 'pending_manager'::"text") AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



ALTER TABLE "public"."hr_line_pending_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_overtime_insert" ON "public"."hr_overtime_requests" FOR INSERT WITH CHECK (("public"."hr_is_hr_admin"() OR ("employee_id" = "public"."hr_employee_id"()) OR ("public"."hr_is_branch_manager"() AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



ALTER TABLE "public"."hr_overtime_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_overtime_select" ON "public"."hr_overtime_requests" FOR SELECT USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_can_read_company"() OR ("public"."hr_is_branch_manager"() AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



CREATE POLICY "hr_overtime_update" ON "public"."hr_overtime_requests" FOR UPDATE USING (("public"."hr_is_hr_admin"() OR ("public"."hr_is_branch_manager"() AND ("approval_status" = 'pending_manager'::"text") AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"())))))) WITH CHECK (true);



ALTER TABLE "public"."hr_payroll_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payroll_config_select" ON "public"."hr_payroll_config" FOR SELECT USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_payroll_config_upsert" ON "public"."hr_payroll_config" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payroll_hour_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payroll_lines_select" ON "public"."hr_payroll_hour_lines" FOR SELECT USING ("public"."hr_can_read_company"());



CREATE POLICY "hr_payroll_lines_write" ON "public"."hr_payroll_hour_lines" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payroll_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payroll_periods_select" ON "public"."hr_payroll_periods" FOR SELECT USING ("public"."hr_can_read_company"());



CREATE POLICY "hr_payroll_periods_write" ON "public"."hr_payroll_periods" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payroll_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payroll_runs_hr" ON "public"."hr_payroll_runs" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payslip_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payslip_lines_select" ON "public"."hr_payslip_lines" FOR SELECT USING (("public"."hr_is_hr_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."hr_payslips" "p"
  WHERE (("p"."id" = "hr_payslip_lines"."payslip_id") AND ("p"."employee_id" = "public"."hr_employee_id"()))))));



CREATE POLICY "hr_payslip_lines_write" ON "public"."hr_payslip_lines" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payslips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payslips_select" ON "public"."hr_payslips" FOR SELECT USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "hr_payslips_write" ON "public"."hr_payslips" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_positions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_positions_delete" ON "public"."hr_positions" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_positions_insert" ON "public"."hr_positions" FOR INSERT WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_positions_select" ON "public"."hr_positions" FOR SELECT USING (("public"."hr_is_hr_admin"() OR ("public"."hr_employee_id"() IS NOT NULL) OR "public"."hr_is_branch_manager"()));



CREATE POLICY "hr_positions_update" ON "public"."hr_positions" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_runtime_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_runtime_config_select" ON "public"."hr_runtime_config" FOR SELECT USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_runtime_config_upsert" ON "public"."hr_runtime_config" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_work_shifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_work_shifts_select" ON "public"."hr_work_shifts" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "hr_work_shifts_write" ON "public"."hr_work_shifts" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."inv_boms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_boms_select" ON "public"."inv_boms" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_boms_write" ON "public"."inv_boms" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."inv_branches" ENABLE ROW LEVEL SECURITY;


