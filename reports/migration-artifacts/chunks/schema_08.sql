GRANT ALL ON FUNCTION "public"."inv_record_consumption"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_items" "jsonb", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_record_consumption"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_items" "jsonb", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_reject_damage"("p_damage_id" "uuid", "p_rejection_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_reject_damage"("p_damage_id" "uuid", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_reject_damage"("p_damage_id" "uuid", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_reject_damage"("p_damage_id" "uuid", "p_rejection_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_save_stock_count_items"("p_count_id" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_save_stock_count_items"("p_count_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_save_stock_count_items"("p_count_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_save_stock_count_items"("p_count_id" "uuid", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_send_transfer"("p_transfer_id" "uuid", "p_shipper" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_send_transfer"("p_transfer_id" "uuid", "p_shipper" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_send_transfer"("p_transfer_id" "uuid", "p_shipper" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_send_transfer"("p_transfer_id" "uuid", "p_shipper" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_start_stock_count"("p_count_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_start_stock_count"("p_count_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_start_stock_count"("p_count_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_start_stock_count"("p_count_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."inv_validate_branch_warehouse"("p_branch_id" "uuid", "p_warehouse_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inv_validate_branch_warehouse"("p_branch_id" "uuid", "p_warehouse_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."inv_validate_branch_warehouse"("p_branch_id" "uuid", "p_warehouse_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inv_validate_branch_warehouse"("p_branch_id" "uuid", "p_warehouse_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."hr_alerts" TO "anon";
GRANT ALL ON TABLE "public"."hr_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."hr_announcements" TO "anon";
GRANT ALL ON TABLE "public"."hr_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."hr_attendance" TO "anon";
GRANT ALL ON TABLE "public"."hr_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."hr_attendance_corrections" TO "anon";
GRANT ALL ON TABLE "public"."hr_attendance_corrections" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_attendance_corrections" TO "service_role";



GRANT ALL ON TABLE "public"."hr_attendance_submissions" TO "anon";
GRANT ALL ON TABLE "public"."hr_attendance_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_attendance_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."hr_branches" TO "anon";
GRANT ALL ON TABLE "public"."hr_branches" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_branches" TO "service_role";



GRANT ALL ON TABLE "public"."hr_complaint_replies" TO "anon";
GRANT ALL ON TABLE "public"."hr_complaint_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_complaint_replies" TO "service_role";



GRANT ALL ON TABLE "public"."hr_complaints" TO "anon";
GRANT ALL ON TABLE "public"."hr_complaints" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_complaints" TO "service_role";



GRANT ALL ON TABLE "public"."hr_compliance_notes" TO "anon";
GRANT ALL ON TABLE "public"."hr_compliance_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_compliance_notes" TO "service_role";



GRANT ALL ON TABLE "public"."hr_departments" TO "anon";
GRANT ALL ON TABLE "public"."hr_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_departments" TO "service_role";



GRANT ALL ON TABLE "public"."hr_document_requests" TO "anon";
GRANT ALL ON TABLE "public"."hr_document_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_document_requests" TO "service_role";



GRANT ALL ON TABLE "public"."hr_employees" TO "anon";
GRANT ALL ON TABLE "public"."hr_employees" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_employees" TO "service_role";



GRANT ALL ON TABLE "public"."hr_leave_balances" TO "anon";
GRANT ALL ON TABLE "public"."hr_leave_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_leave_balances" TO "service_role";



GRANT ALL ON TABLE "public"."hr_leave_policy_defaults" TO "anon";
GRANT ALL ON TABLE "public"."hr_leave_policy_defaults" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_leave_policy_defaults" TO "service_role";



GRANT ALL ON TABLE "public"."hr_leaves" TO "anon";
GRANT ALL ON TABLE "public"."hr_leaves" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_leaves" TO "service_role";



GRANT ALL ON TABLE "public"."hr_line_pending_actions" TO "anon";
GRANT ALL ON TABLE "public"."hr_line_pending_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_line_pending_actions" TO "service_role";



GRANT ALL ON TABLE "public"."hr_overtime_requests" TO "anon";
GRANT ALL ON TABLE "public"."hr_overtime_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_overtime_requests" TO "service_role";



GRANT ALL ON TABLE "public"."hr_payroll_config" TO "anon";
GRANT ALL ON TABLE "public"."hr_payroll_config" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_payroll_config" TO "service_role";



GRANT ALL ON TABLE "public"."hr_payroll_hour_lines" TO "anon";
GRANT ALL ON TABLE "public"."hr_payroll_hour_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_payroll_hour_lines" TO "service_role";



GRANT ALL ON TABLE "public"."hr_payroll_periods" TO "anon";
GRANT ALL ON TABLE "public"."hr_payroll_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_payroll_periods" TO "service_role";



GRANT ALL ON TABLE "public"."hr_payroll_runs" TO "anon";
GRANT ALL ON TABLE "public"."hr_payroll_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_payroll_runs" TO "service_role";



GRANT ALL ON TABLE "public"."hr_payslip_lines" TO "anon";
GRANT ALL ON TABLE "public"."hr_payslip_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_payslip_lines" TO "service_role";



GRANT ALL ON TABLE "public"."hr_payslips" TO "anon";
GRANT ALL ON TABLE "public"."hr_payslips" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_payslips" TO "service_role";



GRANT ALL ON TABLE "public"."hr_positions" TO "anon";
GRANT ALL ON TABLE "public"."hr_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_positions" TO "service_role";



GRANT ALL ON TABLE "public"."hr_runtime_config" TO "anon";
GRANT ALL ON TABLE "public"."hr_runtime_config" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_runtime_config" TO "service_role";



GRANT ALL ON TABLE "public"."hr_work_shifts" TO "anon";
GRANT ALL ON TABLE "public"."hr_work_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_work_shifts" TO "service_role";



GRANT ALL ON TABLE "public"."inv_boms" TO "anon";
GRANT ALL ON TABLE "public"."inv_boms" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_boms" TO "service_role";



GRANT ALL ON TABLE "public"."inv_branches" TO "anon";
GRANT ALL ON TABLE "public"."inv_branches" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_branches" TO "service_role";



GRANT ALL ON TABLE "public"."inv_consumptions" TO "anon";
GRANT ALL ON TABLE "public"."inv_consumptions" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_consumptions" TO "service_role";



GRANT ALL ON TABLE "public"."inv_damages" TO "anon";
GRANT ALL ON TABLE "public"."inv_damages" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_damages" TO "service_role";



GRANT ALL ON TABLE "public"."inv_inbound_items" TO "anon";
GRANT ALL ON TABLE "public"."inv_inbound_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_inbound_items" TO "service_role";



GRANT ALL ON TABLE "public"."inv_inbound_orders" TO "anon";
GRANT ALL ON TABLE "public"."inv_inbound_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_inbound_orders" TO "service_role";



GRANT ALL ON TABLE "public"."inv_requisition_issue_lines" TO "anon";
GRANT ALL ON TABLE "public"."inv_requisition_issue_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_requisition_issue_lines" TO "service_role";



GRANT ALL ON TABLE "public"."inv_requisition_items" TO "anon";
GRANT ALL ON TABLE "public"."inv_requisition_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_requisition_items" TO "service_role";



GRANT ALL ON TABLE "public"."inv_requisitions" TO "anon";
GRANT ALL ON TABLE "public"."inv_requisitions" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_requisitions" TO "service_role";



GRANT ALL ON TABLE "public"."inv_skus" TO "anon";
GRANT ALL ON TABLE "public"."inv_skus" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_skus" TO "service_role";



GRANT ALL ON TABLE "public"."inv_stock_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."inv_stock_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_stock_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."inv_stock_balances" TO "anon";
GRANT ALL ON TABLE "public"."inv_stock_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_stock_balances" TO "service_role";



GRANT ALL ON TABLE "public"."inv_stock_count_items" TO "anon";
GRANT ALL ON TABLE "public"."inv_stock_count_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_stock_count_items" TO "service_role";



GRANT ALL ON TABLE "public"."inv_stock_counts" TO "anon";
GRANT ALL ON TABLE "public"."inv_stock_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_stock_counts" TO "service_role";



GRANT ALL ON TABLE "public"."inv_stock_lots" TO "anon";
GRANT ALL ON TABLE "public"."inv_stock_lots" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_stock_lots" TO "service_role";



GRANT ALL ON TABLE "public"."inv_stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."inv_stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."inv_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."inv_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."inv_transfer_items" TO "anon";
GRANT ALL ON TABLE "public"."inv_transfer_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_transfer_items" TO "service_role";



GRANT ALL ON TABLE "public"."inv_transfers" TO "anon";
GRANT ALL ON TABLE "public"."inv_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."inv_unit_conversions" TO "anon";
GRANT ALL ON TABLE "public"."inv_unit_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_unit_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."inv_units" TO "anon";
GRANT ALL ON TABLE "public"."inv_units" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_units" TO "service_role";



GRANT ALL ON TABLE "public"."inv_warehouses" TO "anon";
GRANT ALL ON TABLE "public"."inv_warehouses" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_warehouses" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






