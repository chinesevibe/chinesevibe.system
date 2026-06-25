-- HR Data INSERT Statements
-- Generated for migration to cpyuibcrpfslgcazozid
-- IMPORTANT: Run ALL_MIGRATIONS_CONSOLIDATED.sql first!


-- Table: hr_branches
INSERT INTO hr_branches (address, code, created_at, id, manager_employee_id, name, updated_at) VALUES (NULL, '000', '2026-06-11 15:54:56.599534+00', '9553c7d5-9245-4b81-a108-c1ed6c732240', NULL, 'Head Office', '2026-06-12 09:21:55.034793+00');
INSERT INTO hr_branches (address, code, created_at, id, manager_employee_id, name, updated_at) VALUES (NULL, '001', '2026-06-12 05:24:58.541422+00', 'ac3f88c7-c114-4a45-9fac-8a50e3fc7003', NULL, 'Officer', '2026-06-12 05:24:58.541422+00');
INSERT INTO hr_branches (address, code, created_at, id, manager_employee_id, name, updated_at) VALUES (NULL, '002', '2026-06-12 05:25:14.462338+00', '5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f', NULL, 'Bang Na', '2026-06-12 05:25:14.462338+00');
INSERT INTO hr_branches (address, code, created_at, id, manager_employee_id, name, updated_at) VALUES (NULL, '003', '2026-06-12 05:25:34.869209+00', '8b875263-ae46-480f-8ebb-2723737811f2', NULL, 'Huai Khwang', '2026-06-12 05:25:34.869209+00');
INSERT INTO hr_branches (address, code, created_at, id, manager_employee_id, name, updated_at) VALUES (NULL, '004', '2026-06-12 05:26:00.918098+00', 'c9dea1d6-0d98-4ea4-86ed-f1f99edd6cdc', NULL, 'Thonglor', '2026-06-12 05:26:00.918098+00');

-- Table: hr_departments
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-11 15:54:56.599534+00', '51c95eef-e4d2-4bc4-8793-af7d94ae2757', 'QA');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-11 15:54:56.599534+00', 'f0753b48-5f9f-4ac0-8140-2a8d3b8a783a', 'Management');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 05:56:39.142295+00', '8c34e77c-1b4a-4311-af3b-08ac517e64e4', 'IT');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00', '928c7b0e-a59a-4eed-9da6-b4eb9254156d', 'HR Officer');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00', 'bd6a7087-cc85-428f-9208-00551be58b29', 'Inventory');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00', 'ab69f9e0-4cfd-4013-84e8-5961082200a6', 'Accounting');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00', '489ff03e-1e57-4da5-9296-aa02d3b1f52e', 'Admin');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 08:03:30.879678+00', 'cef33974-7822-40a1-9cde-ffdb036c8dcb', 'Service staff');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 08:03:54.829898+00', '55eab5f4-657e-4ee3-93f2-a05f2d27242f', 'Branch Manager');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 08:04:44.173317+00', '2b7f1643-a14a-48a8-af23-834c36defff5', 'Executive Chef');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 08:05:15.723464+00', '9e288791-531c-4e1f-938f-4c3cf66b674c', 'Sous Chef');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 08:05:39.940329+00', 'a4629b44-2ba3-42f8-aadf-4800a2e1a514', 'Kitchen Staff');
INSERT INTO hr_departments (branch_id, created_at, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 08:06:01.694895+00', '231ae289-d08f-4416-b7d7-6fbc95f7e6ff', 'Reception');

-- Table: hr_positions
INSERT INTO hr_positions (branch_id, created_at, department_id, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 05:56:39.142295+00', '8c34e77c-1b4a-4311-af3b-08ac517e64e4', '2450142a-cfbe-487c-b647-57c7e2fbf07e', 'Developers');
INSERT INTO hr_positions (branch_id, created_at, department_id, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00', 'f0753b48-5f9f-4ac0-8140-2a8d3b8a783a', 'e1cd7e3e-a4b5-4944-88fc-50971cf956b1', 'Manager');
INSERT INTO hr_positions (branch_id, created_at, department_id, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00', '928c7b0e-a59a-4eed-9da6-b4eb9254156d', 'da4911db-2286-4ced-ba8c-f851c77afd31', 'HR Officer');
INSERT INTO hr_positions (branch_id, created_at, department_id, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00', 'bd6a7087-cc85-428f-9208-00551be58b29', '8c91f85e-9ccf-4057-bd20-b7e0d9aa44c1', 'Inventory');
INSERT INTO hr_positions (branch_id, created_at, department_id, id, name) VALUES ('9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00', 'ab69f9e0-4cfd-4013-84e8-5961082200a6', '8f32a93d-4cd0-46c8-9d20-344577bdac0e', 'Accounting');

-- Table: hr_work_shifts
INSERT INTO hr_work_shifts (check_in_early_minutes, code, created_at, crosses_midnight, end_hour, end_minute, grace_minutes, id, is_active, name, standard_hours, start_hour, start_minute, updated_at) VALUES (60, 'OFFICE', '2026-06-12 13:42:46.13803+00', false, 20, 0, 10, '0f46108a-ba89-407d-a3cc-a185ad7b7822', true, 'Office 11:00–20:00', '9.00', 11, 0, '2026-06-12 13:42:46.13803+00');
INSERT INTO hr_work_shifts (check_in_early_minutes, code, created_at, crosses_midnight, end_hour, end_minute, grace_minutes, id, is_active, name, standard_hours, start_hour, start_minute, updated_at) VALUES (60, 'BRANCH_MGR', '2026-06-12 13:42:46.13803+00', false, 22, 0, 10, '64954753-d91a-4f16-a60a-8ec46fb1cc04', true, 'Branch Manager 10:00–22:00', '10.00', 10, 0, '2026-06-12 13:42:46.13803+00');
INSERT INTO hr_work_shifts (check_in_early_minutes, code, created_at, crosses_midnight, end_hour, end_minute, grace_minutes, id, is_active, name, standard_hours, start_hour, start_minute, updated_at) VALUES (60, 'BRANCH_DAY', '2026-06-12 13:42:46.13803+00', false, 22, 0, 10, '89fcc386-c2e5-4623-a089-0128edbdf8f5', true, 'Branch Day 10:00–22:00', '10.00', 10, 0, '2026-06-12 13:42:46.13803+00');

-- Table: hr_employees
INSERT INTO hr_employees (avatar_path, bank_account_name, bank_account_number, bank_branch, bank_name, branch_id, contract_end, contract_file_name, contract_file_path, contract_start, contract_type, contract_uploaded_at, created_at, date_of_birth, department, department_id, email, employee_code, id, leave_blacklist_reason, leave_blacklisted, leave_blacklisted_at, line_user_id, name, phone, position, probation_end, probation_extended_until, probation_outcome, probation_outcome_note, role, salary, salary_payment_method, status, updated_at, visa_expiry, work_permit_expiry, work_shift_id) VALUES (NULL, 'วราภรณ์ แซ่ก๋ง', '553-400257-4', '0553 สาขานครศรีธรรมราช', 'SIAM COMMERCIAL BANK', '9553c7d5-9245-4b81-a108-c1ed6c732240', NULL, NULL, NULL, '2026-06-04', 'contract', NULL, '2026-06-12 05:12:50.221561+00', NULL, 'Inventory', NULL, 'Warapornsaekong@gmail.com', 'CHV002', 'e2e8b582-3960-4628-bd73-455e3ce6a107', NULL, false, NULL, 'U8d4a940b61b8aeacd6437ee652e96434', 'Waraporn Saekong', '095-719-4351', 'Inventory', '2026-09-02', NULL, 'passed', NULL, 'employee', '25000.00', 'bank', 'active', '2026-06-12 13:49:09.01166+00', NULL, NULL, '0f46108a-ba89-407d-a3cc-a185ad7b7822');
INSERT INTO hr_employees (avatar_path, bank_account_name, bank_account_number, bank_branch, bank_name, branch_id, contract_end, contract_file_name, contract_file_path, contract_start, contract_type, contract_uploaded_at, created_at, date_of_birth, department, department_id, email, employee_code, id, leave_blacklist_reason, leave_blacklisted, leave_blacklisted_at, line_user_id, name, phone, position, probation_end, probation_extended_until, probation_outcome, probation_outcome_note, role, salary, salary_payment_method, status, updated_at, visa_expiry, work_permit_expiry, work_shift_id) VALUES (NULL, 'นางสาวมณฑกานต์ มีแก้ว', '553-297252-9', '0553 สาขานครศรีธรรมราช', 'SIAM COMMERCIAL BANK', '9553c7d5-9245-4b81-a108-c1ed6c732240', NULL, NULL, NULL, '2026-05-19', 'contract', NULL, '2026-06-12 03:16:56.63606+00', '1995-03-10', 'HR Officer', NULL, 'mina.583197@gmail.com', 'CHV001', 'c16ef716-339d-4fd3-8fc6-16efe4c7ee9e', NULL, false, NULL, 'U390f8e89ff72bdcbcd28a8d831827cc9', 'Monthakan Meekeaw', '0957546270', 'HR Officer', '2026-06-11', NULL, 'passed', NULL, 'hr', '40000.00', 'bank', 'active', '2026-06-13 12:08:12.049193+00', NULL, NULL, '0f46108a-ba89-407d-a3cc-a185ad7b7822');

-- Table: hr_runtime_config
INSERT INTO hr_runtime_config (key, updated_at, value) VALUES ('hr_line_group_id', '2026-06-11 13:48:46.285573+00', 'Ce45348a55eae08658be6f126749138d7');

-- Table: hr_attendance
INSERT INTO hr_attendance (check_in_at, check_in_location, check_out_at, created_at, employee_id, id, is_late, shift_date, work_hours, work_shift_id) VALUES ('2026-06-12 01:22:09.647+00', '{''address'': ''10 11 หมู่ 10 เลียบวารี 79 แขวงโคกแฝด เขตหนองจอก กรุงเทพมหานคร 10530 ประเทศไทย'', ''latitude'': 13.826052, ''longitude'': 100.806947}', NULL, '2026-06-12 01:22:12.066646+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '0bd80a9c-f2f4-4cb3-a9c4-be6959b9a0bc', false, NULL, NULL, NULL);

-- Table: hr_attendance_submissions

-- Table: hr_leaves

-- Table: hr_leave_balances

-- Table: hr_alerts

-- Table: hr_announcements
INSERT INTO hr_announcements (body, created_at, created_by, id, image_path, scheduled_at, sent_at, status, target_type, target_value, title) VALUES ('ขั้นตอนการ Register 
ลิงก์ ลงทะเบียนพนักงาน (Production):
https://hr-app-rho-blush.vercel.app/register

วิธีใช้ (พนักงานใหม่):
เปิด https://hr-app-rho-blush.vercel.app/login
กด เข้าสู่ระบบด้วย LINE
ถ้ายังไม่มีในระบบ ระบบจะพาไป /register อัตโนมัติ
กรอกข้อมูล → รอ HR อนุมัติที่ /admin/employees', '2026-06-12 09:14:41.286499+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '4cf153ca-53be-4b5a-a9ec-512f5cc74347', NULL, NULL, '2026-06-12 09:14:41.159+00', 'sent', 'all', NULL, 'ขั้นตอนการ Register');
INSERT INTO hr_announcements (body, created_at, created_by, id, image_path, scheduled_at, sent_at, status, target_type, target_value, title) VALUES ('1️⃣ เปิด https://hr-app-rho-blush.vercel.app/login
2️⃣ กด เข้าสู่ระบบด้วย LINE
3️⃣ กรอกข้อมูล → รอ HR อนุมัติ ✅

#สอบถามเพิ่มเติมติดต่อ ฝ่าย HR', '2026-06-12 09:24:03.930644+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', 'e38b9be3-0900-4e5c-b50e-9e3d0b290bbd', 'e38b9be3-0900-4e5c-b50e-9e3d0b290bbd/1781256244095_test_______.png', NULL, '2026-06-12 09:24:03.779+00', 'sent', 'all', NULL, '📌 ขั้นตอนการ Register');
INSERT INTO hr_announcements (body, created_at, created_by, id, image_path, scheduled_at, sent_at, status, target_type, target_value, title) VALUES ('1️⃣ เปิด https://hr-app-rho-blush.vercel.app/login
2️⃣ กด เข้าสู่ระบบด้วย LINE
3️⃣ กรอกข้อมูล → รอ HR อนุมัติ ✅

#สอบถามเพิ่มเติมติดต่อ ฝ่าย HR', '2026-06-12 09:25:38.717774+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '1df81be1-c484-4e46-9802-37c795d7dd43', '1df81be1-c484-4e46-9802-37c795d7dd43/1781256338876_register_guide_under_5mb.jpg', NULL, '2026-06-12 09:25:38.564+00', 'sent', 'all', NULL, '📌 ขั้นตอนการ Register');
INSERT INTO hr_announcements (body, created_at, created_by, id, image_path, scheduled_at, sent_at, status, target_type, target_value, title) VALUES ('1️⃣ เปิด https://hr-app-rho-blush.vercel.app/login
2️⃣ กด เข้าสู่ระบบด้วย LINE
3️⃣ กรอกข้อมูล → รอ HR อนุมัติ ✅

#สอบถามเพิ่มเติมติดต่อ ฝ่าย HR', '2026-06-12 09:25:46.996051+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '95b2d8a6-b9b8-49a2-8954-5a5e48afb940', '95b2d8a6-b9b8-49a2-8954-5a5e48afb940/1781256347142_register_guide_under_5mb.jpg', NULL, '2026-06-12 09:25:46.861+00', 'sent', 'all', NULL, '📌 ขั้นตอนการ Register');

-- Table: hr_complaints

-- Table: hr_complaint_replies

-- Table: hr_document_requests
INSERT INTO hr_document_requests (copies, created_at, doc_type, employee_id, hr_note, id, purpose, result_file_url, status, updated_at) VALUES (1, '2026-06-11 14:24:54.126239+00', 'employment_cert', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', 'Test', '55014b3b-195b-427a-b166-98695ec88cc4', 'เปลี่ยนงาน', NULL, 'rejected', '2026-06-12 06:19:54.431964+00');

-- Table: hr_overtime_requests

-- Table: hr_payroll_periods

-- Table: hr_payroll_hour_lines

-- Table: hr_compliance_notes