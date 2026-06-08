# Auth Provider Comparison — Knocksafe

**Purpose:** Compare how we handle login for production. The Knocksafe POC already uses **custom NestJS auth** (`auth-service`). This document supports a team decision — **research and one optional spike**, not four full implementations.

**Business context:** Customers onboard **organizations** and **reps** (salespeople). Reps often already exist in the customer’s **Microsoft** or **Google** workspace. Plan for **social/workspace login** and, for larger buyers, **SSO** (Single Sign-On — one company login for all apps, e.g. “Sign in with Microsoft” using the employer’s directory).

**Pricing note:** Figures below were checked against vendor pricing pages in **early 2026** ([Auth0](https://auth0.com/pricing), [AWS Cognito](https://aws.amazon.com/cognito/pricing/), [Supabase](https://supabase.com/pricing), [Clerk](https://clerk.com/pricing)). Vendors change tiers often — **reconfirm before budgeting**.

---

## NestJS — Custom auth (current POC)

**Description:** Login, password hashing, and **JWT** (JSON Web Token — signed credential on each API call) live in our `auth-service`. Other Nest services validate the token and apply roles (`admin`, `rep`). Users stay in our MySQL (`admins`, `reps`).

**Pros**

- **No vendor lock-in** — no Auth0/AWS/Supabase identity dependency; no migration of SSO connectors tied to a third party.
- **We can build it** — already proven in the monorepo; extra features are **engineering hours**, not a skills gap.
- **No per-user auth subscription** — you do not pay **MAU** (Monthly Active Users) fees to an identity vendor.
- Data stays with orgs/reps CRUD in MySQL.
- Full control over admin vs rep rules in Nest guards.

**Cons**

- **Hours add up** for production features (reset password, **OAuth**, corporate **SSO**, **MFA**, audits).
- We own security incidents and compliance evidence.
- Corporate **SSO** in-house is slow and risky if sales promises it soon.

**Pricing (money)**

| Cost type | What you pay |
|-----------|----------------|
| **Vendor subscription** | **$0** per MAU — no Auth0-style monthly plan. |
| **Infrastructure** | MySQL + compute you already run (small $ in AWS/local). |
| **Engineering (real cost)** | Email/password + JWT (POC): **done**. Hardening: **days–weeks**. Microsoft/Google login: **+weeks**. Enterprise **SSO** + **MFA**: **+weeks to months** (often comparable to 1–2 years of a mid-tier auth subscription if built poorly). |
| **Hidden costs** | Security review, on-call for auth outages, SMS for **MFA** if you add it (e.g. Twilio/AWS SNS per message). |

**Bottom line:** Cheapest on the **invoice**, most expensive in **team time** if you need the same features as Auth0 Professional.

---

## Auth0

**Description:** Managed identity: hosted login, **MFA**, **SSO** connectors; Nest validates their **JWT**.

**Pros**

- Strong when **clients need corporate login** (Microsoft Entra / Azure AD, Okta) without building **SAML**/**OIDC** yourself.
- Social login and **MFA** from a dashboard.
- Good for enterprise sales conversations.
- Nest stays thin (verify token + roles).

**Cons**

- **Predictable subscription + surprise overages** — not “just a few cents per user.”
- **B2B pricing is much higher** than consumer (B2C) headline numbers.
- **Lock-in** on SSO rules and user migration.
- **Free tier is misleading for B2B:** **$0** but only **5 Organizations** (customer companies) — not viable beyond a small pilot.
- Extra **Enterprise Connections** (corporate IdPs) are **capped** on paid B2B plans (**3** on Essentials, **5** on Professional).

**Pricing (money) — verified on [auth0.com/pricing](https://auth0.com/pricing)**

Auth0 splits **B2C** (consumer apps) and **B2B** (apps with organizations/teams — **Knocksafe fits B2B**).

### Auth0 “Organizations” (important for Knocksafe)

In Auth0 **B2B**, an **Organization** is how Auth0 models **your customer companies** (multi-tenant SaaS) — similar to our `organizations` table (Acme Corp, etc.), **not** the same as “unlimited users.”

So the **Free** plan is **not** “free for unlimited customers.”

### Free tier — $0 but hard limits ([auth0.com/pricing](https://auth0.com/pricing))

| Limit on **Free** | Value | Impact on Knocksafe |
|-------------------|-------|---------------------|
| **MAU** (Monthly Active Users) | Up to **25,000** | Sounds large; secondary limit for us. |
| **Organizations** | **5 max** | **At most 5 customer companies** on the platform — enough for internal POC, **not** for production with many clients. |
| **Enterprise Connections** | **1** | Only **one** corporate **SSO** IdP (e.g. one Microsoft tenant) on Free. |
| **Tenants** | **1** | One Auth0 tenant (typical for dev). |

**Bottom line:** Auth0 Free = **$0 + max 5 organizations**. After the 6th Knocksafe customer org, you need a **paid B2B** plan.

### B2C paid plans (headline prices — consumer apps, not our model)

| Plan | Starting monthly price | **MAU** at entry price | **Organizations** |
|------|----------------------|-------------------------|-------------------|
| **Essentials** | **from $35/mo** | **500** | **10** (per feature comparison table) |
| **Professional** | **from $240/mo** | **500** | **10** |
| **Enterprise** | **Custom** | Custom | Custom |

**$35 → $240** is correct for **B2C** paid tiers — **not** for Knocksafe B2B.

### B2B paid plans (relevant for Knocksafe)

| Plan | Starting monthly price | **MAU** (examples) | **Organizations** | Other limits |
|------|------------------------|----------------------|---------------------|--------------|
| **Essentials** | **from $150/mo** | **500** → **$300/mo** at 1k → **~$2,100/mo** at 10k | **Unlimited** | **3** Enterprise Connections (**SSO** IdPs) |
| **Professional** | **from $800/mo** | **500–1k** at **$800** → **~$2,400/mo** at 10k | **Unlimited** | **5** Enterprise Connections |
| **Enterprise** | **Custom** | Negotiated | Custom tiers | Many IdPs, compliance, SCIM |

**Knocksafe mapping:** Each paying **customer company** ≈ one Auth0 **Organization**. Reps are users **inside** that org. Free tier caps you at **5** such companies; paid B2B removes the org cap but bills by **MAU** and **SSO** connections.

### Other cost drivers (read the invoice, not only MAU)

| Item | Why it matters for Knocksafe |
|------|------------------------------|
| **MAU overage** | Above included MAU you move to the **next price tier** (can jump hundreds of $/mo). |
| **Enterprise Connections** | Each customer’s Microsoft/Okta **SSO** may count; B2B Essentials allows **3**, Professional **5** — then Enterprise. |
| **M2M / machine tokens** | Backend-to-backend auth billed separately on some plans. |
| **Yearly billing** | ~11 months price if paid annually (one month free). |
| **Startup program** | Possible 1-year deal (e.g. B2B Professional–level features) — not guaranteed for every project. |

**Example scenarios (B2B, ballpark from public tier table — confirm with Auth0):**

| Scenario | Likely plan band | Order of magnitude |
|----------|------------------|-------------------|
| Dev / demo only, ≤5 customer orgs | Free | **$0** (hit **5 org** cap quickly) |
| Pilot, &lt;500 active reps/month, 6+ customer orgs | Essentials | **~$150–300/mo** |
| Growth, ~5,000 MAU | Essentials / Professional | **~$1,300–1,500/mo** |
| ~10,000 MAU + **SSO** for several enterprise customers | Professional+ | **~$2,400+/mo** before Enterprise |
| Many corporate IdPs + compliance | Enterprise | **Custom**, often **$10,000+/mo** |

---

## Supabase Auth

**Description:** Auth bundled with Supabase (Postgres + storage). Frontends use Supabase SDK; Nest verifies **JWTs**.

**Pros**

- Fast if the product already uses Supabase.
- OAuth (Google, etc.) included in platform pricing.
- Auth **MAU** quota is large on paid plans vs dedicated auth vendors.

**Cons**

- You pay for the **whole Supabase org**, not auth alone.
- **SSO** (SAML) only on paid plans, with its own **MAU** bucket.
- **Lock-in** if DB + auth + storage move together.

**Pricing (money) — [supabase.com/pricing](https://supabase.com/pricing)**

Auth is **not sold separately**; it is part of org plans:

| Plan | Base subscription | **MAU** included (auth) | Beyond quota |
|------|-------------------|---------------------------|--------------|
| **Free** | **$0/mo** | **50,000** MAU | No paid overage on Free — cap applies. |
| **Pro** | **from $25/mo** + usage | **100,000** MAU | **$0.00325 per extra MAU** (~$325 per 100k over) |
| **Team** | **from $599/mo** + usage | **100,000** MAU | Same **$0.00325** overage |
| **Enterprise** | **Custom** | **Custom** | Negotiated |

**SSO (SAML 2.0):** Not on Free. On **Pro/Team**: **50 SSO MAU** included, then **$0.015 per SSO MAU**.

**Add-ons that affect “real” auth cost:**

| Add-on | Price |
|--------|--------|
| **Phone MFA** (SMS) | **$75/mo** first project, **$10/mo** per extra project + SMS pass-through |
| **Compute / DB / egress** | Often the **larger** bill than auth on Pro |

**Example:** 150,000 MAU on Pro → **$25** base + **~$162** MAU overage (**50k × $0.00325**) ≈ **$187/mo** for auth slice only — plus **$25+** compute/DB minimum.

**Bottom line:** Looks cheap at small scale (**$25/mo** Pro), but Knocksafe on **AWS + MySQL** may pay for Supabase **only for auth** — poor fit unless the whole stack moves.

---

## AWS Cognito

**Description:** AWS user pools: sign-in, **MFA**, Google/**SAML**/**OIDC** federation. Fits AWS-hosted Nest.

**Pros**

- Stays on **AWS billing** (no separate Auth0 contract).
- Often **cheaper per MAU** than Auth0 at scale.
- Good for **Active Directory** / federation when prod is AWS.

**Cons**

- Harder DX than Auth0.
- **Plus** tier and **SMS MFA** add cost.
- Tier changes (Dec 2024): free **MAU** dropped from 50k → **10k** on new pools.

**Pricing (money) — [aws.amazon.com/cognito/pricing](https://aws.amazon.com/cognito/pricing/)**

Cognito uses **feature plans** (Lite, Essentials, Plus) per user pool:

| Plan | Free **MAU** / month | Price after free tier (direct / social login) | Typical use |
|------|----------------------|-----------------------------------------------|-------------|
| **Lite** | **10,000** | **$0.0055–$0.0025** per MAU (volume steps) | Basic auth, lowest cost |
| **Essentials** | **10,000** | **$0.015** per MAU | Default for new pools; more features |
| **Plus** | **0** (no free tier) | **$0.02** per MAU | Threat protection, advanced security |

**Enterprise federation (**SSO** via SAML/OIDC):** **50** federated MAU free, then **~$0.015** per federated MAU (separate from direct-login MAU).

**Other line items:**

| Item | Approximate cost |
|------|------------------|
| **SMS MFA** | AWS SNS pricing (~**$0.006+** per SMS depending on region) |
| **M2M token requests** | **$0.00225 per 1,000** successful token requests |
| **Advanced Security (Plus)** | Higher per-MAU rate; no 10k free on Plus |

**Example (Essentials, direct login only):**

| Active users / month | Approx. Cognito auth cost |
|----------------------|---------------------------|
| ≤10,000 | **$0** (within free tier) |
| 50,000 | **~$600/mo** (40k × $0.015) |
| 100,000 | **~$1,350/mo** (90k × $0.015) |

Add **federated SSO MAU** and **SMS** on top. Still often **below** Auth0 B2B Professional (**$800+**) at similar scale — with more integration work.

---

## Clerk (alternative)

**Description:** Managed auth with strong Next.js UX; org/B2B features on higher tiers.

**Pros**

- Fast UI; **50,000** users included on Pro.
- Clear public pricing.

**Cons**

- **Organizations** and **SSO** pricing is separate from base plan.
- Enterprise **SAML** limits on Pro (1 connection included).

**Pricing (money) — [clerk.com/pricing](https://clerk.com/pricing)**

| Plan | Monthly base | Users / orgs included | Overage |
|------|--------------|------------------------|---------|
| **Hobby** | **$0** | **50,000 MRU** (Monthly Retained Users), **100 MRO** (orgs) | Hard limits |
| **Pro** | **$25/mo** ($20/mo annual) | **50,000 MRU** per app | **$0.02/MRU** (tiers down to **$0.012** at 10M+) |
| **Business** | **$300/mo** ($250/mo annual) | Same MRU band + compliance artifacts | Same MRU overage |
| **Enterprise** | **Custom** | Custom | Annual contracts |

**B2B / SSO extras (important for Knocksafe):**

| Feature | Cost |
|---------|------|
| **Enterprise Connection** (SAML/OIDC — one corporate IdP) | **1 included** on Pro; **$75/mo each** extra (volume discounts) |
| **B2B Authentication** add-on | **~$100/mo** (org widgets, MRO limits) |
| **SMS MFA** | **~$0.01/SMS** (US/Canada) + pass-through |

**Example:** Pro **$25** + **$100** B2B add-on + **2 extra** enterprise **SSO** connections (**~$150**) ≈ **~$275/mo** before MRU overage — still below Auth0 B2B **$800** Professional, but **SSO** slots fill quickly.

---

## When to build vs outsource (team alignment)

| Approach | Best when… |
|----------|------------|
| **Nest custom** | **No lock-in**, data in MySQL, pilots; budget **engineer hours** instead of **$150–800+/mo** auth subs. |
| **Managed auth** | Buyers need **Microsoft/Google corporate SSO** soon; reps already in customer workspace. |

**Pragmatic split:** Nest (or Nest + OAuth only) for pilots → **Auth0 B2B** or **Cognito** when the first enterprise deal requires company Microsoft login.

---

## Pricing summary table

*Knocksafe should use **B2B** columns for Auth0. Numbers are **starting** or **typical** tiers — not quotes.*

| | **Nest custom** | **Auth0 (B2B)** | **Supabase (auth slice)** | **AWS Cognito** | **Clerk** |
|---|-----------------|-----------------|---------------------------|-----------------|-----------|
| **Subscription model** | Engineer time + infra | Monthly plan by **MAU** tier | Org plan ($25–$599+) + usage | Per **MAU** + features | $0 / $25 / $300 + MRU |
| **Typical entry (paid)** | **$0** vendor fee | **~$150/mo** (500 MAU) | **$25/mo** Pro (100k MAU) | **$0** (&lt;10k MAU) | **$25/mo** Pro |
| **Free tier org limit** | N/A (our DB) | **5 Organizations** max | N/A (50k MAU, no Auth0 org model) | N/A | **100 MRO** (orgs) on Hobby |
| **Mid-scale (~5k MAU)** | Weeks of build $ | **~$1,300/mo** (Essentials) | Pro + small overage | **~$0–75/mo** Essentials | **$25** if &lt;50k MRU |
| **~10k MAU + SSO** | Months of build $ | **~$2,400/mo** (Prof.) + connection limits | Pro + SSO MAU fees | **~$1,350/mo** + federation | **$300** Business + addons |
| **Corporate SSO** | Build (high $) | Built-in; **3–5** IdPs on self-serve B2B | 50 SSO MAU then **$0.015/MAU** | Federated MAU **$0.015** | **1** IdP Pro; **$75/mo** each extra |
| **Lock-in** | Lowest | Medium | Medium–high | AWS | Medium |
| **Invoice surprise risk** | Scope creep | Tier jumps, Enterprise upsell | DB/compute >> auth | SMS, Plus tier | MRU + B2B + **SSO** addons |

---

## Feature summary table (non-pricing)

| | **Nest custom** | **Auth0** | **Supabase Auth** | **AWS Cognito** | **Clerk** |
|---|:---:|:---:|:---:|:---:|:---:|
| **We can build in-house** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Corporate SSO** | ❌ Slow | ✅ Strong | ⚠️ Limited | ✅ on AWS | ⚠️ Paid slots |
| **Sign in with Google / Microsoft** | ⚠️ Build | ✅ | ✅ | ✅ | ✅ |
| **Fits current Nest POC** | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **Rep/org data in our MySQL** | ✅ | ⚠️ Link users | ⚠️ Link users | ⚠️ Link users | ⚠️ Link users |

---

## Recommendation

1. **Nest POC** proves JWT across services — not necessarily final auth for Microsoft-heavy buyers.
2. **Auth0 Free ≠ production B2B** — **$0** but **max 5 Organizations** (customer companies). Sixth client → paid **B2B Essentials** (~**$150/mo**+).
3. **Budget Auth0 as B2B**, not **$35/$240 B2C** — expect **~$150/mo** minimum paid, **~$800+/mo** when **SSO** + scale matter.
4. **Cognito** if prod is AWS and cost control matters — trade DX for lower **MAU** $.
5. **Reconfirm** [auth0.com/pricing](https://auth0.com/pricing) (B2B tab, **Organizations** row) before proposals.

---

## References

- [Auth0 Pricing (B2B vs B2C)](https://auth0.com/pricing)
- [AWS Cognito Pricing](https://aws.amazon.com/cognito/pricing/)
- [Supabase Pricing](https://supabase.com/pricing)
- [Clerk Pricing](https://clerk.com/pricing)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- Internal: `apps/auth-service`, [ARQUITECTURA-POC.md](./ARQUITECTURA-POC.md)

---

*Version 2.2 — Auth0 Free: 25k MAU but **5 Organizations** max (B2B); paid B2B Essentials = unlimited orgs from ~$150/mo.*
