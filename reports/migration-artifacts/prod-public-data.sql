SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict V2XMce0dJ2n99t67rlz8GOBcUGdTuCgyuafSjg4LLdIBMtxypfCukzSMcqGBnzy

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: hr_work_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_work_shifts" ("id", "code", "name", "start_hour", "start_minute", "end_hour", "end_minute", "crosses_midnight", "grace_minutes", "standard_hours", "check_in_early_minutes", "is_active", "created_at", "updated_at") FROM stdin;
0f46108a-ba89-407d-a3cc-a185ad7b7822	OFFICE	Office 11:00–20:00	11	0	20	0	f	10	9.00	60	t	2026-06-12 13:42:46.13803+00	2026-06-12 13:42:46.13803+00
64954753-d91a-4f16-a60a-8ec46fb1cc04	BRANCH_MGR	Branch Manager 10:00–22:00	10	0	22	0	f	10	10.00	60	t	2026-06-12 13:42:46.13803+00	2026-06-12 13:42:46.13803+00
89fcc386-c2e5-4623-a089-0128edbdf8f5	BRANCH_DAY	Branch Day 10:00–22:00	10	0	22	0	f	10	10.00	60	t	2026-06-12 13:42:46.13803+00	2026-06-12 13:42:46.13803+00
1034f74f-a608-45ac-8025-8951d614c44f	BRANCH_NIGHT	Branch Night 14:00–02:00	14	0	2	0	t	10	10.00	60	t	2026-06-12 13:42:46.13803+00	2026-06-12 13:42:46.13803+00
\.


--
-- Data for Name: hr_employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_employees" ("id", "line_user_id", "name", "position", "department", "salary", "contract_start", "probation_end", "visa_expiry", "work_permit_expiry", "role", "status", "created_at", "updated_at", "date_of_birth", "phone", "email", "contract_type", "contract_end", "probation_outcome", "probation_outcome_note", "probation_extended_until", "branch_id", "department_id", "employee_code", "salary_payment_method", "bank_name", "bank_account_name", "bank_account_number", "bank_branch", "leave_blacklisted", "leave_blacklist_reason", "leave_blacklisted_at", "avatar_path", "contract_file_path", "contract_file_name", "contract_uploaded_at", "work_shift_id", "default_check_in_time", "default_check_out_time", "pay_type", "nationality", "pay_day", "preferred_locale", "locale_source", "housing_allowance", "portal_password_hash") FROM stdin;
2f7aa8dc-7ab5-43c9-b435-cb7ee46c6c9e	Uf242224812e462404ce58cb1777d273e	Nang Law Kham	Service Staff	Front of House	58.00	\N	\N	2027-03-31	2026-03-13	employee	active	2026-06-17 07:23:56.943973+00	2026-06-17 10:48:25.971054+00	\N	0949534883	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV004	bank	KRUNG THAI BANK	Nang Law Kham	7990561255	-	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	en	line	0.00	\N
187411f3-8d84-44db-b343-0b158a21c3d2	Uedf7597bc20ba660a784310cc01924a0	Noung Mo Khaung	Service Staff	Front of House	42.00	\N	\N	\N	\N	employee	active	2026-06-17 09:48:10.026262+00	2026-06-17 10:24:02.244162+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV010	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	my	manual	0.00	\N
2f2aae72-12c1-4d30-b038-075c85ace626	portal_dev_000	Dev Portal	Developers	IT	\N	\N	\N	\N	\N	dev	active	2026-06-15 08:47:37.626022+00	2026-06-17 15:43:54.951481+00	\N	\N	\N	\N	\N	\N	\N	\N	9553c7d5-9245-4b81-a108-c1ed6c732240	\N	000	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	hourly	\N	\N	en	line	\N	\N
b6b70b03-b352-4445-acbf-8678ccf50ce2	U65102f1b64243db5359013e78b7d9a80	sun sun	CEO	Officer	\N	\N	\N	\N	\N	hr	active	2026-06-16 12:30:06.495235+00	2026-06-16 13:43:27.362694+00	\N	\N	\N	\N	\N	\N	\N	\N	9553c7d5-9245-4b81-a108-c1ed6c732240	\N	CHV000	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	monthly	\N	4	th	line	\N	scrypt:16384:8:1:802a17f4c81bc7726caa4831a1f268d8:2b724b0bb9a3038d3b54e97ed454a84f02f2b2a8e99fba92eadd1339ab2603a236fc44eb2eca1e5b74680b4f5f1d235dc17a846a3b34bcab541b65465232aec8
2ae16019-50e5-4d57-930e-ad89d4cbb937	U0693ffa78ed9e380652fde55bba5a262	AYE HMWE	Service Staff	Front of House	42.00	\N	\N	\N	\N	employee	active	2026-06-17 08:35:23.803346+00	2026-06-17 10:23:45.253082+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV018	bank	KASIKORNBANK	MS.AYE HMWE	1908780589	-	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	my	manual	0.00	\N
9bacc73d-92ca-477a-a45c-cc68a21c0e24	U9e1664a8c828aa09a257da75641c894e	Khun Myo Thi Ha	Service Staff	Front of House	43.00	\N	\N	\N	\N	employee	active	2026-06-17 07:23:56.739476+00	2026-06-17 10:33:19.988251+00	\N	0948798461	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV007	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	en	line	0.00	\N
04e9a478-10e8-4f70-a06e-33c49e5fb024	U88f526d167dc95af6df2583fae2c10fd	KYI KYI SOE	Service Staff	Front of House	44.00	\N	\N	\N	\N	employee	active	2026-06-17 08:36:31.427411+00	2026-06-17 08:58:08.22625+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV025	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	my	manual	0.00	\N
b7d62088-6d9e-42b2-880a-3a84df0ac2af	U07b33302852e4917c6c680fd4dc7592e	Dev	HR Officer	Officer	\N	\N	\N	\N	\N	hr	active	2026-06-11 09:35:45.623379+00	2026-06-16 16:30:24.606417+00	\N	\N	\N	\N	\N	\N	\N	\N	9553c7d5-9245-4b81-a108-c1ed6c732240	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	b7d62088-6d9e-42b2-880a-3a84df0ac2af/1781258632850_dev-letter-initial-logo-design-vector-illustration-236623773.jpg	\N	\N	\N	\N	\N	\N	monthly	\N	4	th	manual	\N	scrypt:16384:8:1:16efa17b6427c7eae3d2527644cb1ce8:c5cdcbdf5e40bbf2dd8042e60851f75462efb18a06ea6126e3bcefb92efd988d40f8bc65f3190ab03af2a70788af42c9aff4ffa0822d6c05daf5a4025b782f69
d1bc5e8b-1216-4fbd-a7bf-1cbbd489b153	U85ef54097ab4f078b72f25043ab14dfa	Nang Nge Nge	Service Staff	Front of House	50.00	\N	\N	2027-03-31	2026-03-12	employee	active	2026-06-17 07:23:25.032907+00	2026-06-17 10:24:26.685809+00	\N	0946847204	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CVN005	bank	KASIKORNBANK	Nang Nge Nge	147-1-97509-1	-	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	my	manual	0.00	\N
11491b86-66e6-496c-bd1b-7c224c2a67ab	Ub3b7e6d88d5200c144c0f2b51681720e	Aike phit Phit	Service Staff	Front of House	43.00	\N	\N	\N	\N	employee	active	2026-06-16 11:29:09.772178+00	2026-06-17 12:59:06.158991+00	\N	0635293212	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV011	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	\N	4	th	manual	0.00	\N
6f3ff0dd-cd7f-45a8-a61d-7e070447d532	Ufbd8c83ae9644b8fd581d549adf6792c	Nang Kham Si	Service Staff	Front of House	50.00	\N	\N	\N	\N	employee	active	2026-06-17 09:52:41.666325+00	2026-06-17 10:26:11.512512+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV012	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	en	line	0.00	\N
7e9bbdf6-af8c-4c50-b82b-0dbc296353bb	Ueb26ea959545fffda8212007e082a04c	Su Hlaing Win	Service Staff	Front of House	42.00	\N	\N	\N	2569-12-11	employee	active	2026-06-17 08:33:41.39904+00	2026-06-17 10:22:37.250815+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV015	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	my	manual	0.00	\N
82e1683f-abc8-4074-be1b-b64925cf35d7	Ubf8bce38b58ad20b20488af9b2aa9d12	Elizabeth Elizabeth	Service Staff	Front of House	36.00	2026-05-02	\N	\N	\N	employee	active	2026-06-17 07:23:16.68642+00	2026-06-17 11:08:30.109256+00	\N	967791072	\N	contract	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV017	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	my	manual	0.00	\N
f1250741-89af-465f-b071-e07272ea1e07	U0798bc5c82b01a1d7e10424f92df2a5a	THAN THAN AYE	Reception	Front of House	\N	\N	\N	\N	\N	employee	active	2026-06-16 10:54:23.216472+00	2026-06-16 11:59:19.569871+00	2026-06-16	\N	\N	\N	\N	passed	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV024	\N	\N	\N	\N	\N	f	\N	\N	f1250741-89af-465f-b071-e07272ea1e07/1781607447459_IMG_3428.jpg	\N	\N	\N	\N	\N	\N	hourly	\N	4	th	manual	\N	\N
5b8ac6c6-1707-4c9e-b8ea-7f624c9a5a56	Uc0ef4ab180601ec33f066922fddb9c94	SAI THURS MIN	Staff	Back of House	33.00	\N	\N	\N	\N	employee	active	2026-06-17 07:58:23.347256+00	2026-06-17 10:32:23.752159+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV036	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	my	line	0.00	\N
36fc2946-02ee-4453-a376-a056f1ab42af	U5b329e9978f8829af4c204bfb73918e8	Ma Sein Htay	Service Staff	Front of House	42.00	\N	\N	\N	\N	employee	active	2026-06-17 07:23:58.622354+00	2026-06-17 10:33:34.227032+00	\N	0617744116	\N	contract	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV016	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	en	line	0.00	\N
a1e37c35-6fd1-493c-b175-f7ff3d72e797	Ucca4a8c5c267ff6a1f360cefe62c36d3	XUELIN MA	Branch Manager	Front of House	163.00	\N	\N	\N	\N	branch_manager	active	2026-06-16 11:09:05.76781+00	2026-06-17 10:59:38.650418+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV044	bank	KASIKORNBANK	MA XUE LIN	2261291927	-	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	chinese	5	zh	manual	0.00	\N
290ef3eb-2239-4864-9c62-160c5ccad605	U107041e82e372c8be6f76398c859b650	Hefu Peng	Chef Manager	Back of House	50.99	\N	\N	\N	\N	employee	active	2026-06-16 13:24:12.77686+00	2026-06-17 13:03:40.754429+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV041	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	chinese	5	zh	manual	0.00	\N
147ae23e-f705-42a2-86b7-dff4a2907870	portal_147ae23e-f705-42a2-86b7-dff4a2907870	Wai Wai Htun	Service Staff	Front of House	39.00	\N	\N	\N	\N	employee	active	2026-06-17 09:23:09.021465+00	2026-06-17 09:43:02.615118+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV019	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	th	line	0.00	\N
c5f8c97e-5e01-4319-a6aa-ca9ca7104893	U288dfce181eb2b16fdae5ae5fa33b757	WILAI SAEMA	Cashier	Front of House	\N	\N	\N	\N	\N	employee	active	2026-06-16 10:55:07.580053+00	2026-06-16 11:40:38.054332+00	\N	\N	\N	\N	\N	passed	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV021	\N	\N	\N	\N	\N	f	\N	\N	c5f8c97e-5e01-4319-a6aa-ca9ca7104893/1781607414305_IMG_3427.jpg	\N	\N	\N	\N	\N	\N	hourly	\N	4	th	line	\N	\N
728a8d67-9a18-4396-88ad-0d7ef38a2bb0	U504b344bdedaf3e6bad933c7958ebc53	Soe Myat Min	Staff	Back of House	44.00	\N	\N	\N	\N	employee	active	2026-06-17 07:57:59.222556+00	2026-06-17 08:31:12.693194+00	\N	\N	\N	\N	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV027	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	my	manual	0.00	\N
e3ce6f45-7167-49ed-a67c-97787509469e	Ub1fb3527023d9cd4bfeb82f34d4c2493	Tuanbo Ren	Sous Chef	Back of House	48.00	\N	\N	\N	2026-09-16	employee	active	2026-06-17 08:00:20.796243+00	2026-06-17 08:08:18.27673+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV042	bank	Bank of China	Tuanbo Ren	100000301471262	-	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	5	zh	manual	\N	\N
10deb211-f9a7-4f4a-8d9e-eca1bde4160c	U3ced2479bf245262ca5518e2c5b83046	Nang Lin Kyi	Staff	Back of House	47.00	\N	\N	\N	\N	employee	active	2026-06-17 07:57:14.887446+00	2026-06-17 08:29:41.716888+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV030	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	zh	manual	0.00	\N
f3a5ecf6-63d5-4da1-9dc1-92bd398ef9b8	U777e8924b33c7927ac5fa189a7dfc336	Sai Aung Nai	Staff	Back of House	33.00	\N	\N	\N	\N	employee	active	2026-06-17 07:57:23.408792+00	2026-06-17 08:30:49.257969+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV035	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	my	manual	0.00	\N
1dc1d274-4890-4965-ac71-afdd61f4a92e	U673ca44bb24b784833d22d5d1dfcd3de	Sai Aung Naing	Sous Chef	Back of House	50.00	\N	\N	\N	\N	employee	active	2026-06-17 07:56:44.724787+00	2026-06-17 08:27:51.877602+00	\N	\N	\N	\N	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV029	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	zh	manual	0.00	\N
9212182b-5ee3-455d-973d-f9b8c3d3a2d6	U51df3151405382dbfe672a995debd908	XINQI QIN	Sous Chef	Back of House	222.00	\N	\N	\N	\N	employee	active	2026-06-17 09:14:19.076465+00	2026-06-17 09:18:07.401733+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV043	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	chinese	5	zh	manual	0.00	\N
61eb5eb9-debc-4cec-aa28-080eaab73e96	Ub3ff9d9ad3a0f34a204d312155f0a76e	KAUNG SATT NAING	Service Staff	Front of House	39.00	\N	\N	\N	\N	employee	active	2026-06-17 09:47:26.786972+00	2026-06-17 10:35:11.245614+00	\N	\N	\N	part_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV006	bank	KASIKORNBANK	KAUNG SATT NAING	1591207209	-	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	th	line	0.00	\N
5d88f1f9-128a-485a-a4a6-58e20b938ab9	U4c71c468f69913d556e84a15afbc8752	YEE AYE	Staff	Back of House	44.00	\N	\N	\N	\N	employee	active	2026-06-17 09:49:18.728687+00	2026-06-17 09:54:06.500993+00	\N	\N	\N	part_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV034	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	th	line	0.00	\N
19ac1599-ef67-45db-b69f-1b811ed32deb	Ucfcfb89548fd844b69c004a803faea69	SAPLEPH WE	Service Staff	Front of House	39.00	\N	\N	\N	\N	employee	active	2026-06-17 08:39:19.140875+00	2026-06-17 09:02:19.389279+00	\N	\N	\N	part_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV023	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	my	manual	0.00	\N
c24f441a-3548-4903-91a6-bbc3c0c992b2	U6a3c70e39ddfed135620b64294fd2c95	HninNu Swe	Staff	Back of House	36.00	\N	\N	\N	\N	employee	active	2026-06-17 09:16:41.314642+00	2026-06-17 10:40:13.327731+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV039	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	my	manual	0.00	\N
e2e8b582-3960-4628-bd73-455e3ce6a107	U8d4a940b61b8aeacd6437ee652e96434	Waraporn Saekong	Inventory Manager	Inventory	25000.00	2026-06-04	2026-09-02	\N	\N	employee	active	2026-06-12 05:12:50.221561+00	2026-06-17 15:41:24.865681+00	\N	095-719-4351	Warapornsaekong@gmail.com	contract	\N	passed	\N	\N	9553c7d5-9245-4b81-a108-c1ed6c732240	\N	CHV002	bank	SIAM COMMERCIAL BANK	วราภรณ์ แซ่ก๋ง	553-400257-4	0553 สาขานครศรีธรรมราช	f	\N	\N	\N	\N	\N	\N	0f46108a-ba89-407d-a3cc-a185ad7b7822	11:00:00	20:00:00	monthly	\N	4	en	line	\N	\N
d3f1c53b-bfba-448a-b96b-244ce25c01c9	Ud1bc3bbcad353595452a42571bf3a652	Myo Myo Lwin	Staff	Back of House	36.00	\N	\N	\N	\N	employee	active	2026-06-17 09:18:25.528234+00	2026-06-17 10:26:36.200512+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV031	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	en	line	0.00	\N
ceb232dc-2430-4127-b91f-afe563e8e875	Ub2ad535b213e526d1a79d4fd35876546	Wai Wai Htun	Service Staff	Front of House	\N	\N	\N	\N	\N	employee	active	2026-06-17 10:20:37.715425+00	2026-06-17 10:32:03.834144+00	\N	\N	\N	\N	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNVO19	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	hourly	\N	\N	en	line	\N	\N
97f03828-c30d-4516-a270-133196f5701b	U0a3d33fdfd0007ba1fc0c9d33abe4025	Thant Zin Min	Staff	Back of House	44.00	\N	\N	\N	\N	employee	active	2026-06-17 08:38:53.478588+00	2026-06-17 09:08:00.630653+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV037	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	my	manual	0.00	\N
5182d9f4-b207-4feb-94ec-a314deb03706	Ub04c7e320a11aa5be7f22247c740cf1f	Sai ice say	Service Staff	Front of House	42.00	\N	\N	\N	\N	employee	active	2026-06-17 09:46:53.061712+00	2026-06-17 10:32:18.429614+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV008	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	22:00:00	hourly	myanmar	4	zh	line	0.00	\N
00bf2189-f5da-43c2-a71a-f661bffcadfd	U8074b50337ed1d1552e638cc5a9add15	Khin Sandi Win	Cashier	Front of House	50.00	\N	\N	\N	\N	employee	active	2026-06-17 09:43:40.901774+00	2026-06-17 10:17:49.263112+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV013	bank	KRUNG THAI BANK	Khin Sandi Win	7990562618	-	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	en	manual	0.00	\N
f2568386-f329-468c-9c83-c4bbbf029b35	U41fe5a6576a42eae8b5cff8ecf8d08a5	LOUNG WE	Service Staff	Front of House	36.00	\N	\N	\N	\N	employee	active	2026-06-17 08:38:22.333957+00	2026-06-17 09:00:49.169386+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV020	bank	KASIKORNBANK	Lon We	1478422195	-	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	my	manual	0.00	\N
40d9eac1-1b54-42b9-b3d7-9048f51458d3	Ua7b9bb4b1d238ea5559c8879798a2e07	Htet naing Aung	Staff	Back of House	42.00	\N	\N	\N	\N	employee	active	2026-06-17 08:40:06.279299+00	2026-06-17 09:04:08.226944+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV032	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	\N	hourly	myanmar	4	my	manual	0.00	\N
1cc97596-7975-4816-86ef-a0a1afc1dbbd	U84990a036d9ebb40ef6be1316cf2a5d2	Khun san Thein	Service Staff	Front of House	\N	\N	\N	\N	\N	employee	active	2026-06-17 10:07:43.96943+00	2026-06-17 10:24:17.405872+00	\N	\N	\N	\N	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV014	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	hourly	\N	\N	my	manual	\N	\N
2bdc93a5-809c-4fba-8c09-bc53c7938e89	Udaac87013e05357bd48a5e545de5a932	YiWei Sun	Chef Manager	Back of House	48.00	\N	\N	\N	\N	employee	active	2026-06-17 09:12:41.624692+00	2026-06-17 09:16:39.423854+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV040	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	chinese	5	zh	manual	0.00	\N
c5a179d0-97cf-4d04-ae9e-6869e3769025	U739bb8777e0658e09a5d10d53ba39097	Zin Min Htike	Staff	Back of House	33.00	\N	\N	\N	\N	employee	active	2026-06-17 08:38:32.414823+00	2026-06-17 09:06:35.204886+00	\N	\N	\N	part_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV033	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	my	manual	0.00	\N
5fdd152c-6bf1-47f9-bc7e-fc3df012df2e	Ua06e594579ede09f7f0e52bd7f833d4e	SAI AON KHAY	Staff	Back of House	56.00	\N	\N	\N	\N	employee	active	2026-06-17 07:57:38.907977+00	2026-06-17 10:33:17.405146+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV028	bank	KASIKORNBANK	SAI AON KHAY	1728779922	-	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	en	line	0.00	\N
9cdf2d69-19b2-4da5-b981-690fbd102730	U783f0eb265727ff6a537cf4520af5551	YE YINT TUN	Staff	Back of House	44.00	\N	\N	\N	\N	employee	active	2026-06-17 09:15:42.78702+00	2026-06-17 10:26:04.490392+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV026	bank	SIAM COMMERCIAL BANK	MISTER YE YINT TUN	4131988303	\N	f	\N	\N	\N	\N	\N	\N	1034f74f-a608-45ac-8025-8951d614c44f	14:00:00	02:00:00	hourly	myanmar	4	en	line	0.00	\N
c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	U390f8e89ff72bdcbcd28a8d831827cc9	Monthakan Meekeaw	HR Officer	Officer	40000.00	2026-05-19	\N	\N	\N	hr	active	2026-06-12 03:16:56.63606+00	2026-06-17 09:44:12.681197+00	1995-03-10	0957546270	mina.583197@gmail.com	full_time	\N	passed	\N	\N	9553c7d5-9245-4b81-a108-c1ed6c732240	\N	CHV001	bank	SIAM COMMERCIAL BANK	นางสาวมณฑกานต์ มีแก้ว	553-297252-9	0553 สาขานครศรีธรรมราช	f	\N	\N	\N	\N	\N	\N	0f46108a-ba89-407d-a3cc-a185ad7b7822	11:00:00	20:00:00	monthly	thai	4	th	manual	\N	scrypt:16384:8:1:52e2e2840d96125a705621ffcb09d63b:b35c763d6363b31251f7325f80ef81c74868172569a06e6b3aa8524b8f358f432a0b70e2c46cec0d98394dcb9b13da164ae4fe8824a5b814709ec82338848567
7b2455cd-2218-48bd-9d8c-f8615122da3e	U2436ba50e9c3d6617ea6deed64a41d18	Hlaine Htet Htet Kyaw	Service Staff	Front of House	50.00	\N	\N	\N	\N	employee	active	2026-06-17 09:18:26.712247+00	2026-06-17 09:33:51.829192+00	\N	\N	\N	full_time	\N	\N	\N	\N	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	\N	CNV009	cash	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	89fcc386-c2e5-4623-a089-0128edbdf8f5	10:00:00	22:00:00	hourly	myanmar	4	th	line	0.00	\N
\.


--
-- Data for Name: hr_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_alerts" ("id", "employee_id", "alert_type", "trigger_date", "sent_at", "status", "created_at") FROM stdin;
\.


--
-- Data for Name: hr_announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_announcements" ("id", "title", "body", "target_type", "target_value", "status", "sent_at", "created_by", "created_at", "scheduled_at", "image_path") FROM stdin;
\.


--
-- Data for Name: hr_attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_attendance" ("id", "employee_id", "check_in_at", "check_out_at", "check_in_location", "is_late", "work_hours", "created_at", "work_shift_id", "shift_date", "check_out_location", "location_review_status", "location_review_flags", "location_review_note", "location_reviewed_by", "location_reviewed_at") FROM stdin;
\.


--
-- Data for Name: hr_attendance_corrections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_attendance_corrections" ("id", "employee_id", "work_date", "correction_type", "source", "attendance_id", "created_by", "created_at") FROM stdin;
\.


--
-- Data for Name: hr_attendance_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_attendance_submissions" ("id", "attendance_id", "employee_id", "work_date", "submitted_at", "expires_at", "approval_status", "manager_decided_by", "manager_decided_at", "hr_decided_by", "hr_decided_at", "decision_note", "created_at") FROM stdin;
\.


--
-- Data for Name: hr_branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_branches" ("id", "name", "code", "manager_employee_id", "created_at", "updated_at", "address", "latitude", "longitude", "geofence_radius_m", "geofence_enabled") FROM stdin;
8b875263-ae46-480f-8ebb-2723737811f2	Huai Khwang	002	\N	2026-06-12 05:25:34.869209+00	2026-06-15 06:00:28.191354+00	\N	\N	\N	200	t
c9dea1d6-0d98-4ea4-86ed-f1f99edd6cdc	Thonglor	003	\N	2026-06-12 05:26:00.918098+00	2026-06-15 06:00:28.191354+00	\N	\N	\N	200	t
9553c7d5-9245-4b81-a108-c1ed6c732240	Head Office	000	c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	2026-06-11 15:54:56.599534+00	2026-06-15 07:03:56.80489+00	\N	\N	\N	200	f
5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	Bang Na	001	a1e37c35-6fd1-493c-b175-f7ff3d72e797	2026-06-12 05:25:14.462338+00	2026-06-17 13:46:07.907182+00	13 Debaratna Rd, Bang Kaeo, Bang Phli District, Samut Prakan 10540	13.6509960	100.6774420	50	t
\.


--
-- Data for Name: hr_complaints; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_complaints" ("id", "employee_id", "ticket_code", "subject", "body", "is_anonymous", "status", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: hr_complaint_replies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_complaint_replies" ("id", "complaint_id", "author_employee_id", "message", "created_at") FROM stdin;
\.


--
-- Data for Name: hr_compliance_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_compliance_notes" ("id", "employee_id", "category", "note", "created_by", "created_at") FROM stdin;
\.


--
-- Data for Name: hr_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_departments" ("id", "name", "created_at", "branch_id") FROM stdin;
8c34e77c-1b4a-4311-af3b-08ac517e64e4	IT	2026-06-12 05:56:39.142295+00	9553c7d5-9245-4b81-a108-c1ed6c732240
bd6a7087-cc85-428f-9208-00551be58b29	Inventory	2026-06-12 07:00:03.528145+00	9553c7d5-9245-4b81-a108-c1ed6c732240
232cb9aa-e904-41b9-b13b-572798c313cf	Officer	2026-06-15 12:49:16.597724+00	9553c7d5-9245-4b81-a108-c1ed6c732240
c873606f-8227-43f3-a1d8-31e99481f208	Front of House	2026-06-15 12:52:31.937489+00	9553c7d5-9245-4b81-a108-c1ed6c732240
1e8c16b5-a898-41c3-8fa8-6de0a7e3867b	Back of House	2026-06-15 12:52:46.823541+00	9553c7d5-9245-4b81-a108-c1ed6c732240
\.


--
-- Data for Name: hr_document_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_document_requests" ("id", "employee_id", "doc_type", "copies", "purpose", "status", "hr_note", "result_file_url", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: hr_leave_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_leave_balances" ("employee_id", "leave_type", "total_days", "used_days", "updated_at") FROM stdin;
2f2aae72-12c1-4d30-b038-075c85ace626	sick	30.00	0.00	2026-06-15 12:39:02.136733+00
2f2aae72-12c1-4d30-b038-075c85ace626	personal	3.00	0.00	2026-06-15 12:39:02.136733+00
2f2aae72-12c1-4d30-b038-075c85ace626	annual	6.00	0.00	2026-06-15 12:39:02.136733+00
2f2aae72-12c1-4d30-b038-075c85ace626	maternity	0.00	0.00	2026-06-15 12:39:02.136733+00
2f2aae72-12c1-4d30-b038-075c85ace626	unpaid	0.00	0.00	2026-06-15 12:39:02.136733+00
2f2aae72-12c1-4d30-b038-075c85ace626	emergency	0.00	0.00	2026-06-15 12:39:02.136733+00
2f2aae72-12c1-4d30-b038-075c85ace626	other	0.00	0.00	2026-06-15 12:39:02.136733+00
e2e8b582-3960-4628-bd73-455e3ce6a107	sick	30.00	0.00	2026-06-15 12:40:55.700248+00
e2e8b582-3960-4628-bd73-455e3ce6a107	personal	3.00	0.00	2026-06-15 12:40:55.700248+00
e2e8b582-3960-4628-bd73-455e3ce6a107	annual	6.00	0.00	2026-06-15 12:40:55.700248+00
e2e8b582-3960-4628-bd73-455e3ce6a107	maternity	0.00	0.00	2026-06-15 12:40:55.700248+00
e2e8b582-3960-4628-bd73-455e3ce6a107	unpaid	0.00	0.00	2026-06-15 12:40:55.700248+00
e2e8b582-3960-4628-bd73-455e3ce6a107	emergency	0.00	0.00	2026-06-15 12:40:55.700248+00
e2e8b582-3960-4628-bd73-455e3ce6a107	other	0.00	0.00	2026-06-15 12:40:55.700248+00
c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	personal	3.00	0.00	2026-06-15 12:41:00.732043+00
c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	annual	6.00	0.00	2026-06-15 12:41:00.732043+00
c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	maternity	0.00	0.00	2026-06-15 12:41:00.732043+00
c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	unpaid	0.00	0.00	2026-06-15 12:41:00.732043+00
c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	emergency	0.00	0.00	2026-06-15 12:41:00.732043+00
c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	other	0.00	0.00	2026-06-15 12:41:00.732043+00
c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	sick	30.00	7.00	2026-06-16 16:55:29.558157+00
\.


--
-- Data for Name: hr_leave_policy_defaults; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_leave_policy_defaults" ("leave_type", "annual_days", "updated_at") FROM stdin;
other	0.00	2026-06-15 12:14:02.473505+00
personal	3.00	2026-06-15 12:19:43.835319+00
annual	6.00	2026-06-15 12:21:12.560624+00
maternity	0.00	2026-06-15 12:21:43.351283+00
unpaid	0.00	2026-06-15 12:21:43.351283+00
emergency	0.00	2026-06-15 12:21:43.351283+00
sick	30.00	2026-06-15 12:37:18.94615+00
\.


--
-- Data for Name: hr_leaves; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_leaves" ("id", "employee_id", "type", "start_date", "end_date", "reason", "status", "approved_by", "attachment_url", "created_at", "updated_at", "decision_note", "leave_unit", "leave_hours", "submitted_at", "expires_at", "approval_status", "manager_decided_by", "manager_decided_at", "hr_decided_by", "hr_decided_at", "medical_certificate_url") FROM stdin;
\.


--
-- Data for Name: hr_line_pending_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_line_pending_actions" ("id", "line_user_id", "approver_employee_id", "action_kind", "target_id", "expires_at", "created_at") FROM stdin;
\.


--
-- Data for Name: hr_overtime_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_overtime_requests" ("id", "employee_id", "work_date", "start_time", "end_time", "reason", "status", "decision_note", "created_at", "updated_at", "submitted_by", "submitted_at", "approval_status", "hr_decided_by", "hr_decided_at", "manager_decided_by", "manager_decided_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: hr_payroll_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_payroll_config" ("key", "value", "updated_at") FROM stdin;
monthly_std_hours	176	2026-06-15 04:49:16.894676+00
ot_multiplier	1.5	2026-06-15 04:49:16.894676+00
sso_cap	750	2026-06-15 04:49:16.894676+00
sso_rate	0.05	2026-06-15 04:49:16.894676+00
work_entry_regular	WORK100	2026-06-15 04:49:16.894676+00
work_entry_ot	OT	2026-06-15 04:49:16.894676+00
work_entry_sick	LEAVE110	2026-06-15 04:49:16.894676+00
work_entry_annual	LEAVE120	2026-06-15 04:49:16.894676+00
odoo_monthly_struct_name	Monthly Salary - Thailand	2026-06-15 04:49:16.894676+00
odoo_hourly_struct_name	Hourly Wage - Thailand	2026-06-15 04:49:16.894676+00
payroll_cutoff_day	31	2026-06-15 07:03:56.943294+00
tax_enabled	false	2026-06-15 07:03:56.943294+00
tax_rate	0	2026-06-15 07:03:56.943294+00
leave_sick_deduct_enabled	false	2026-06-15 07:03:56.943294+00
\.


--
-- Data for Name: hr_payroll_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_payroll_periods" ("id", "year", "month", "branch_id", "created_at") FROM stdin;
f5ed51c5-54ac-4540-a2e6-ffd1736fb4f9	2026	6	\N	2026-06-15 05:15:19.431027+00
f2fb9295-497f-4d2f-8bb3-742b75626bfe	2026	6	\N	2026-06-15 08:50:41.89054+00
b33c5d22-a168-4a2f-955d-ec58811d8bb3	2026	6	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 10:53:35.868863+00
bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	2026	6	5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f	2026-06-16 11:34:24.256673+00
\.


--
-- Data for Name: hr_payroll_hour_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_payroll_hour_lines" ("id", "period_id", "employee_id", "line_type", "hours", "work_date", "source_type", "source_id", "created_at") FROM stdin;
76e20bd2-6bef-4935-a5ee-167e7172261b	b33c5d22-a168-4a2f-955d-ec58811d8bb3	c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	regular	0.02	2026-06-15	attendance	32b193ef-b56d-469a-8717-7b7a4fe4391f	2026-06-15 10:53:36.137406+00
11d15882-e79e-4f59-b9b4-1f2b5bdca1ef	b33c5d22-a168-4a2f-955d-ec58811d8bb3	c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	overtime	2.00	2026-06-15	overtime	9460ecbc-b645-4232-bec3-b7dc0dbb66e5	2026-06-15 11:20:38.212066+00
289941ef-4ab4-4b5b-bd7d-3f8f62223913	b33c5d22-a168-4a2f-955d-ec58811d8bb3	c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	overtime	2.00	2026-06-15	overtime	6511b152-ce5e-493d-993e-a267cd28bd76	2026-06-15 13:12:55.843064+00
b12bde38-dab7-47ec-a7d2-b3cd64c5e9c3	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	a1e37c35-6fd1-493c-b175-f7ff3d72e797	regular	0.03	2026-06-16	attendance	43707e67-8951-4da9-ad65-44a0f0b5a0e8	2026-06-16 11:34:24.518347+00
40eade98-7f98-4a8a-b3d8-704b38f8cd64	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	f1250741-89af-465f-b071-e07272ea1e07	regular	0.02	2026-06-16	attendance	e7a6bc50-0820-4c1e-9dc4-d9756620fea3	2026-06-16 11:36:44.650341+00
74116afb-568b-404d-b449-19b8a6ea0cd9	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	f1250741-89af-465f-b071-e07272ea1e07	overtime	1.00	2026-06-17	overtime	76a8c63c-a2b5-4b12-be72-1b4c67018fbb	2026-06-16 11:43:42.552169+00
e26b5702-fcc3-49ff-aadd-872440a433c4	b33c5d22-a168-4a2f-955d-ec58811d8bb3	c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	regular	10.00	2026-06-16	attendance	0bebf4f1-e7e9-42db-b81e-4777d334265d	2026-06-16 13:37:54.546144+00
2fa9e1af-e16e-48b1-a674-2af197f8095d	b33c5d22-a168-4a2f-955d-ec58811d8bb3	e2e8b582-3960-4628-bd73-455e3ce6a107	regular	9.67	2026-06-16	attendance	b6566210-328a-4553-bdef-56740608b09b	2026-06-16 13:38:31.133954+00
5f6f12f6-1d46-4b5a-a985-f32c94579408	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	7e9bbdf6-af8c-4c50-b82b-0dbc296353bb	regular	0.02	2026-06-17	attendance	650621be-e428-4511-874c-6faffb5ad38f	2026-06-17 10:22:02.883582+00
19cdf41e-5790-4320-a1ed-156b6d39c9fc	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	f3a5ecf6-63d5-4da1-9dc1-92bd398ef9b8	regular	0.02	2026-06-17	attendance	be6b25d4-f671-41fd-ac59-746b7c8145dc	2026-06-17 10:22:06.893282+00
dd539394-6144-45a4-8e2e-b7e0dd8892fb	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	9cdf2d69-19b2-4da5-b981-690fbd102730	regular	0.02	2026-06-17	attendance	3763a8e5-4ea4-44f7-aab8-3969bd2d8b45	2026-06-17 10:22:08.464533+00
af13145c-9bf8-4c4f-8c74-95e71dc4cc4c	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	d1bc5e8b-1216-4fbd-a7bf-1cbbd489b153	regular	0.02	2026-06-17	attendance	6058a4c5-f203-4cd5-a01e-57ab38b92d5d	2026-06-17 10:22:09.103721+00
f9c77fdc-3ae8-45cc-b05c-1dd3da0bbe91	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	40d9eac1-1b54-42b9-b3d7-9048f51458d3	regular	0.02	2026-06-17	attendance	58f40932-d2b5-47df-a78e-cb7c0f061748	2026-06-17 10:22:12.222689+00
c457ccda-6773-4747-81b8-09a9ffd243cd	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	6f3ff0dd-cd7f-45a8-a61d-7e070447d532	regular	0.02	2026-06-17	attendance	1737996a-52f1-4e48-8cd6-69d56f021bd9	2026-06-17 10:22:19.788019+00
12fee64c-24a3-4238-b9c0-f48a970c9c13	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	d3f1c53b-bfba-448a-b96b-244ce25c01c9	regular	0.03	2026-06-17	attendance	7b588afd-539a-4c37-bf10-1ddd2e9a9ffe	2026-06-17 10:22:42.715807+00
63f278a9-8e42-4e91-b37c-d425f269f6b3	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	36fc2946-02ee-4453-a376-a056f1ab42af	regular	0.03	2026-06-17	attendance	37b725d5-c9f1-41bd-90f0-ccca506e5690	2026-06-17 10:22:43.988971+00
08cec60e-750a-4b1a-9709-484c7547887c	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	61eb5eb9-debc-4cec-aa28-080eaab73e96	regular	0.03	2026-06-17	attendance	0e81180a-39a2-4b4a-9c16-d69bd219325e	2026-06-17 10:22:54.949251+00
71cb6125-e45b-4a4b-b924-0ca36c7e4cd3	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	04e9a478-10e8-4f70-a06e-33c49e5fb024	regular	0.03	2026-06-17	attendance	9c3cc435-4cd5-4b96-85b4-d20199d0efac	2026-06-17 10:23:06.4274+00
dbb320c4-c061-45ce-ba1f-f7308a1e2008	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	19ac1599-ef67-45db-b69f-1b811ed32deb	regular	0.03	2026-06-17	attendance	8ae271f4-7df9-4479-8d9f-9e4af0a53e62	2026-06-17 10:23:06.633027+00
d653fb90-dc43-49dd-adfd-b9c5832a082f	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	f2568386-f329-468c-9c83-c4bbbf029b35	regular	0.03	2026-06-17	attendance	5e01f7a3-a8db-4d41-9992-100e6e691cb7	2026-06-17 10:23:10.616313+00
6722cd29-6270-44b5-9157-af784b5d4bb4	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	5fdd152c-6bf1-47f9-bc7e-fc3df012df2e	regular	0.03	2026-06-17	attendance	ec6f0519-96c8-4ba3-8f29-a2ce67575f31	2026-06-17 10:23:19.364427+00
b39ef766-079f-483f-a536-c3024a5a1d56	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	9bacc73d-92ca-477a-a45c-cc68a21c0e24	regular	0.03	2026-06-17	attendance	6753eb75-459d-4e6d-a275-165079b3fac5	2026-06-17 10:23:19.418721+00
1630466e-337e-41ca-86a9-565f2df0c5bb	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	97f03828-c30d-4516-a270-133196f5701b	regular	0.03	2026-06-17	attendance	2d1f6e6f-3242-4325-8ef3-050093b12414	2026-06-17 10:23:24.272987+00
a7e0f589-efd3-4ed1-b1a5-2ced2923886d	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	5b8ac6c6-1707-4c9e-b8ea-7f624c9a5a56	regular	0.03	2026-06-17	attendance	005dc011-531b-43ea-a1d8-c9575419cc43	2026-06-17 10:23:32.501517+00
d1e2fab4-6b3a-4745-a9e7-89ad4f75aedf	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	c5a179d0-97cf-4d04-ae9e-6869e3769025	regular	0.05	2026-06-17	attendance	3b37cb18-b2c5-4de3-a003-498746cabab1	2026-06-17 10:23:36.566243+00
1c99b00a-1682-46c5-b249-e09d523b167e	bd04c2c3-aa72-4299-86bd-cbc3d8bf833c	5182d9f4-b207-4feb-94ec-a314deb03706	regular	0.05	2026-06-17	attendance	ef339965-7725-45be-926d-f9ab5337f75f	2026-06-17 10:24:07.259714+00
71d43811-1ea2-4c84-914c-26b5df2b072d	b33c5d22-a168-4a2f-955d-ec58811d8bb3	e2e8b582-3960-4628-bd73-455e3ce6a107	regular	9.02	2026-06-17	attendance	96b8fbf4-55c0-4001-b278-27561cbefeda	2026-06-17 13:00:23.795465+00
800f0173-8591-4e17-a6f5-2715ab336efa	b33c5d22-a168-4a2f-955d-ec58811d8bb3	c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	regular	10.25	2026-06-17	attendance	785a0c73-8cdc-435f-8a65-5313f4fbab47	2026-06-17 13:51:01.774287+00
\.


--
-- Data for Name: hr_payroll_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_payroll_runs" ("id", "period", "period_start", "period_end", "cutoff_day", "status", "locked_at", "locked_by", "employee_count", "total_gross", "total_net", "created_at", "updated_at") FROM stdin;
6d5079c8-86bf-46a3-9d5a-fb530c00e7a2	2026-06	2026-05-26	2026-06-25	25	draft	\N	\N	2	65000.00	63500.00	2026-06-15 07:04:20.621921+00	2026-06-15 07:04:22.510195+00
\.


--
-- Data for Name: hr_payslips; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_payslips" ("id", "run_id", "employee_id", "pay_type", "pay_day", "payment_date", "gross_amount", "sso_deduction", "other_deductions", "tax_deduction", "net_amount", "status", "pdf_path", "regular_hours", "ot_hours", "sick_hours", "annual_hours", "base_rate", "monthly_salary", "created_at", "updated_at") FROM stdin;
561cd6c0-5bd1-4fa2-b980-27184e1f0638	6d5079c8-86bf-46a3-9d5a-fb530c00e7a2	e2e8b582-3960-4628-bd73-455e3ce6a107	monthly	4	2026-07-04	25000.00	750.00	0.00	0.00	24250.00	draft	\N	0.00	0.00	0.00	0.00	142.05	25000.00	2026-06-15 07:04:21.460493+00	2026-06-15 07:04:21.460493+00
d0dd91e1-4e93-4ce5-b9e4-a1fe3d62047c	6d5079c8-86bf-46a3-9d5a-fb530c00e7a2	c16ef716-339d-4fd3-8fc6-16efe4c7ee9e	monthly	4	2026-07-04	40000.00	750.00	0.00	0.00	39250.00	draft	\N	0.00	0.00	0.00	0.00	227.27	40000.00	2026-06-15 07:04:21.995487+00	2026-06-15 07:04:21.995487+00
\.


--
-- Data for Name: hr_payslip_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_payslip_lines" ("id", "payslip_id", "code", "label", "amount", "sort_order", "created_at") FROM stdin;
3a41e213-c99b-4d24-89c1-ee6046d7188d	561cd6c0-5bd1-4fa2-b980-27184e1f0638	BASIC	เงินเดือน	25000.00	10	2026-06-15 07:04:21.744568+00
f693d0a0-638c-4c3d-aa35-2d4f7c822ed2	561cd6c0-5bd1-4fa2-b980-27184e1f0638	SSO	ประกันสังคม	-750.00	90	2026-06-15 07:04:21.744568+00
5dfa0540-d6e9-49e3-af32-f2930561a902	d0dd91e1-4e93-4ce5-b9e4-a1fe3d62047c	BASIC	เงินเดือน	40000.00	10	2026-06-15 07:04:22.250338+00
3a36c6c5-0da1-4b42-907f-5ca0470ec1e3	d0dd91e1-4e93-4ce5-b9e4-a1fe3d62047c	SSO	ประกันสังคม	-750.00	90	2026-06-15 07:04:22.250338+00
\.


--
-- Data for Name: hr_positions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_positions" ("id", "name", "department_id", "branch_id", "created_at") FROM stdin;
2450142a-cfbe-487c-b647-57c7e2fbf07e	Developers	8c34e77c-1b4a-4311-af3b-08ac517e64e4	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-12 05:56:39.142295+00
02850d66-f893-4744-af6e-b34d8c284157	HR Officer	232cb9aa-e904-41b9-b13b-572798c313cf	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:49:30.281661+00
90992dcb-2b82-40b4-9cd4-c367b7b11569	Accounting	232cb9aa-e904-41b9-b13b-572798c313cf	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:49:38.265751+00
8d8a4fc2-2afa-4232-964c-cd77832e4ed6	IT	232cb9aa-e904-41b9-b13b-572798c313cf	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:49:51.021548+00
5be4a672-9a58-4e1e-a516-b176bd5a0ed7	Branch Manager	c873606f-8227-43f3-a1d8-31e99481f208	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:53:09.910868+00
40e41645-1de9-4985-b9c6-397e7b82f051	Service Staff	c873606f-8227-43f3-a1d8-31e99481f208	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:53:24.216014+00
ce012b31-076e-4df7-84f6-c85605ea7c0f	Cashier	c873606f-8227-43f3-a1d8-31e99481f208	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:53:53.236089+00
6da3855b-96bc-4d68-9f9f-57fd2b2966c3	Reception	c873606f-8227-43f3-a1d8-31e99481f208	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:54:05.646732+00
ad0d46fb-2200-4ea3-afec-2df25cd725d4	Chef Manager	1e8c16b5-a898-41c3-8fa8-6de0a7e3867b	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:54:35.835464+00
126e304b-d184-4551-8332-83f02d83c213	Sous Chef	1e8c16b5-a898-41c3-8fa8-6de0a7e3867b	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:54:47.493588+00
a25704d5-1c78-4194-b86a-71cacc519348	Staff	1e8c16b5-a898-41c3-8fa8-6de0a7e3867b	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:55:40.975306+00
d680d3c7-dc8a-4ea7-b900-a0cb2e5a4f0c	Staff	bd6a7087-cc85-428f-9208-00551be58b29	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 12:58:17.729796+00
69ace939-b3db-4a14-b763-11e4743e02dd	Inventory Manager	bd6a7087-cc85-428f-9208-00551be58b29	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-15 13:07:21.311636+00
4779eede-19db-496d-a950-0c85c56981ac	CEO	232cb9aa-e904-41b9-b13b-572798c313cf	9553c7d5-9245-4b81-a108-c1ed6c732240	2026-06-16 06:15:40.012893+00
\.


--
-- Data for Name: hr_runtime_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."hr_runtime_config" ("key", "value", "updated_at") FROM stdin;
work_start_hour	12	2026-06-15 04:43:38.717651+00
work_start_minute	0	2026-06-15 04:43:39.013011+00
hr_line_group_id	Ce45348a55eae08658be6f126749138d7	2026-06-17 10:21:31.149914+00
morning_push_employee_enabled	true	2026-06-17 13:43:29.235234+00
morning_push_employee_fallback_time	09:00	2026-06-17 13:43:29.54422+00
morning_push_employee_fallback_time_2	14:00	2026-06-17 13:43:29.811829+00
morning_push_employee_remind_after_min	10	2026-06-17 13:43:30.09598+00
morning_push_employee_days	1,2,3,4,5,6,7	2026-06-17 13:43:30.359474+00
morning_push_officer_enabled	true	2026-06-17 13:43:31.30151+00
morning_push_officer_fallback_time	11:00	2026-06-17 13:43:31.564325+00
morning_push_officer_fallback_time_2	11:00	2026-06-17 13:43:31.835408+00
morning_push_officer_remind_after_min	10	2026-06-17 13:43:32.101697+00
morning_push_officer_days	1,2,3,4,5	2026-06-17 13:43:32.3685+00
\.


--
-- Data for Name: inv_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_units" ("id", "name", "abbreviation", "created_at") FROM stdin;
61adab81-0784-4e4c-8dca-181612cc1e68	ชิ้น	pcs	2026-06-12 12:47:56.172951+00
7293c5f0-a862-44cb-9fc0-b08e8914f6f7	กิโลกรัม	kg	2026-06-12 12:47:56.172951+00
37b510de-a40f-4066-a59e-06344ba7c0de	กรัม	g	2026-06-12 12:47:56.172951+00
7516bf48-bed6-4201-8f3c-67ca9f2d8039	ลิตร	L	2026-06-12 12:47:56.172951+00
f03a7189-d5c1-49af-9831-033589fe57f5	มิลลิลิตร	ml	2026-06-12 12:47:56.172951+00
9a400c31-5327-4694-98e1-4b5178642929	แพ็ค	pack	2026-06-12 12:47:56.172951+00
e4401658-b099-4a49-89dd-6f2252b333ad	ถุง	bag	2026-06-12 12:47:56.172951+00
e9341546-3377-401f-9f5b-2708dcb42c88	กล่อง	box	2026-06-12 12:47:56.172951+00
\.


--
-- Data for Name: inv_skus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_skus" ("id", "code", "name", "category", "unit_id", "barcode", "min_stock", "max_stock", "image_url", "is_active", "created_at", "updated_at", "expiry_required", "lot_tracking_required", "default_issue_method", "shelf_life_days", "storage_type") FROM stdin;
\.


--
-- Data for Name: inv_boms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_boms" ("id", "sku_id", "ingredient_sku_id", "quantity", "unit_id", "is_active", "created_at") FROM stdin;
\.


--
-- Data for Name: inv_branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_branches" ("id", "code", "name", "address", "is_active", "created_at", "updated_at", "hr_branch_id") FROM stdin;
\.


--
-- Data for Name: inv_warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_warehouses" ("id", "code", "name", "branch_id", "type", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_consumptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_consumptions" ("id", "branch_id", "warehouse_id", "sku_id", "qty", "consumption_type", "recorded_by", "recorded_at", "notes", "created_at") FROM stdin;
\.


--
-- Data for Name: inv_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_suppliers" ("id", "code", "name", "address", "contact", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_inbound_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_inbound_orders" ("id", "supplier_id", "warehouse_id", "status", "received_date", "notes", "created_by", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_inbound_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_inbound_items" ("id", "inbound_order_id", "sku_id", "quantity", "cost_per_unit", "lot_number", "expiry_date", "created_at") FROM stdin;
\.


--
-- Data for Name: inv_stock_lots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_stock_lots" ("id", "sku_id", "warehouse_id", "lot_number", "batch_number", "supplier_lot_ref", "expiry_date", "manufactured_date", "received_date", "received_qty", "remaining_qty", "unit_cost", "status", "inbound_item_id", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_damages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_damages" ("id", "branch_id", "warehouse_id", "sku_id", "qty", "damage_type", "reason", "photo_url", "status", "cost_value", "approval_required_role", "auto_approved", "approver_id", "approved_at", "rejected_at", "rejection_reason", "created_by", "created_at", "updated_at", "notes", "lot_id") FROM stdin;
\.


--
-- Data for Name: inv_requisitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_requisitions" ("id", "branch_id", "warehouse_id", "requester_id", "status", "notes", "rejection_reason", "approved_by", "approved_at", "issued_by", "issued_at", "received_by", "received_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_requisition_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_requisition_items" ("id", "requisition_id", "sku_id", "qty_requested", "qty_approved", "qty_issued", "qty_received", "lot_number", "notes", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_requisition_issue_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_requisition_issue_lines" ("id", "requisition_item_id", "lot_id", "qty_issued", "override_reason", "overridden_by", "created_at") FROM stdin;
\.


--
-- Data for Name: inv_stock_counts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_stock_counts" ("id", "branch_id", "warehouse_id", "scope", "status", "planned_at", "started_at", "completed_at", "created_by", "notes", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_stock_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_stock_adjustments" ("id", "count_id", "warehouse_id", "sku_id", "qty_delta", "reason", "status", "created_by", "applied_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_stock_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_stock_balances" ("id", "sku_id", "warehouse_id", "quantity", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_stock_count_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_stock_count_items" ("id", "count_id", "sku_id", "system_qty", "physical_qty", "lot_number", "counted_by", "counted_at", "created_at", "updated_at", "lot_id") FROM stdin;
\.


--
-- Data for Name: inv_stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_stock_movements" ("id", "sku_id", "warehouse_id", "movement_type", "quantity", "reference_type", "reference_id", "lot_number", "created_by", "notes", "created_at", "lot_id", "qty_before", "qty_after") FROM stdin;
\.


--
-- Data for Name: inv_transfers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_transfers" ("id", "from_warehouse_id", "to_warehouse_id", "from_branch_id", "to_branch_id", "status", "shipper", "created_by", "sent_by", "received_by", "sent_at", "received_at", "notes", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: inv_transfer_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_transfer_items" ("id", "transfer_id", "sku_id", "qty_sent", "qty_received", "lot_number", "created_at", "updated_at", "lot_id", "source_lot_id") FROM stdin;
\.


--
-- Data for Name: inv_unit_conversions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inv_unit_conversions" ("id", "from_unit_id", "to_unit_id", "factor", "created_at") FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

-- \unrestrict V2XMce0dJ2n99t67rlz8GOBcUGdTuCgyuafSjg4LLdIBMtxypfCukzSMcqGBnzy

RESET ALL;
