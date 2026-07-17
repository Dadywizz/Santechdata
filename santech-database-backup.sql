--
-- PostgreSQL database dump
--

\restrict fQGz7NBguMErAuJ3DRzwXs2yHerjAcdECx6GZphyohxvPdvfGh7uHW4uLswHXyR

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: airtime_to_cash; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.airtime_to_cash (
    id text NOT NULL,
    user_id text NOT NULL,
    network text NOT NULL,
    airtime_amount numeric(12,2) NOT NULL,
    payout_amount numeric(12,2) NOT NULL,
    rate integer NOT NULL,
    sender_phone text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id text NOT NULL,
    user_id text NOT NULL,
    name character varying(255) NOT NULL,
    key text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    total_requests integer DEFAULT 0 NOT NULL,
    last_used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: data_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_plans (
    id text NOT NULL,
    network text NOT NULL,
    name character varying(100) NOT NULL,
    size character varying(20) NOT NULL,
    validity character varying(50) NOT NULL,
    price numeric(10,2) NOT NULL,
    cost_price numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    provider_code character varying(100) DEFAULT ''::character varying NOT NULL,
    reseller_price numeric(10,2)
);


--
-- Name: exam_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_types (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    code text NOT NULL,
    price numeric(10,2) NOT NULL,
    cost_price numeric(10,2) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otps (
    id text NOT NULL,
    email character varying(255) NOT NULL,
    otp character varying(10) NOT NULL,
    type text NOT NULL,
    used boolean DEFAULT false NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_messages (
    id text NOT NULL,
    ticket_id text NOT NULL,
    sender_id text NOT NULL,
    sender_role text NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id text NOT NULL,
    user_id text NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text NOT NULL,
    reference character varying(100),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'customer'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    referral_code character varying(20),
    referred_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    last_login_at timestamp without time zone,
    reseller_since timestamp without time zone
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id text NOT NULL,
    user_id text NOT NULL,
    balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    currency text DEFAULT 'NGN'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    virtual_account_number character varying(20),
    virtual_account_bank character varying(100)
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webauthn_credentials (
    id text NOT NULL,
    user_id text NOT NULL,
    credential_id text NOT NULL,
    public_key text NOT NULL,
    counter integer DEFAULT 0 NOT NULL,
    device_name character varying(100) DEFAULT 'My Device'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: airtime_to_cash; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.airtime_to_cash (id, user_id, network, airtime_amount, payout_amount, rate, sender_phone, status, admin_note, created_at, updated_at) FROM stdin;
e9235d7b-8ae1-4c65-bd40-c1746b61c05d	64014564-6af7-4eb4-8ea2-6d1190658710	MTN	500.00	355.00	75	08063136201	pending	\N	2026-06-06 11:41:14.490765	2026-06-06 11:41:14.490765
841e34f4-4bfb-488b-b2ce-d311412fbd98	64014564-6af7-4eb4-8ea2-6d1190658710	MTN	500.00	355.00	75	08012345678	approved	\N	2026-06-06 11:41:49.950812	2026-06-06 11:41:50.239
fd818b58-8197-452a-a00a-40cf9f7cb3be	64014564-6af7-4eb4-8ea2-6d1190658710	GLO	1000.00	630.00	65	08012345678	rejected	Airtime not received after 30 minutes	2026-06-06 11:41:50.367051	2026-06-06 11:41:50.6
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.api_keys (id, user_id, name, key, is_active, total_requests, last_used_at, created_at) FROM stdin;
\.


--
-- Data for Name: data_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_plans (id, network, name, size, validity, price, cost_price, is_active, created_at, updated_at, provider_code, reseller_price) FROM stdin;
51977fe8-9250-472d-8a90-2e767eb16015	AIRTEL	10 Minutes Airtel Talk more	?	30 Days	99.00	96.03	f	2026-06-09 15:26:02.661358	2026-06-29 15:50:44.585847	492	\N
6180f810-dae8-4c24-8e9e-5b3cfd114a85	MTN	2.GB 7DAYS	2GB	7 Days	930.00	902.10	f	2026-06-24 14:37:38.194759	2026-06-29 15:50:44.585847	850	\N
d9bef659-de40-4ab0-9d0e-d7b71838890c	MTN	1GB SMART	1GB	30 Days	235.00	227.95	f	2026-06-24 14:37:38.271551	2026-06-29 15:50:44.68628	857	228.00
01ce4112-f735-4783-aedc-600f1ce6f175	MTN	1.GB SMART	1GB	30 Days	235.00	227.95	t	2026-06-24 14:37:38.261854	2026-06-29 09:53:41.062039	859	228.00
0f74b5c5-1c20-485c-95bb-af21f14e2471	MTN	10.GB 30DAYS	10GB	30 Days	4600.00	4462.00	f	2026-06-09 15:26:02.607889	2026-06-29 15:50:44.585847	795	\N
85cd2df5-b7b2-474f-97b0-1800ae0c7ea3	MTN	3.GB 1DAY	3GB	1 Day	800.00	776.00	t	2026-06-24 14:37:38.307401	2026-06-29 09:53:41.062039	861	776.00
d0cf8052-91ce-4a09-9b64-a9b1df7bfe0e	MTN	2.5GB 1DAY	2.5GB	1 Day	600.00	582.00	f	2026-06-24 14:37:38.303687	2026-06-24 14:37:38.737	860	\N
1fc520d0-3a01-4f66-89c2-949fda63978a	MTN	1GB SMART	1GB	30 Days	280.00	271.60	f	2026-06-24 14:37:38.315437	2026-06-24 14:37:38.737	862	\N
a21fdc4a-c80f-4f4e-8f49-548ac465caec	AIRTEL	1.5GB 1DAY	1.5GB	1 Day	430.00	417.10	f	2026-06-09 15:26:02.720699	2026-06-24 14:37:38.737	780	\N
cefa9b7d-7bb3-45d5-8851-84b60cd91a36	MTN	500MB 7DAYS	500MB	7 Days	320.00	310.40	f	2026-06-09 15:26:02.753227	2026-06-24 14:37:38.737	601	\N
6ef5b7a6-39d3-4da5-bd62-500099918234	MTN	1GB SMART	1GB	30 Days	235.00	227.95	f	2026-06-09 15:26:02.792754	2026-06-24 14:37:38.737	790	\N
1ed5b6dd-363e-4868-860e-4237714e221a	MTN	500MB 30DAYS	500MB	30 Days	330.00	320.10	f	2026-06-09 15:26:02.868498	2026-06-24 14:37:38.737	451	\N
884b1a71-7eaa-4332-8e64-a9cc1af886e1	MTN	2.5GB 1DAY	2.5GB	1 Day	550.00	533.50	t	2026-06-24 14:37:38.27756	2026-06-29 09:53:41.062039	858	534.00
47477585-5e17-4965-b49a-509926f737fa	MTN	47MB 7DAYS ALL MEDIA	47MB	7 Days	220.00	213.40	t	2026-06-24 14:37:38.287394	2026-06-29 09:53:41.062039	851	213.00
3302702b-cb51-4d83-9f5e-c6f5073536c5	MTN	110MB DAILY	110MB	30 Days	100.00	97.00	t	2026-06-24 14:37:38.291853	2026-06-29 09:53:41.062039	852	97.00
2f005c2e-12e9-4c38-9478-c01efe76ad59	MTN	200MB All Social Daily Plan	200MB	30 Days	110.00	106.70	t	2026-06-24 14:37:38.297065	2026-06-29 09:53:41.062039	854	107.00
498b2dce-69d6-48a8-8134-adb68ab4a22c	MTN	500MB Pulse Nightlife Plan Daily	500MB	30 Days	120.00	116.40	t	2026-06-24 14:37:38.343814	2026-06-29 09:53:41.062039	853	116.00
71cf50c4-b90d-4c87-877c-a403ad07e2ab	MTN	5.GB 14DAYS	5GB	14 Days	1200.00	1164.00	f	2026-06-24 14:37:38.300066	2026-06-29 15:50:44.585847	856	\N
afc20a3a-ff12-46ef-b458-928841cc0fd8	MTN	3.GB SMART	3GB	30 Days	800.00	776.00	f	2026-06-24 14:37:38.323299	2026-06-29 15:50:44.585847	863	\N
28acd25a-4036-4e43-bde6-21ea8b748605	MTN	36.GB 30DAYS	36GB	30 Days	11100.00	10767.00	f	2026-06-09 15:26:02.683915	2026-06-29 15:50:44.585847	598	\N
975c47e7-a0c8-4e42-9a01-0ab28ff401c4	MTN	36.GB 30DAYS	36GB	30 Days	11200.00	10864.00	f	2026-06-09 15:26:02.687685	2026-06-29 15:50:44.585847	639	\N
0203e7b8-ed09-433a-9ff7-fcdb13c85a02	MTN	25.GB 30DAYS	25GB	30 Days	9400.00	9118.00	f	2026-06-09 15:26:02.690855	2026-06-29 15:50:44.585847	599	\N
73deb9f0-3726-405b-8fef-2498455f265d	AIRTEL	20 Minutes Airtel Talk more	?	30 Days	198.00	192.06	f	2026-06-09 15:26:02.724295	2026-06-29 15:50:44.585847	493	\N
8f23e06d-0e8f-49a2-a19c-d6625fc67a28	AIRTEL	50 Minutes Airtel Talk more	?	30 Days	480.00	465.60	f	2026-06-09 15:26:02.728356	2026-06-29 15:50:44.585847	495	\N
dc1b94ff-88b6-4c9c-b572-dc79c5318655	MTN	2.5GB 1DAY	2.5GB	1 Day	550.00	533.50	f	2026-06-09 15:26:02.92361	2026-06-24 14:37:38.737	848	\N
db0e9045-72b2-4a88-a3c1-b5c88e4d08da	MTN	500MB 30DAYS	500MB	30 Days	320.00	310.40	f	2026-06-09 15:26:03.003926	2026-06-24 14:37:38.737	473	\N
938db0dc-21e7-4ea6-8ebe-82e0720bad9d	MTN	3.2 GB 3DAYS	3.2GB	3 Days	1000.00	970.00	t	2026-06-09 15:26:02.962271	2026-06-29 09:53:41.062039	399	970.00
11ee3006-7667-4a1b-aed7-8d4c208d2d1b	MTN	2.0 GB 2DAYS	2.0GB	2 Days	760.00	737.20	t	2026-06-09 15:26:02.965066	2026-06-29 09:53:41.062039	401	737.00
85e3302f-bd6a-42ff-ab99-bc6da6c49232	MTN	1.5 GB 2DAYS	1.5GB	2 Days	600.00	582.00	t	2026-06-09 15:26:02.967774	2026-06-29 09:53:41.062039	400	582.00
b7f0012a-24bc-4f37-8252-6fa399f53f32	AIRTEL	3.5 GB 7DAYS	3.5GB	7 Days	1500.00	1455.00	t	2026-06-09 15:26:02.971634	2026-06-29 09:53:41.062039	407	1455.00
617c9a38-e411-443e-b4e1-f47e9fb14db4	GLO	750MB 1DAY	750MB	1 Day	210.00	203.70	t	2026-06-09 15:26:02.940728	2026-06-29 09:53:41.062039	812	204.00
010260bc-28f4-4490-afeb-504153a44073	GLO	10.GB 30DAYS	10GB	30 Days	4300.00	4171.00	f	2026-06-09 15:26:02.734878	2026-06-29 15:50:44.585847	771	\N
0181f224-5854-4f7e-ab32-82e75e254b87	AIRTEL	4.GB 2DAYS	4GB	2 Days	1050.00	1018.50	f	2026-06-09 15:26:02.738679	2026-06-29 15:50:44.585847	779	\N
54bfebee-d975-4ed4-8eb1-7eab670275d7	MTN	1.GB 7DAYS	1GB	7 Days	490.00	475.30	f	2026-06-09 15:26:02.749755	2026-06-29 15:50:44.585847	802	\N
4e2f1976-f379-4179-940d-bb35a9fa6909	AIRTEL	100 Minutes Airtel Talk more	?	30 Days	980.00	950.60	f	2026-06-09 15:26:02.756769	2026-06-29 15:50:44.585847	496	\N
10482f97-1db1-4602-8ba0-8f36cd9d2458	GLO	3.GB 30DAYS	3GB	30 Days	1220.00	1183.40	f	2026-06-09 15:26:02.762345	2026-06-29 15:50:44.585847	751	\N
7aeb071c-0c75-4adb-8935-4ee3bb5131ce	GLO	3.GB 7DAYS	3GB	7 Days	1000.00	970.00	f	2026-06-09 15:26:02.765455	2026-06-29 15:50:44.585847	776	\N
f882ec06-ca88-4159-a509-34c31c8219e6	MTN	20.GB 30DAYS	20GB	30 Days	8000.00	7760.00	f	2026-06-09 15:26:02.778009	2026-06-29 15:50:44.585847	799	\N
09da07b1-753e-409f-813d-1a5cdd5da62d	AIRTEL	2.GB 2DAYS	2GB	2 Days	700.00	679.00	f	2026-06-09 15:26:02.781312	2026-06-29 15:50:44.585847	673	\N
cad8897c-2432-4cb5-8ea2-a8f963523a86	AIRTEL	150 Minutes Airtel Talk more	?	30 Days	1450.00	1406.50	f	2026-06-09 15:26:02.786831	2026-06-29 15:50:44.585847	497	\N
d7232fcc-ac90-4b06-aced-7152ccff7805	MTN	2.GB 7DAYS	2GB	7 Days	900.00	873.00	f	2026-06-09 15:26:02.790104	2026-06-29 15:50:44.585847	528	\N
e1539788-0077-4ede-b95b-5aaccace6795	MTN	2.GB 30DAYS	2GB	30 Days	900.00	873.00	f	2026-06-09 15:26:02.795774	2026-06-29 15:50:44.585847	426	\N
3ae2b518-97ea-4d0e-999f-068cb054c173	AIRTEL	3.GB 2DAYS	3GB	2 Days	780.00	756.60	f	2026-06-09 15:26:02.799607	2026-06-29 15:50:44.585847	782	\N
64b28fb6-be3b-4774-91fe-bc353d9d9d34	GLO	5.GB 30DAYS	5GB	30 Days	2100.00	2037.00	f	2026-06-09 15:26:02.803051	2026-06-29 15:50:44.585847	759	\N
d3e00ef0-1c88-441f-bb50-864e463f8147	MTN	1.GB 7DAYS	1GB	7 Days	420.00	407.40	f	2026-06-09 15:26:02.815863	2026-06-29 15:50:44.585847	527	\N
410bdbb2-0c4b-49e0-bd0b-6bfb8e409aac	GLO	5.GB 7DAYS	5GB	7 Days	1550.00	1503.50	f	2026-06-09 15:26:02.81914	2026-06-29 15:50:44.585847	774	\N
da007c11-1753-4e70-9852-ee9da0ef39da	MTN	5.GB 30DAYS	5GB	30 Days	1900.00	1843.00	f	2026-06-09 15:26:02.862485	2026-06-29 15:50:44.585847	708	\N
c6d0b4dd-fdda-408e-a7c1-baf62d972f17	MTN	25.GB 30DAYS	25GB	30 Days	9000.00	8730.00	f	2026-06-09 15:26:02.835869	2026-06-29 15:50:44.585847	801	\N
300e866d-ebf1-4bbc-9478-e16314d7857d	MTN	10.GB 30DAYS	10GB	30 Days	4500.00	4365.00	f	2026-06-09 15:26:02.842553	2026-06-29 15:50:44.585847	712	\N
802b2303-7742-4169-aa84-fbf64b42e018	MTN	6.GB 7DAYS	6GB	7 Days	2500.00	2425.00	f	2026-06-09 15:26:02.865333	2026-06-29 15:50:44.585847	719	\N
92b5760b-2b90-4193-b3aa-fa5e6855eb5e	MTN	2.GB 30DAYS	2GB	30 Days	1300.00	1261.00	f	2026-06-09 15:26:02.832052	2026-06-29 15:50:44.585847	534	\N
b71d353d-6f33-4fd0-888e-b540e6eec5f4	AIRTEL	10.GB 30DAYS	10GB	30 Days	3150.00	3055.50	f	2026-06-09 15:26:02.875776	2026-06-29 15:50:44.585847	739	\N
bed4e3f7-ba52-4eff-8f78-de7ab06bddb1	MTN	36.GB 30DAYS	36GB	30 Days	12000.00	11640.00	f	2026-06-09 15:26:02.665393	2026-06-29 15:50:44.585847	566	\N
e7f6a8ae-1c1b-4f08-b1e2-9527517669cb	AIRTEL	30 Minutes Airtel Talk more	?	30 Days	297.00	288.09	f	2026-06-09 15:26:02.670073	2026-06-29 15:50:44.585847	494	\N
1372d0f1-c615-4019-8827-0fb051c54e8d	GLO	2.GB 30DAYS	2GB	30 Days	820.00	795.40	f	2026-06-09 15:26:02.887831	2026-06-29 15:50:44.585847	772	\N
6d5ec470-d094-4e82-9c74-0883bbd7e199	MTN	10.GB 30DAYS	10GB	30 Days	4600.00	4462.00	f	2026-06-09 15:26:02.896152	2026-06-29 15:50:44.585847	466	\N
6c60f688-e4a7-4d3b-a436-5d3728e6960e	AIRTEL	3.GB 2DAYS	3GB	2 Days	780.00	756.60	f	2026-06-09 15:26:02.899483	2026-06-29 15:50:44.585847	741	\N
7552ee8e-b0a1-4387-bd8b-d48279f1b399	MTN	5.GB 14DAYS	5GB	14 Days	1200.00	1164.00	f	2026-06-09 15:26:02.917067	2026-06-29 15:50:44.585847	849	\N
727d31a5-4fa1-4263-a4d1-e877ad4dd5ac	MTN	5.GB 7DAYS	5GB	7 Days	1450.00	1406.50	f	2026-06-09 15:26:02.907917	2026-06-29 15:50:44.585847	839	\N
3cea939d-2c73-41c9-8dcf-d8f7426a39d9	MTN	10.GB 30DAYS	10GB	30 Days	4650.00	4510.50	f	2026-06-09 15:26:02.93512	2026-06-29 15:50:44.585847	623	\N
fd9910d2-cbda-48b2-9ed9-6ccee65c9b9c	MTN	2.GB 30DAYS	2GB	30 Days	1000.00	970.00	f	2026-06-09 15:26:02.937951	2026-06-29 15:50:44.585847	437	\N
b3b3f7b4-f6c7-45a2-b280-25642ffab3e1	MTN	2.GB 7DAYS	2GB	7 Days	840.00	814.80	f	2026-06-09 15:26:02.958985	2026-06-29 15:50:44.585847	468	\N
76b47d17-1d85-4922-86d6-96477d5d9889	MTN	3.GB 30DAYS	3GB	30 Days	1250.00	1212.50	f	2026-06-09 15:26:02.977338	2026-06-29 15:50:44.585847	420	\N
44eab826-f201-45e3-a8c2-0616cf501911	9MOBILE	10.GB 30DAYS	10GB	30 Days	4900.00	4753.00	f	2026-06-09 15:26:02.904923	2026-06-29 15:50:44.585847	832	\N
a80d8dcc-2dd7-44d5-8dfa-2f5e95776495	MTN	5.GB 14DAYS	5GB	14 Days	1100.00	1067.00	f	2026-06-09 15:26:02.839049	2026-06-29 15:50:44.572795	718	1067.00
553fb91a-cf4d-442f-b009-93607c8311e0	AIRTEL	10.GB 7DAYS	10GB	7 Days	3100.00	3007.00	f	2026-06-09 15:26:02.680273	2026-06-29 15:50:44.585847	783	\N
8b4c39ed-0822-4208-8f81-1ef6540cb72d	AIRTEL	1GB 3DAYS	1GB	3 Days	315.00	305.55	f	2026-06-09 15:26:02.871584	2026-06-29 15:50:44.68628	742	306.00
70b900f5-6e68-43b9-ae8f-4219bd41ef7b	GLO	500MB 30DAYS	500MB	30 Days	220.00	213.40	t	2026-06-09 15:26:02.67684	2026-06-29 09:53:41.062039	775	213.00
55539f7f-15b6-4c87-baad-585d96d77b1d	AIRTEL	1.GB 3DAYS	1GB	3 Days	315.00	305.55	t	2026-06-09 15:26:02.85009	2026-06-29 09:53:41.062039	785	306.00
10616bcc-6954-4c50-ad8d-d7eb2ed9c324	AIRTEL	2.GB 2DAYS	2GB	2 Days	650.00	630.50	t	2026-06-09 15:26:02.828097	2026-06-29 09:53:41.062039	784	631.00
7bc12f21-5e8a-48a7-a936-6fc68085acb6	GLO	1.GB 30DAYS	1GB	30 Days	380.00	368.60	t	2026-06-09 15:26:02.853044	2026-06-29 09:53:41.062039	777	369.00
879ea246-6d27-42bb-ad0d-d159c5674bc4	AIRTEL	1.5 GB 7DAYS	1.5GB	7 Days	1030.00	999.10	t	2026-06-09 15:26:02.694386	2026-06-29 09:53:41.062039	820	999.00
c85f916a-507e-470f-84e0-370aba913dd7	AIRTEL	4.0 GB 30 DAYS	4.0GB	30 Days	2650.00	2570.50	t	2026-06-09 15:26:02.69864	2026-06-29 09:53:41.062039	824	2571.00
ad627f96-0d4d-4d49-abfe-5e150d8bc34b	MTN	500MB 7DAYS	500MB	7 Days	315.00	305.55	t	2026-06-09 15:26:02.702174	2026-06-29 09:53:41.062039	789	306.00
475a3e0b-faf9-485f-8f50-78eb819f477d	MTN	2.5GB 2DAYS	2.5GB	2 Days	960.00	931.20	t	2026-06-09 15:26:02.714526	2026-06-29 09:53:41.062039	796	931.00
feedec01-a171-4ba7-abaf-9f9e58c209d2	MTN	1.GB 7DAYS	1GB	7 Days	400.00	388.00	t	2026-06-09 15:26:02.846162	2026-06-29 09:53:41.062039	715	388.00
58b6afaf-12ae-4640-b2be-ecc47f8d73db	9MOBILE	5.GB 30DAYS	5GB	30 Days	2300.00	2231.00	t	2026-06-09 15:26:02.80609	2026-06-29 09:53:41.062039	458	2231.00
0e3d340b-f6c7-4881-bd02-91638870e6f4	GLO	200MB 30DAYS	200MB	30 Days	100.00	97.00	t	2026-06-09 15:26:02.731274	2026-06-29 09:53:41.062039	768	97.00
8c2bdf14-3b1f-4b29-95fd-4189403c7cf3	MTN	20GB 7DAYS	20GB	7 Days	5200.00	5044.00	t	2026-06-09 15:26:02.742581	2026-06-29 09:53:41.062039	787	5044.00
a98a69e4-5fdf-45e3-9650-17fda77214dc	MTN	6.0 GB 7DAYS	6.0GB	7 Days	2600.00	2522.00	t	2026-06-09 15:26:02.746212	2026-06-29 09:53:41.062039	798	2522.00
dce88271-de72-4e13-8b3a-62cb5fce46ba	AIRTEL	8GB 30DAYS	8GB	30 Days	3350.00	3249.50	t	2026-06-09 15:26:02.759746	2026-06-29 09:53:41.062039	819	3250.00
6c9dd462-e7bc-4c81-b747-5c8fb8962df2	AIRTEL	3.0 GB 30 DAYS	3.0GB	30 Days	2050.00	1988.50	t	2026-06-09 15:26:02.76852	2026-06-29 09:53:41.062039	825	1989.00
a55af2cf-86e8-4b11-a0ab-bfb6d33a7029	MTN	1.5GB 7DAYS	1.5GB	7 Days	1020.00	989.40	t	2026-06-09 15:26:02.771255	2026-06-29 09:53:41.062039	792	989.00
76f9eafb-160b-4351-91d2-3302037c526a	AIRTEL	1GB	1GB	30 Days	520.00	504.40	t	2026-06-09 15:26:02.773848	2026-06-29 09:53:41.062039	822	504.00
3488e4d5-e6e6-499c-a227-04d977f38e12	AIRTEL	4GB 2DAYS	4GB	2 Days	1100.00	1067.00	t	2026-06-09 15:26:02.784172	2026-06-29 09:53:41.062039	675	1067.00
f1b24170-a1bc-45ce-8bac-299e0ac0b105	AIRTEL	10GB 30DAYS	10GB	30 Days	3900.00	3783.00	t	2026-06-09 15:26:02.809075	2026-06-29 09:53:41.062039	464	3783.00
4a0f84dc-5f43-4d29-876e-474c6b928f28	MTN	3.5GB 7DAYS	3.5GB	7 Days	1600.00	1552.00	t	2026-06-09 15:26:02.812091	2026-06-29 09:53:41.062039	791	1552.00
4e963bf9-a2ab-4673-822a-9c60012e9f79	AIRTEL	1.5GB 1DAY	1.5GB	1 Day	420.00	407.40	t	2026-06-09 15:26:02.855978	2026-06-29 09:53:41.062039	740	407.00
898e0305-ebe2-4c13-9be3-6608a85baab6	AIRTEL	2GB 30DAYS	2GB	30 Days	1530.00	1484.10	t	2026-06-09 15:26:02.858861	2026-06-29 09:53:41.062039	828	1484.00
05c15b9a-579b-4ff3-aa1d-0b25e47e38b3	AIRTEL	500MB 1DAY	500MB	1 Day	370.00	358.90	t	2026-06-09 15:26:02.673653	2026-06-29 09:53:41.062039	823	359.00
fece4467-74ea-4324-9274-a7a252f18a40	GLO	10.GB 7DAYS	10GB	7 Days	2000.00	1940.00	f	2026-06-09 15:26:02.953381	2026-06-29 15:50:44.585847	808	\N
29c80040-47d4-4c2e-8c35-7f21b713357b	MTN	5.GB 30DAYS	5GB	30 Days	2000.00	1940.00	f	2026-06-09 15:26:02.980759	2026-06-29 15:50:44.585847	419	\N
a78bd046-1949-4dfa-ae4a-2526701b9131	MTN	1.GB 30DAYS	1GB	30 Days	500.00	485.00	f	2026-06-09 15:26:02.984282	2026-06-29 15:50:44.585847	430	\N
d166bb40-0e5a-4983-b876-6b23bfa66099	MTN	1.GB 7DAYS	1GB	7 Days	460.00	446.20	f	2026-06-09 15:26:02.994471	2026-06-29 15:50:44.585847	470	\N
a6d9c7dc-a7fd-4b56-86ed-148276ac520a	MTN	3.GB 30DAYS	3GB	30 Days	1250.00	1212.50	f	2026-06-09 15:26:02.997994	2026-06-29 15:50:44.585847	469	\N
971ca91f-7abc-4ec7-99e8-ac2e85180a0c	MTN	1.GB 30DAYS POS	1GB	30 Days	580.00	562.60	f	2026-06-09 15:26:02.990102	2026-06-29 15:50:44.585847	484	\N
7e81d844-ecc3-4e3f-8de3-ecbea95e6810	MTN	1.GB 30DAYS	1GB	30 Days	410.00	397.70	f	2026-06-09 15:26:02.878715	2026-06-29 15:50:44.585847	489	\N
2fd3462a-ed01-422e-b1dd-c131ea1bbdee	MTN	3.GB 7DAYS	3GB	7 Days	1250.00	1212.50	f	2026-06-09 15:26:02.881482	2026-06-29 15:50:44.585847	717	\N
253e4876-e4a1-4715-9eea-9c778b5727c9	AIRTEL	5.GB 7DAYS	5GB	7 Days	1600.00	1552.00	t	2026-06-09 15:26:02.884172	2026-06-29 09:53:41.062039	830	1552.00
9315efb3-c7c5-45bf-a98a-72cd0f4c5068	GLO	1.GB 21DAYS	1GB	21 Days	420.00	407.40	t	2026-06-09 15:26:02.919854	2026-06-29 09:53:41.062039	840	407.00
36635365-e1bf-4665-ae35-fb9f7cc08f47	GLO	1.GB 3DAYS	1GB	3 Days	320.00	310.40	t	2026-06-09 15:26:02.89058	2026-06-29 09:53:41.062039	804	310.00
a7e229a0-4b2e-4613-9c7d-8a9a8571a851	GLO	1.GB 7DAYS	1GB	7 Days	330.00	320.10	t	2026-06-09 15:26:02.947405	2026-06-29 09:53:41.062039	813	320.00
fa437fdd-ebda-449c-a407-d29843b34ae9	GLO	1.5GB 1DAY	1.5GB	1 Day	310.00	300.70	t	2026-06-09 15:26:02.987405	2026-06-29 09:53:41.062039	814	301.00
b40bcb42-7b4f-4545-83b1-3a7b94c28656	MTN	5.GB 3DAYS	5GB	3 Days	1900.00	1843.00	t	2026-06-09 15:26:02.950406	2026-06-29 09:53:41.062039	438	1843.00
18d89f05-8316-4931-b100-91412d254e22	AIRTEL	500MB 7DAYS	500MB	7 Days	485.00	470.45	t	2026-06-09 15:26:03.001049	2026-06-29 09:53:41.062039	815	470.00
c28f2eae-d6c4-45dc-ac97-94359e3eb57a	9MOBILE	1.0 GB 30 DAYS	1.0GB	30 Days	520.00	504.40	t	2026-06-09 15:26:02.943986	2026-06-29 09:53:41.062039	834	504.00
cb419207-c702-40f0-9aa1-686cbac109bd	9MOBILE	500MB 30 DAYS	500MB	30 Days	250.00	242.50	t	2026-06-09 15:26:02.955982	2026-06-29 09:53:41.062039	835	243.00
2a2c9441-ff6c-4ae7-ab0d-1164690d83a2	9MOBILE	3.0 GB 30 DAYS	3.0GB	30 Days	1500.00	1455.00	t	2026-06-09 15:26:02.902187	2026-06-29 09:53:41.062039	457	1455.00
328e166c-7c86-4e03-a433-070f06711f60	9MOBILE	2.0 GB 30 DAYS	2.0GB	30 Days	1050.00	1018.50	t	2026-06-09 15:26:02.974401	2026-06-29 09:53:41.062039	459	1019.00
299c6837-d975-480a-b4d6-79faca9fa62d	GLO	2.5GB 2DAYS	2.5GB	2 Days	520.00	504.40	t	2026-06-09 15:26:02.89324	2026-06-29 09:53:41.062039	810	504.00
a7acbcae-18a4-43b8-afe8-1008d28afac1	AIRTEL	300MB 2DAYS	300MB	2 Days	130.00	126.10	t	2026-06-09 15:26:02.911394	2026-06-29 09:53:41.062039	841	126.00
3275624e-102a-4864-80a4-b157772f91a0	AIRTEL	200MB 2DAYS	200MB	2 Days	120.00	116.40	t	2026-06-09 15:26:02.91434	2026-06-29 09:53:41.062039	842	116.00
91275cc8-9fa7-4dc8-bd1c-9b8cc9aa6996	AIRTEL	600MB 2DAYS	600MB	2 Days	220.00	213.40	t	2026-06-09 15:26:02.929056	2026-06-29 09:53:41.062039	836	213.00
6ffba3a3-649d-4a62-95de-6834c48e80ea	MTN	1GB SMART	1GB	30 Days	235.00	227.95	f	2026-06-09 15:26:02.926376	2026-06-24 14:37:38.721	846	\N
41458d20-d009-41c7-890c-47ef7cbee60e	AIRTEL	1.0 GB 7DAYS	1.0GB	7 Days	780.00	756.60	t	2026-06-09 15:26:02.931802	2026-06-29 09:53:41.062039	831	757.00
\.


--
-- Data for Name: exam_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_types (id, name, code, price, cost_price, description, created_at) FROM stdin;
6ac537b4-3689-4cc7-b1ee-cf3a9047ae63	NECO (National Examinations Council)	NECO	2099.00	1950.00	NECO result checker PIN	2026-06-05 13:14:57.871237
a70acac8-ccc0-445f-bb1a-2c5f8f040306	WAEC (West African Examinations Council)	WAEC	3700.00	3500.00	WAEC result checker PIN	2026-06-10 06:22:00.861936
a49c2a8f-9c33-484a-a762-bf2f69355aa5	JAMB (Joint Admissions and Matriculation Board)	JAMB	1000.00	850.00	JAMB result checker PIN	2026-07-10 16:26:27.317639
c620d282-5f8e-4a54-8288-2927eca90fbd	NABTEB (National Business and Technical Examinations Board)	NABTEB	1000.00	850.00	NABTEB result checker PIN	2026-07-10 16:26:27.321225
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, type, is_read, created_at) FROM stdin;
12e20a9e-49d4-4571-bc95-f4f6087e731a	fe5e0722-7590-4011-850f-a94d2621c801	Payment Expired	Your wallet funding of ₦10,000 was not completed and has been cancelled. Please try again.	wallet	f	2026-06-03 15:17:24.297857
4eb59e94-2846-422c-993e-262e537b4f5d	64014564-6af7-4eb4-8ea2-6d1190658710	Payment Expired	Your wallet funding of ₦500 was not completed and has been cancelled. Please try again.	wallet	f	2026-06-03 15:17:24.297857
304e4aba-bd83-4db9-9bf8-67d5ea1da6e6	64014564-6af7-4eb4-8ea2-6d1190658710	Payment Expired	Your wallet funding of ₦500 was not completed and has been cancelled. Please try again.	wallet	f	2026-06-03 15:17:24.297857
02601698-e9ec-4aa6-9b16-0d483a761593	fe5e0722-7590-4011-850f-a94d2621c801	Wallet Credited	Your wallet has been credited with ₦250 by admin. Note: Refund: test data (₦150) + airtime (₦100) purchased but not delivered — system now fixed	wallet	f	2026-06-03 15:35:06.228805
fe7efca8-23c5-4ca6-986f-5e724bae93c8	fe5e0722-7590-4011-850f-a94d2621c801	Data Purchase Failed	Your ₦110 data purchase failed. Your wallet has been refunded. Please try again or contact support.	data	f	2026-06-05 13:24:13.394573
3315c799-06ec-4048-aad1-095e68ac2c4a	fe5e0722-7590-4011-850f-a94d2621c801	Data Purchase Failed	Your ₦360 data purchase failed. Your wallet has been refunded.	data	f	2026-06-05 15:09:30.433162
1204ac14-7503-46f3-aa9b-c53e96942c89	fe5e0722-7590-4011-850f-a94d2621c801	Airtime Purchase Failed	Your ₦50 airtime purchase failed. Your wallet has been refunded.	airtime	f	2026-06-05 15:09:30.790204
09e13f9c-a60f-464e-aaee-01591108d134	fe5e0722-7590-4011-850f-a94d2621c801	Data Purchase Failed	Your ₦360 data purchase failed. Your wallet has been refunded.	data	f	2026-06-05 15:20:12.068126
99449ef9-7f20-458d-b115-abd835b08dc0	fe5e0722-7590-4011-850f-a94d2621c801	Airtime Purchase Failed	Your ₦50 airtime purchase failed. Your wallet has been refunded.	airtime	f	2026-06-05 15:20:12.384162
ae1d286c-d2b7-4a5d-82e3-cb0edb676e11	fe5e0722-7590-4011-850f-a94d2621c801	Data Purchase Failed	Your ₦360 data purchase failed. Your wallet has been refunded.	data	f	2026-06-05 15:21:12.538239
f7528988-55f6-470e-b920-467e09e36976	fe5e0722-7590-4011-850f-a94d2621c801	Data Purchase Failed	Your ₦360 data purchase failed. Your wallet has been refunded.	data	f	2026-06-05 15:22:20.637701
21c8b367-eba8-4559-90d8-15b12b48ebf9	fe5e0722-7590-4011-850f-a94d2621c801	Airtime Purchase Failed	Your ₦50 airtime purchase failed. Your wallet has been refunded.	airtime	f	2026-06-05 15:22:21.171947
6fddb5ea-abc7-4e98-80fe-e79df9fec1ed	fe5e0722-7590-4011-850f-a94d2621c801	Airtime Purchase Failed	Your ₦50 airtime purchase failed. Your wallet has been refunded.	airtime	f	2026-06-05 15:37:45.97192
ba943adb-5f66-4dc5-8318-d4489979c9e7	fe5e0722-7590-4011-850f-a94d2621c801	Airtime Purchase Failed	Your ₦50 airtime purchase failed. Your wallet has been refunded.	airtime	f	2026-06-05 15:41:34.635633
7190f800-5f2a-4014-9fcd-861ff2ab0ffd	fe5e0722-7590-4011-850f-a94d2621c801	Data Purchase Failed	Your ₦360 data purchase failed. Your wallet has been refunded.	data	f	2026-06-05 15:41:34.882907
86ec6843-9ee3-49d5-8e74-8507c7fdb286	fe5e0722-7590-4011-850f-a94d2621c801	Airtime Purchase Failed	Your ₦50 airtime purchase failed. Your wallet has been refunded.	airtime	f	2026-06-05 15:59:57.402256
9f4564c9-908e-40aa-b455-b57a1794b38f	fe5e0722-7590-4011-850f-a94d2621c801	Airtime Purchase Failed	Your ₦50 airtime purchase failed. Your wallet has been refunded.	airtime	f	2026-06-05 16:03:50.589996
1b25bc84-9bea-4cad-bb67-5437302c5554	fe5e0722-7590-4011-850f-a94d2621c801	Payment Not Completed	Your wallet funding of ₦1,000 was not completed and has been marked as failed. If money was deducted from your account, go to Transactions, find the failed payment and tap "Report Issue" to file a complaint — we will resolve it within 24 hours.	wallet	f	2026-06-05 16:46:11.990556
b3aee900-3b7f-44db-8259-2dcbeff88ba7	fe5e0722-7590-4011-850f-a94d2621c801	Payment Not Completed	Your wallet funding of ₦1,000 was not completed and has been marked as failed. If money was deducted from your account, go to Transactions, find the failed payment and tap "Report Issue" to file a complaint — we will resolve it within 24 hours.	wallet	f	2026-06-05 16:46:11.990556
c62010c3-a2b0-4bd7-9da6-ae16f4b3ab6c	fe5e0722-7590-4011-850f-a94d2621c801	Wallet Credited	Your wallet has been credited with ₦1,000 by admin. Note: Manual credit: Paystack bank transfer SANTECH-1780676797539-DFTD3D confirmed success but callback missed	wallet	f	2026-06-05 16:49:16.257354
2c212f35-e9b9-422e-a021-0e727aa0b2e0	fe5e0722-7590-4011-850f-a94d2621c801	Wallet Credited	Your wallet has been credited with ₦1,000 by admin. Note: Manual credit: Paystack bank transfer SANTECH-1780657724056-ERCK3L confirmed success but marked failed	wallet	f	2026-06-05 16:49:16.279105
5652d634-9f76-478d-9fea-455c5d3f1fee	64014564-6af7-4eb4-8ea2-6d1190658710	Test	Hello world	general	f	2026-06-06 10:34:36.978014
daabef4a-bd67-410f-a68d-9431a5f16178	fe5e0722-7590-4011-850f-a94d2621c801	Test	Hello world	general	f	2026-06-06 10:34:36.985147
54fc4b6c-f78e-43ab-b784-cc7f83dd1c2f	64014564-6af7-4eb4-8ea2-6d1190658710	Hello	Test message	general	f	2026-06-06 10:36:14.123837
18a3b0a5-27a3-4452-889d-5f40fd1cac03	fe5e0722-7590-4011-850f-a94d2621c801	Hello	Test message	general	f	2026-06-06 10:36:14.131306
e4ab7a5d-5804-4fb7-a519-4aaef84050d3	64014564-6af7-4eb4-8ea2-6d1190658710	Test	Hello everyone	general	f	2026-06-06 10:38:17.766172
7dfed77c-d3f0-4e3e-ab21-e75c6d26010b	fe5e0722-7590-4011-850f-a94d2621c801	Test	Hello everyone	general	f	2026-06-06 10:38:17.775269
ce004356-bc17-4fd8-b081-9f0ef4eb2e5d	64014564-6af7-4eb4-8ea2-6d1190658710	Welcome	SanTech Data is now live!	general	f	2026-06-06 10:45:37.060113
b35986d3-a338-4535-b030-02bc0e964fd0	fe5e0722-7590-4011-850f-a94d2621c801	Welcome	SanTech Data is now live!	general	f	2026-06-06 10:45:37.067241
c2fa2850-a39f-4521-bb21-38194124069a	64014564-6af7-4eb4-8ea2-6d1190658710	Airtime to Cash Request Received	Your request to convert ₦500 MTN airtime has been received. You'll be credited ₦355 once approved. Please send the airtime to 08063136201.	info	f	2026-06-06 11:41:14.505562
adcc81b8-c1ce-4e0c-b594-08b5e96fdde6	64014564-6af7-4eb4-8ea2-6d1190658710	Airtime to Cash Request Received	Your request to convert ₦500 MTN airtime has been received. You'll be credited ₦355 once approved. Please send the airtime to 08063136201.	info	f	2026-06-06 11:41:49.996367
0285ccfe-76c0-4cef-b40b-54cb918600dc	64014564-6af7-4eb4-8ea2-6d1190658710	Airtime to Cash Approved ✅	Your ₦500 MTN airtime has been approved. ₦355 has been credited to your wallet.	success	f	2026-06-06 11:41:50.235574
1921e2de-e717-49dd-817b-f9d9f0f679f5	64014564-6af7-4eb4-8ea2-6d1190658710	Airtime to Cash Request Received	Your request to convert ₦1,000 GLO airtime has been received. You'll be credited ₦630 once approved. Please send the airtime to 08063136201.	info	f	2026-06-06 11:41:50.370818
cd095219-a2e7-4510-99c8-dc33a77f732b	64014564-6af7-4eb4-8ea2-6d1190658710	Airtime to Cash Rejected	Your airtime-to-cash request for ₦1,000 GLO was rejected. Reason: Airtime not received after 30 minutes Contact support if you have questions.	error	f	2026-06-06 11:41:50.597138
e8a21560-a748-4a93-93c4-6c552dc2c0e2	64014564-6af7-4eb4-8ea2-6d1190658710	Airtime Purchase Failed	₦100 MTN airtime failed. Your wallet has been refunded.	airtime	f	2026-06-10 06:47:47.631474
61bd9b5c-7fb7-4b9f-98cc-6b86ef842d94	5171a73b-3507-48a5-b896-6955dc3764ae	Airtime Purchase Successful	₦100 MTN airtime has been sent to 08063136201.	airtime	f	2026-06-10 08:00:19.59724
45c97638-8b2a-4f4a-b454-3bf06a889a3e	64014564-6af7-4eb4-8ea2-6d1190658710	Payment Not Completed	Your wallet funding of ₦1,000 was not completed and has been marked as failed. If money was deducted from your account, go to Transactions, find the failed payment and tap "Report Issue" to file a complaint — we will resolve it within 24 hours.	wallet	f	2026-06-10 14:03:22.79728
54a6d62e-5130-48a6-9c0b-e82def5c1dc1	64014564-6af7-4eb4-8ea2-6d1190658710	Payment Not Completed	Your wallet funding of ₦500 was not completed and has been marked as failed. If money was deducted from your account, go to Transactions, find the failed payment and tap "Report Issue" to file a complaint — we will resolve it within 24 hours.	wallet	f	2026-06-10 15:47:00.890168
f9ff3349-72a7-43ee-830a-c81ced100f0b	64014564-6af7-4eb4-8ea2-6d1190658710	Payment Not Completed	Your wallet funding of ₦1,000 was not completed and has been marked as failed. If money was deducted from your account, go to Transactions, find the failed payment and tap "Report Issue" to file a complaint — we will resolve it within 24 hours.	wallet	f	2026-06-10 15:52:00.564138
3d62100c-d905-4f47-a2c3-cb86a194d21a	64014564-6af7-4eb4-8ea2-6d1190658710	Airtime Purchase Successful	₦100 MTN airtime has been sent to 08063136201.	airtime	f	2026-06-29 15:32:23.467794
d4df96c0-5b04-4f03-999f-f995d2ae0700	64014564-6af7-4eb4-8ea2-6d1190658710	Data Purchase Successful	MTN 1GB data has been sent to 08063136201.	data	f	2026-06-29 15:54:21.256702
787de8c8-7d9c-4fff-8111-04f686229730	e09e8cee-5f70-4e8c-a279-a60090ab3e92	Purchase Processing	Your ₦1000 electricity purchase is taking longer than usual to confirm. We're checking with the provider and will notify you shortly — please don't retry yet.	electricity	f	2026-07-10 21:45:28.502636
4398d0d0-e2ac-4b66-ab2a-7161b3ca7bdb	64014564-6af7-4eb4-8ea2-6d1190658710	Purchase Awaiting Review	A ₦1,000 electricity purchase (ref: ELEC-1783719928483) has been pending for over 10 minutes — the provider call timed out and the outcome is unknown. Check the provider's portal, then resolve it from Admin → Transactions.	electricity	f	2026-07-10 21:55:52.971852
\.


--
-- Data for Name: otps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.otps (id, email, otp, type, used, expires_at, created_at) FROM stdin;
2f7a733a-1aaf-4510-a957-6fa3d49a7d99	admin@santechdata.ng	637993	email_verify	f	2026-06-01 16:29:38.64	2026-06-01 16:19:38.641139
a1cd87a2-069f-4982-962a-cb45b9cd8ea6	sanimohammedauwal8@gmail.com	694099	email_verify	f	2026-06-01 17:16:38.887	2026-06-01 17:06:38.887645
9836a483-9a23-44c4-a657-b49cb0ab49c3	testcustomer@test.com	832560	email_verify	f	2026-06-06 14:42:55.047	2026-06-06 14:32:55.0476
7a2d1ae4-9d46-45b2-b315-e766f54e452f	testcustomer@santech.test	152305	email_verify	f	2026-06-10 07:33:46.337	2026-06-10 07:23:46.338143
ecfd3ad1-d9ea-480a-821d-b6d5d90b8aad	testcustomer99@santechdata.ng	594103	email_verify	f	2026-06-13 07:23:29.793	2026-06-13 07:13:29.794174
7701bfde-3dbe-4640-97c8-e3bdbdc3dcc2	testuser@santechdata.ng	387179	email_verify	f	2026-06-19 13:23:37.824	2026-06-19 13:13:37.82648
f2e80677-0720-4bef-94bc-5ab3195febe5	sanimohammedauwal8@gmail.com	505449	password_reset	f	2026-06-23 08:36:50.148	2026-06-23 08:06:50.150271
a5d54c96-5b1c-4cf3-b0cd-2494675f113f	sanimohammedauwal8@gmail.com	763469	password_reset	f	2026-06-23 08:37:59.229	2026-06-23 08:07:59.229584
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (key, value, updated_at) FROM stdin;
kybdata_api_token	7a03cd40dc753232ae03f6d8d7a47f0146df684b9ec5a8e45a33bc2d19449fa4	2026-06-09 14:53:30.689635
clubkonnect_api_key	01N7328JLR8YSAMH8CG4H88BDSGAW2Q4402G61ED0X18I359A57I4QRO690D13GL	2026-06-25 11:35:14.780051
clubkonnect_user_id	CK101280559	2026-06-25 11:35:14.784489
exam_provider_WAEC	kyb	2026-06-25 13:04:01.113769
exam_provider_JAMB	kyb	2026-06-25 13:04:10.328521
exam_provider_NABTEB	kyb	2026-06-25 13:04:14.98341
supportEmail	santechdata@gmail.com	2026-06-29 09:35:08.613147
supportPhone	09026329296	2026-06-29 09:35:08.654
whatsapp	09026329296	2026-06-29 09:35:08.668284
announcement	All services are live and running.	2026-06-29 09:35:08.672
announcementActive	true	2026-06-29 09:35:08.677
paystackActive	true	2026-06-29 09:35:08.682562
monnifyActive	true	2026-06-29 09:35:08.686743
airtimeToCashActive	true	2026-06-29 09:35:08.69
bankTransferActive	false	2026-06-29 09:35:08.694683
bankAccountNumber		2026-06-29 09:35:08.698466
bankAccountName		2026-06-29 09:35:08.702739
bankName		2026-06-29 09:35:08.707746
referralBonus	200	2026-06-29 09:35:08.713465
minFunding	100	2026-06-29 09:35:08.715942
resellerCommissionRate	3	2026-06-29 09:35:08.718293
resellerPromoActive	true	2026-06-29 09:35:08.721704
resellerPromoEndDate	2026-07-07	2026-06-29 09:35:08.72523
resellerPromoTitle	Become a Reseller — Limited Offer!	2026-06-29 09:35:08.728283
resellerPromoText	Activate your reseller account for just ₦500 and earn commission on every referral purchase. Offer ends soon!	2026-06-29 09:35:08.731305
kyb_verified	true	2026-06-29 10:04:00.408563
bigisub_api_token	2440d5017599e9216ff2ed7339ce11c3eade3242	2026-06-29 10:28:42.414553
bigisub_base_url	https://api.bigisub.ng/api/v2	2026-06-29 10:28:42.414553
bigisub_verified	false	2026-06-29 10:28:58.353548
activeProvider	kyb	2026-06-25 13:03:37.738803
exam_provider_NECO	easyaccess	2026-07-10 11:19:06.05
net_provider_MTN	kyb	2026-07-10 11:22:09.864
net_provider_AIRTEL	kyb	2026-07-10 11:22:09.88
net_provider_GLO	kyb	2026-07-10 11:22:09.883
net_provider_9MOBILE	kyb	2026-07-10 11:22:09.888
elec_provider	easyaccess	2026-07-10 15:02:59.042
easyaccess_verified	true	2026-07-10 21:46:54.505
\.


--
-- Data for Name: ticket_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ticket_messages (id, ticket_id, sender_id, sender_role, message, created_at) FROM stdin;
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tickets (id, user_id, subject, status, priority, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, user_id, type, status, amount, description, reference, metadata, created_at) FROM stdin;
e388b8ba-8cdd-435b-a41b-7c85d884f239	fe5e0722-7590-4011-850f-a94d2621c801	wallet_fund	failed	10000.00	Wallet funding via paystack	SANTECH-1780423517868-2P2R93	{"amount": 10000, "gateway": "paystack"}	2026-06-02 18:05:17.869985
de9d287b-d402-4d1a-b086-2c28202a2d48	64014564-6af7-4eb4-8ea2-6d1190658710	wallet_fund	failed	500.00	Wallet funding via monnify	SANTECH-1780491718484-SXZN7J	{"amount": 500, "gateway": "monnify"}	2026-06-03 13:01:59.358502
001f4e67-2dff-4b08-acc6-f42a8f04b1d7	64014564-6af7-4eb4-8ea2-6d1190658710	wallet_fund	failed	500.00	Wallet funding via paystack	SANTECH-1780496943456-Q50XW7	{"amount": 500, "gateway": "paystack"}	2026-06-03 14:29:04.071918
b6eaecea-1305-46eb-abe4-d8ee153e4037	fe5e0722-7590-4011-850f-a94d2621c801	wallet_fund	success	250.00	Refund: test data (₦150) + airtime (₦100) purchased but not delivered — system now fixed	ADMIN-FUND-1780500906212	{"adminFund": true}	2026-06-03 15:35:06.214132
cd793e4c-0dc9-485a-b80c-5d1e8017b86a	fe5e0722-7590-4011-850f-a94d2621c801	data	failed	110.00	9MOBILE 83MB data for 08063136201 — delivery failed	DATA-1780665852823	{"size": "83MB", "phone": "08063136201", "network": "9MOBILE", "validity": "1 Day"}	2026-06-05 13:24:13.39043
bedec88d-4f88-4159-9cfd-d6ae818c34fa	fe5e0722-7590-4011-850f-a94d2621c801	data	failed	360.00	MTN 500MB data for 08063136201 — delivery failed	DATA-1780672169804	{"size": "500MB", "phone": "08063136201", "network": "MTN", "validity": "1 Day"}	2026-06-05 15:09:30.428654
340a2ce5-c238-48bb-aee9-b96bf38c2a4f	fe5e0722-7590-4011-850f-a94d2621c801	airtime	failed	50.00	MTN airtime for 08063136201 — delivery failed	AIR-1780672170500	{"phone": "08063136201", "network": "MTN"}	2026-06-05 15:09:30.786339
885d1235-ce28-4e78-8257-6df8872acffa	fe5e0722-7590-4011-850f-a94d2621c801	data	failed	360.00	MTN 500MB data for 08063136201 — delivery failed	DATA-1780672811418	{"size": "500MB", "phone": "08063136201", "network": "MTN", "validity": "1 Day"}	2026-06-05 15:20:12.064424
67fb67ac-2327-4844-b504-5379579f46f9	fe5e0722-7590-4011-850f-a94d2621c801	airtime	failed	50.00	MTN airtime for 08063136201 — delivery failed	AIR-1780672812140	{"phone": "08063136201", "network": "MTN"}	2026-06-05 15:20:12.380152
45f439f6-218b-40a3-ba31-0ba978fde15c	fe5e0722-7590-4011-850f-a94d2621c801	data	failed	360.00	MTN 500MB data for 08063136201 — delivery failed	DATA-1780672871956	{"size": "500MB", "phone": "08063136201", "network": "MTN", "validity": "1 Day"}	2026-06-05 15:21:12.533492
ca91933a-8e55-4049-b5ff-6ceef2022b11	fe5e0722-7590-4011-850f-a94d2621c801	data	failed	360.00	MTN 500MB data for 08063136201 — delivery failed	DATA-1780672940043	{"size": "500MB", "phone": "08063136201", "network": "MTN", "validity": "1 Day"}	2026-06-05 15:22:20.632333
4c763153-5614-4729-ae74-bd14abe92733	fe5e0722-7590-4011-850f-a94d2621c801	airtime	failed	50.00	MTN airtime for 08063136201 — delivery failed	AIR-1780672940715	{"phone": "08063136201", "network": "MTN"}	2026-06-05 15:22:21.167193
f093f036-5a9f-491c-a909-edd144def5ea	fe5e0722-7590-4011-850f-a94d2621c801	airtime	failed	50.00	MTN airtime for 08063136201 — delivery failed	AIR-1780673865569	{"phone": "08063136201", "network": "MTN"}	2026-06-05 15:37:45.968536
76cf73f2-b9e5-44ae-acdd-feabf0307fe8	fe5e0722-7590-4011-850f-a94d2621c801	airtime	failed	50.00	MTN airtime for 08063136201 — delivery failed	AIR-1780674093933	{"phone": "08063136201", "network": "MTN"}	2026-06-05 15:41:34.63231
23881bb1-eed3-4986-acad-1fd49a107a32	fe5e0722-7590-4011-850f-a94d2621c801	data	failed	360.00	MTN 500MB data for 08063136201 — delivery failed	DATA-1780674094696	{"size": "500MB", "phone": "08063136201", "network": "MTN", "validity": "1 Day"}	2026-06-05 15:41:34.879355
62bd84f0-c696-42ab-b54c-175322685f18	fe5e0722-7590-4011-850f-a94d2621c801	airtime	failed	50.00	MTN ₦50 airtime for 08063136201 — delivery failed	AIR-1780675196847	{"phone": "08063136201", "network": "MTN"}	2026-06-05 15:59:57.397692
fdaf1b62-f541-4f12-8fba-14df3de3b304	fe5e0722-7590-4011-850f-a94d2621c801	airtime	failed	50.00	MTN ₦50 airtime for 08063136201 — delivery failed	AIR-1780675430060	{"phone": "08063136201", "network": "MTN"}	2026-06-05 16:03:50.586348
e5b7d1b6-14ed-49d7-821a-128d8dbeac3e	fe5e0722-7590-4011-850f-a94d2621c801	wallet_fund	failed	1000.00	Wallet funding via paystack	SANTECH-1780676115777-1VJS8W	{"amount": 1000, "gateway": "paystack"}	2026-06-05 16:15:16.210583
4ba14a52-6697-4eb8-9c77-63341844734f	fe5e0722-7590-4011-850f-a94d2621c801	wallet_fund	failed	1000.00	Wallet funding via monnify	SANTECH-1780676116586-52S4CZ	{"amount": 1000, "gateway": "monnify"}	2026-06-05 16:15:17.392035
eb64fa3d-dcb2-4f5d-a4e4-ee00b93f65ad	fe5e0722-7590-4011-850f-a94d2621c801	wallet_fund	success	1000.00	Manual credit: Paystack bank transfer SANTECH-1780676797539-DFTD3D confirmed success but callback missed	ADMIN-FUND-1780678156252	{"adminFund": true}	2026-06-05 16:49:16.252775
bc3df576-77e6-407a-941e-c3402efbcc5a	fe5e0722-7590-4011-850f-a94d2621c801	wallet_fund	success	1000.00	Manual credit: Paystack bank transfer SANTECH-1780657724056-ERCK3L confirmed success but marked failed	ADMIN-FUND-1780678156274	{"adminFund": true}	2026-06-05 16:49:16.275018
b6c261af-1be0-48f0-8350-9127613fbb8c	64014564-6af7-4eb4-8ea2-6d1190658710	airtime	failed	100.00	MTN ₦100 airtime for 08012345678 — delivery failed	AIRTIME-1781074067131	{"phone": "08012345678", "amount": 100, "network": "MTN"}	2026-06-10 06:47:47.625482
0aa75eb9-e1ee-4268-8139-89a11bcf15b9	5171a73b-3507-48a5-b896-6955dc3764ae	airtime	success	100.00	MTN ₦100 airtime for 08063136201	AIRTIME-1781078406234	{"phone": "08063136201", "amount": 100, "network": "MTN"}	2026-06-10 08:00:19.496173
eb8c9281-d15c-4d5e-87cc-658f26f36aea	64014564-6af7-4eb4-8ea2-6d1190658710	wallet_fund	failed	1000.00	Wallet funding via bank transfer (Flutterwave)	FLW-VA-1781098164537-6GXW	{"amount": 1000, "gateway": "flutterwave_va", "orderRef": "URF_1781098164966_2484835"}	2026-06-10 13:29:28.234811
08e6f71b-8816-4c5e-a95a-f631afe14d84	64014564-6af7-4eb4-8ea2-6d1190658710	wallet_fund	failed	500.00	Wallet funding via bank transfer (Flutterwave)	FLW-VA-1781104351238-L877	{"amount": 500, "gateway": "flutterwave_va", "orderRef": "URF_1781104351499_1566235"}	2026-06-10 15:12:34.721308
08ed5db8-638a-47ce-a107-eb2f51c51914	64014564-6af7-4eb4-8ea2-6d1190658710	wallet_fund	failed	1000.00	Wallet funding via bank transfer	SANTECH-BT-1781104635819-X5VY	{"amount": 1000, "gateway": "monnify_va", "transactionReference": "MNFY|59|20260610161716|000525"}	2026-06-10 15:17:16.950884
1a89ed4f-1c45-4224-b72a-8c860e5312f8	64014564-6af7-4eb4-8ea2-6d1190658710	airtime	success	100.00	MTN ₦100 airtime for 08063136201	AIRTIME-1782747130791	{"phone": "08063136201", "amount": 100, "network": "MTN"}	2026-06-29 15:32:23.445973
7e90e7ca-878f-456f-8890-688844137c7d	64014564-6af7-4eb4-8ea2-6d1190658710	data	success	235.00	MTN 1.GB SMART data for 08063136201	DATA-1782748456973	{"size": "1GB", "phone": "08063136201", "network": "MTN", "validity": "30 Days"}	2026-06-29 15:54:21.250935
4983bb49-fab4-4206-9044-908e9e79ba38	e09e8cee-5f70-4e8c-a279-a60090ab3e92	electricity	pending	1000.00	Electricity for meter 0137211132303 — awaiting confirmation	ELEC-1783719928483	{"phone": "08000000000", "meterType": "prepaid", "meterNumber": "0137211132303", "providerCode": "abuja-electric", "providerError": "EasyAccess request timed out. Please try again.", "awaitingReview": true, "adminNotifiedAt": "2026-07-10T21:55:52.652Z"}	2026-07-10 21:45:28.494855
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, full_name, email, phone, password_hash, role, status, email_verified, referral_code, referred_by, created_at, updated_at, last_login_at, reseller_since) FROM stdin;
64014564-6af7-4eb4-8ea2-6d1190658710	SanTech Admin	admin@santechdata.ng	09026329296	$2b$10$4nOOO99HkO0nb4NLDPUWPuxOzJfdBi7xewS5WdzqixUiNgDsrn.qS	admin	active	t	OTT24S	\N	2026-06-01 16:19:38.591556	2026-06-01 16:19:38.591556	2026-07-10 21:46:54.159	\N
fe5e0722-7590-4011-850f-a94d2621c801	Sani Muhammed Auwal 	sanimohammedauwal8@gmail.com	08063136201	$2b$10$YpLmL5muHHAeBEp/HzORl.963qCBKifmyJ8Xh/r4GabkIpK3lm5zu	customer	active	f	43MQFS	\N	2026-06-01 17:06:38.539471	2026-06-01 17:06:38.539471	\N	\N
bcadceba-5e8a-4cd5-9136-add85286f878	Test Customer	testcustomer@test.com	08011111111	$2b$10$spGhNGtsJwgWn.RkEbDvZOd.5exEavznJmS0ZaxnGWIeCLccIlJQG	customer	active	f	1JXCG9	\N	2026-06-06 14:32:54.782012	2026-06-06 14:32:54.782012	\N	\N
5171a73b-3507-48a5-b896-6955dc3764ae	Test Customer	testcustomer@santech.test	09000000001	$2b$10$KSssEK2E93koXwq6jsPWcu4IaVkv46RVdzcqBvpIrxNEK.dmloktq	customer	active	f	WR4DNW	\N	2026-06-10 07:23:46.06893	2026-06-10 07:23:46.06893	\N	\N
3a70e4d6-7ada-493d-ba3a-45d2ce9d93f6	Test Customer	testcustomer99@santechdata.ng	08012345678	$2b$10$Yw/LayPW5tKWe1x55WNkbuO57dCld75vRYmg7XnoHOHC4jwvfhA/C	customer	active	f	O04Y94	\N	2026-06-13 07:13:29.652587	2026-06-13 07:13:29.652587	\N	\N
3174331e-a72d-48e0-87de-f48aa59ff885	Test User	testuser@santechdata.ng	08000000000	$2b$10$7ZnlZ1ceNx8yJAL5B3mxluwRzB2KGcsDh.KkcciK1IJToELe5RxKa	customer	active	f	3WR4CR	\N	2026-06-19 13:13:37.436938	2026-06-19 13:13:37.436938	\N	\N
e09e8cee-5f70-4e8c-a279-a60090ab3e92	Debug Test	debugtest_1783719926341@example.com	08011122233	$2b$10$Y6aMVVN2HzurprajaoblfuUWTpJN3u.jsJXZjK5yU.QLpVEAjDgTm	customer	active	t	KI3J72	\N	2026-07-10 21:45:26.451368	2026-07-10 21:45:26.451368	\N	\N
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallets (id, user_id, balance, currency, updated_at, virtual_account_number, virtual_account_bank) FROM stdin;
674f274d-bcc2-4f6c-ba90-c5947c03e937	e09e8cee-5f70-4e8c-a279-a60090ab3e92	4000.00	NGN	2026-07-10 21:45:28.475	\N	\N
89a761fe-8596-4d1f-9c90-7d3a7ba87c26	fe5e0722-7590-4011-850f-a94d2621c801	7000.00	NGN	2026-06-05 16:49:16.271	\N	\N
7e894cff-2fa1-482e-9c52-d87108b5ea48	bcadceba-5e8a-4cd5-9136-add85286f878	0.00	NGN	2026-06-06 14:32:55.039055	\N	\N
902efb2e-da86-4bbf-9b35-5524cd92aa7c	5171a73b-3507-48a5-b896-6955dc3764ae	400.00	NGN	2026-06-10 08:00:06.229	\N	\N
1173b5df-8114-4b74-b9fd-454fe17f508c	3a70e4d6-7ada-493d-ba3a-45d2ce9d93f6	0.00	NGN	2026-06-13 07:13:29.694269	\N	\N
caf383b5-2a44-46f9-93ba-4f30317094dc	3174331e-a72d-48e0-87de-f48aa59ff885	0.00	NGN	2026-06-19 13:13:37.554312	\N	\N
baacd06d-dac6-44f5-84c9-b9a48999b23a	64014564-6af7-4eb4-8ea2-6d1190658710	20.00	NGN	2026-06-29 15:54:16.969	\N	\N
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.webauthn_credentials (id, user_id, credential_id, public_key, counter, device_name, created_at) FROM stdin;
\.


--
-- Name: airtime_to_cash airtime_to_cash_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.airtime_to_cash
    ADD CONSTRAINT airtime_to_cash_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_unique UNIQUE (key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: data_plans data_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_plans
    ADD CONSTRAINT data_plans_pkey PRIMARY KEY (id);


--
-- Name: exam_types exam_types_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_types
    ADD CONSTRAINT exam_types_code_unique UNIQUE (code);


--
-- Name: exam_types exam_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_types
    ADD CONSTRAINT exam_types_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: otps otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otps
    ADD CONSTRAINT otps_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: ticket_messages ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_reference_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_reference_unique UNIQUE (reference);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_unique UNIQUE (user_id);


--
-- Name: webauthn_credentials webauthn_credentials_credential_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_credential_id_unique UNIQUE (credential_id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: airtime_to_cash airtime_to_cash_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.airtime_to_cash
    ADD CONSTRAINT airtime_to_cash_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: api_keys api_keys_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ticket_messages ticket_messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: ticket_messages ticket_messages_ticket_id_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: tickets tickets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_referred_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referred_by_users_id_fk FOREIGN KEY (referred_by) REFERENCES public.users(id);


--
-- Name: wallets wallets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: webauthn_credentials webauthn_credentials_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict fQGz7NBguMErAuJ3DRzwXs2yHerjAcdECx6GZphyohxvPdvfGh7uHW4uLswHXyR

