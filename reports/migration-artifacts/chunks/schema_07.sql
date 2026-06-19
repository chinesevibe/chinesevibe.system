CREATE POLICY "inv_branches_select" ON "public"."inv_branches" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_branches_write" ON "public"."inv_branches" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."inv_consumptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_consumptions_insert" ON "public"."inv_consumptions" FOR INSERT WITH CHECK ((("recorded_by" = "public"."hr_employee_id"()) AND "public"."inv_is_active_employee"()));



CREATE POLICY "inv_consumptions_select" ON "public"."inv_consumptions" FOR SELECT USING ((("recorded_by" = "public"."hr_employee_id"()) OR "public"."inv_can_manage_damage"()));



ALTER TABLE "public"."inv_damages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_damages_insert" ON "public"."inv_damages" FOR INSERT WITH CHECK ((("created_by" = "public"."hr_employee_id"()) AND "public"."inv_is_active_employee"()));



CREATE POLICY "inv_damages_select" ON "public"."inv_damages" FOR SELECT USING ((("created_by" = "public"."hr_employee_id"()) OR "public"."inv_can_manage_damage"()));



CREATE POLICY "inv_damages_update" ON "public"."inv_damages" FOR UPDATE USING ("public"."inv_can_manage_damage"()) WITH CHECK ("public"."inv_can_manage_damage"());



ALTER TABLE "public"."inv_inbound_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_inbound_items_select" ON "public"."inv_inbound_items" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_inbound_items_write" ON "public"."inv_inbound_items" USING (("public"."hr_is_hr_admin"() OR "public"."inv_can_manage_requisitions"())) WITH CHECK (("public"."hr_is_hr_admin"() OR "public"."inv_can_manage_requisitions"()));



ALTER TABLE "public"."inv_inbound_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_inbound_orders_select" ON "public"."inv_inbound_orders" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_inbound_orders_write" ON "public"."inv_inbound_orders" USING (("public"."hr_is_hr_admin"() OR "public"."inv_can_manage_requisitions"())) WITH CHECK (("public"."hr_is_hr_admin"() OR "public"."inv_can_manage_requisitions"()));



ALTER TABLE "public"."inv_requisition_issue_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_requisition_issue_lines_insert" ON "public"."inv_requisition_issue_lines" FOR INSERT WITH CHECK ("public"."inv_can_manage_requisitions"());



CREATE POLICY "inv_requisition_issue_lines_select" ON "public"."inv_requisition_issue_lines" FOR SELECT USING (("public"."inv_can_view_inventory_ops"() OR "public"."inv_is_active_employee"()));



ALTER TABLE "public"."inv_requisition_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_requisition_items_insert" ON "public"."inv_requisition_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."inv_requisitions" "r"
  WHERE (("r"."id" = "inv_requisition_items"."requisition_id") AND (("r"."requester_id" = "public"."hr_employee_id"()) OR "public"."inv_can_manage_requisitions"())))));



CREATE POLICY "inv_requisition_items_select" ON "public"."inv_requisition_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."inv_requisitions" "r"
  WHERE (("r"."id" = "inv_requisition_items"."requisition_id") AND (("r"."requester_id" = "public"."hr_employee_id"()) OR "public"."inv_can_view_inventory_ops"())))));



CREATE POLICY "inv_requisition_items_update" ON "public"."inv_requisition_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."inv_requisitions" "r"
  WHERE (("r"."id" = "inv_requisition_items"."requisition_id") AND (("r"."requester_id" = "public"."hr_employee_id"()) OR "public"."inv_can_manage_requisitions"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."inv_requisitions" "r"
  WHERE (("r"."id" = "inv_requisition_items"."requisition_id") AND (("r"."requester_id" = "public"."hr_employee_id"()) OR "public"."inv_can_manage_requisitions"())))));



ALTER TABLE "public"."inv_requisitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_requisitions_insert" ON "public"."inv_requisitions" FOR INSERT WITH CHECK ((("requester_id" = "public"."hr_employee_id"()) OR "public"."inv_can_manage_requisitions"()));



CREATE POLICY "inv_requisitions_select" ON "public"."inv_requisitions" FOR SELECT USING ((("requester_id" = "public"."hr_employee_id"()) OR "public"."inv_can_view_inventory_ops"()));



CREATE POLICY "inv_requisitions_update" ON "public"."inv_requisitions" FOR UPDATE USING ((("requester_id" = "public"."hr_employee_id"()) OR "public"."inv_can_manage_requisitions"())) WITH CHECK ((("requester_id" = "public"."hr_employee_id"()) OR "public"."inv_can_manage_requisitions"()));



ALTER TABLE "public"."inv_skus" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_skus_select" ON "public"."inv_skus" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_skus_write" ON "public"."inv_skus" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."inv_stock_adjustments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_stock_adjustments_insert" ON "public"."inv_stock_adjustments" FOR INSERT WITH CHECK ((("created_by" = "public"."hr_employee_id"()) AND "public"."inv_can_manage_requisitions"()));



CREATE POLICY "inv_stock_adjustments_select" ON "public"."inv_stock_adjustments" FOR SELECT USING ("public"."inv_can_view_inventory_ops"());



CREATE POLICY "inv_stock_adjustments_update" ON "public"."inv_stock_adjustments" FOR UPDATE USING ("public"."inv_can_manage_requisitions"()) WITH CHECK ("public"."inv_can_manage_requisitions"());



ALTER TABLE "public"."inv_stock_balances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_stock_balances_select" ON "public"."inv_stock_balances" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_stock_balances_write" ON "public"."inv_stock_balances" USING (("public"."hr_is_hr_admin"() OR "public"."inv_can_manage_requisitions"())) WITH CHECK (("public"."hr_is_hr_admin"() OR "public"."inv_can_manage_requisitions"()));



ALTER TABLE "public"."inv_stock_count_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_stock_count_items_insert" ON "public"."inv_stock_count_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."inv_stock_counts" "c"
  WHERE (("c"."id" = "inv_stock_count_items"."count_id") AND "public"."inv_can_manage_requisitions"()))));



CREATE POLICY "inv_stock_count_items_select" ON "public"."inv_stock_count_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."inv_stock_counts" "c"
  WHERE (("c"."id" = "inv_stock_count_items"."count_id") AND "public"."inv_can_view_inventory_ops"()))));



CREATE POLICY "inv_stock_count_items_update" ON "public"."inv_stock_count_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."inv_stock_counts" "c"
  WHERE (("c"."id" = "inv_stock_count_items"."count_id") AND "public"."inv_can_manage_requisitions"())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."inv_stock_counts" "c"
  WHERE (("c"."id" = "inv_stock_count_items"."count_id") AND "public"."inv_can_manage_requisitions"()))));



ALTER TABLE "public"."inv_stock_counts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_stock_counts_insert" ON "public"."inv_stock_counts" FOR INSERT WITH CHECK ((("created_by" = "public"."hr_employee_id"()) AND "public"."inv_can_manage_requisitions"()));



CREATE POLICY "inv_stock_counts_select" ON "public"."inv_stock_counts" FOR SELECT USING ("public"."inv_can_view_inventory_ops"());



CREATE POLICY "inv_stock_counts_update" ON "public"."inv_stock_counts" FOR UPDATE USING ("public"."inv_can_manage_requisitions"()) WITH CHECK ("public"."inv_can_manage_requisitions"());



ALTER TABLE "public"."inv_stock_lots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_stock_lots_mutate" ON "public"."inv_stock_lots" USING ("public"."inv_can_manage_requisitions"()) WITH CHECK ("public"."inv_can_manage_requisitions"());



CREATE POLICY "inv_stock_lots_select" ON "public"."inv_stock_lots" FOR SELECT USING (("public"."inv_can_view_inventory_ops"() OR "public"."inv_is_active_employee"()));



ALTER TABLE "public"."inv_stock_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_stock_movements_insert" ON "public"."inv_stock_movements" FOR INSERT WITH CHECK ("public"."inv_can_manage_damage"());



CREATE POLICY "inv_stock_movements_select" ON "public"."inv_stock_movements" FOR SELECT USING (("public"."inv_can_manage_damage"() OR ("public"."hr_employee_id"() IS NOT NULL)));



ALTER TABLE "public"."inv_suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_suppliers_select" ON "public"."inv_suppliers" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_suppliers_write" ON "public"."inv_suppliers" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."inv_transfer_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_transfer_items_insert" ON "public"."inv_transfer_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."inv_transfers" "t"
  WHERE (("t"."id" = "inv_transfer_items"."transfer_id") AND "public"."inv_can_manage_requisitions"()))));



CREATE POLICY "inv_transfer_items_select" ON "public"."inv_transfer_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."inv_transfers" "t"
  WHERE (("t"."id" = "inv_transfer_items"."transfer_id") AND "public"."inv_can_view_inventory_ops"()))));



CREATE POLICY "inv_transfer_items_update" ON "public"."inv_transfer_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."inv_transfers" "t"
  WHERE (("t"."id" = "inv_transfer_items"."transfer_id") AND "public"."inv_can_manage_requisitions"())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."inv_transfers" "t"
  WHERE (("t"."id" = "inv_transfer_items"."transfer_id") AND "public"."inv_can_manage_requisitions"()))));



ALTER TABLE "public"."inv_transfers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_transfers_insert" ON "public"."inv_transfers" FOR INSERT WITH CHECK ((("created_by" = "public"."hr_employee_id"()) AND "public"."inv_can_manage_requisitions"()));



CREATE POLICY "inv_transfers_select" ON "public"."inv_transfers" FOR SELECT USING ("public"."inv_can_view_inventory_ops"());



CREATE POLICY "inv_transfers_update" ON "public"."inv_transfers" FOR UPDATE USING ("public"."inv_can_manage_requisitions"()) WITH CHECK ("public"."inv_can_manage_requisitions"());



ALTER TABLE "public"."inv_unit_conversions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_unit_conversions_select" ON "public"."inv_unit_conversions" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_unit_conversions_write" ON "public"."inv_unit_conversions" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."inv_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_units_select" ON "public"."inv_units" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_units_write" ON "public"."inv_units" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."inv_warehouses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_warehouses_select" ON "public"."inv_warehouses" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_warehouses_write" ON "public"."inv_warehouses" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "leave_balances delete hr only" ON "public"."hr_leave_balances" FOR DELETE TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "leave_balances insert hr only" ON "public"."hr_leave_balances" FOR INSERT TO "authenticated" WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "leave_balances select self or hr" ON "public"."hr_leave_balances" FOR SELECT TO "authenticated" USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "leave_balances update hr only" ON "public"."hr_leave_balances" FOR UPDATE TO "authenticated" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "leave_policy_defaults delete hr only" ON "public"."hr_leave_policy_defaults" FOR DELETE TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "leave_policy_defaults insert hr only" ON "public"."hr_leave_policy_defaults" FOR INSERT TO "authenticated" WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "leave_policy_defaults select hr only" ON "public"."hr_leave_policy_defaults" FOR SELECT TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "leave_policy_defaults update hr only" ON "public"."hr_leave_policy_defaults" FOR UPDATE TO "authenticated" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "leaves delete hr only" ON "public"."hr_leaves" FOR DELETE TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "leaves insert self or hr" ON "public"."hr_leaves" FOR INSERT TO "authenticated" WITH CHECK ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "leaves select self or hr" ON "public"."hr_leaves" FOR SELECT TO "authenticated" USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_can_read_company"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_can_access_branch"("p_branch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."hr_can_access_branch"("p_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_can_access_branch"("p_branch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_can_read_company"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_can_read_company"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_can_read_company"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_employee_branch_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_employee_branch_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_employee_branch_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."hr_employee_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."hr_employee_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_employee_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_is_branch_manager"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_is_branch_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_is_branch_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_is_ceo"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_is_ceo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_is_ceo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_is_dev"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_is_dev"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_is_dev"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."hr_is_hr_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."hr_is_hr_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_is_hr_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."hr_line_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."hr_line_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_line_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_managed_branch_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_managed_branch_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_managed_branch_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_payroll_config_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_payroll_config_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_payroll_config_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_payroll_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_payroll_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_payroll_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_runtime_config_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_runtime_config_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_runtime_config_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_allocate_fefo"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_qty" numeric, "p_issue_method" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_allocate_fefo"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_qty" numeric, "p_issue_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_allocate_fefo"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_qty" numeric, "p_issue_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_allocate_fefo"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_qty" numeric, "p_issue_method" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_apply_lot_deduction"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_lot_id" "uuid", "p_qty" numeric, "p_movement_type" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_created_by" "uuid", "p_notes" "text", "p_override_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_apply_lot_deduction"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_lot_id" "uuid", "p_qty" numeric, "p_movement_type" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_created_by" "uuid", "p_notes" "text", "p_override_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_apply_lot_deduction"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_lot_id" "uuid", "p_qty" numeric, "p_movement_type" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_created_by" "uuid", "p_notes" "text", "p_override_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_apply_lot_deduction"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_lot_id" "uuid", "p_qty" numeric, "p_movement_type" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_created_by" "uuid", "p_notes" "text", "p_override_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_approve_damage"("p_damage_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_approve_damage"("p_damage_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_approve_damage"("p_damage_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_approve_damage"("p_damage_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_approve_inbound_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_approve_inbound_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_approve_inbound_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_approve_inbound_order"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_can_admin_damage"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_can_admin_damage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_can_admin_damage"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_can_approve_damage"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_can_approve_damage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_can_approve_damage"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_can_manage_damage"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_can_manage_damage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_can_manage_damage"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_can_manage_requisitions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_can_manage_requisitions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_can_manage_requisitions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_can_override_fefo"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_can_override_fefo"() TO "anon";
GRANT ALL ON FUNCTION "public"."inv_can_override_fefo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_can_override_fefo"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_can_view_inventory_ops"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_can_view_inventory_ops"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_can_view_inventory_ops"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_cancel_stock_count"("p_count_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_cancel_stock_count"("p_count_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_cancel_stock_count"("p_count_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_cancel_stock_count"("p_count_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_cancel_transfer"("p_transfer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_cancel_transfer"("p_transfer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_cancel_transfer"("p_transfer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_cancel_transfer"("p_transfer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_create_stock_count"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_scope" "text", "p_planned_at" timestamp with time zone, "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_create_stock_count"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_scope" "text", "p_planned_at" timestamp with time zone, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_create_stock_count"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_scope" "text", "p_planned_at" timestamp with time zone, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_create_stock_count"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_scope" "text", "p_planned_at" timestamp with time zone, "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_finalize_stock_count"("p_count_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_finalize_stock_count"("p_count_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_finalize_stock_count"("p_count_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_finalize_stock_count"("p_count_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_is_active_employee"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_is_active_employee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_is_active_employee"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_issue_requisition"("p_requisition_id" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_issue_requisition"("p_requisition_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_issue_requisition"("p_requisition_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_issue_requisition"("p_requisition_id" "uuid", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_latest_sku_cost"("p_sku_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_latest_sku_cost"("p_sku_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_latest_sku_cost"("p_sku_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_receive_transfer"("p_transfer_id" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_receive_transfer"("p_transfer_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_receive_transfer"("p_transfer_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_receive_transfer"("p_transfer_id" "uuid", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_record_consumption"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_items" "jsonb", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_record_consumption"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_items" "jsonb", "p_notes" "text") TO "anon";
