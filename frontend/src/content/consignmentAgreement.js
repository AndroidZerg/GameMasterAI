export const AGREEMENT_VERSION = "1.0"

export const AGREEMENT_HEADER = {
  entity: "K2 ENTERTAINMENT LLC",
  dba: "doing business as GameMaster Guide",
  title: "PUBLISHER CONSIGNMENT AGREEMENT",
  subtitle: "PILOT PROGRAM — v1.0",
}

export const AGREEMENT_SECTIONS = [
  {
    title: "RECITALS",
    content: `K2 Entertainment LLC, doing business as GameMaster Guide ("GMG"), operates a subscription-based board game teaching platform deployed at cafes, bars, restaurants, and independent venues across Las Vegas, Nevada. The GMG platform provides AI-powered game instruction, food and beverage ordering integration, customer analytics, and venue management tools. Publisher is a game developer and/or publisher that owns or controls the rights to the game titles listed in Schedule A of this agreement. The parties desire to enter into a consignment arrangement pursuant to which Publisher will place physical game inventory with GMG for deployment across GMG venue partners for the purpose of in-venue player engagement and retail sale. This agreement governs the terms of that arrangement.`,
  },
  {
    title: "SECTION 1 — PILOT PROGRAM DESIGNATION",
    clauses: [
      {
        id: "1.1",
        title: "Pilot Status",
        text: "This agreement is designated a pilot program. Both parties acknowledge that the GMG platform, venue network, and distribution model are in early-stage development. The terms herein reflect the current state of the program and are expected to evolve.",
      },
      {
        id: "1.2",
        title: "Right to Modify Terms",
        text: "GMG reserves the right to modify any term of this agreement with thirty (30) days written notice to Publisher. Publisher may terminate this agreement within that thirty-day window if Publisher does not accept the proposed modification. Continued performance after the thirty-day window constitutes acceptance of the modified terms.",
      },
      {
        id: "1.3",
        title: "Commission Reserve",
        text: `Under this pilot program, GMG takes no commission on game sales. One hundred percent (100%) of retail sale proceeds are remitted to Publisher. GMG's revenue is derived solely from venue subscription fees. GMG reserves the right, on a per-venue basis, to negotiate a venue commission of up to twenty percent (20%) of the retail sale price as a condition of partnership with a specific venue. In any venue where a commission applies, Publisher shall receive no less than eighty percent (80%) of the retail sale price. GMG will make a good faith effort to minimize any venue commission. All venue commissions will be disclosed to Publisher in writing prior to taking effect at that venue and will appear as a line item on the monthly invoice. GMG does not retain any portion of venue commissions — commissions are paid to the venue as a condition of that venue's participation.`,
      },
    ],
  },
  {
    title: "SECTION 2 — INVENTORY",
    clauses: [
      {
        id: "2.1",
        title: "Inventory Schedule",
        text: "The game titles, unit counts, and unit designations subject to this agreement are set forth in Schedule A, attached hereto and incorporated by reference. Schedule A may be updated by mutual written agreement as additional inventory is transferred.",
      },
      {
        id: "2.2",
        title: "Demo Units",
        text: "One (1) unit per title shall be designated as a Demo Unit. Demo Units are reserved for in-venue player use and demonstration purposes and are not available for retail sale. Demo Units shall be identified in Schedule A.",
      },
      {
        id: "2.3",
        title: "Sale Units",
        text: "All units not designated as Demo Units are Sale Units. Sale Units shall be deployed across GMG venue partners for consignment sale to end customers.",
      },
      {
        id: "2.4",
        title: "Title and Risk of Loss",
        text: "All inventory remains Publisher's property until the point of retail sale to an end customer. Risk of loss transfers to the venue upon delivery of inventory to the venue's physical location. GMG is not liable for venue-level loss beyond the insurance and deposit mechanisms defined in Section 6 of this agreement.",
      },
      {
        id: "2.5",
        title: "Inventory Inspection",
        text: "GMG reserves the right to inspect inventory condition at any venue location at any time with twenty-four (24) hours written notice to the venue.",
      },
      {
        id: "2.6",
        title: "GMG Deployment Rights",
        text: "GMG may move inventory between venue locations at any time without Publisher approval. GMG may deploy any title at any venue without restriction. GMG may remove any title from any venue at any time without Publisher approval, subject to the return shipping terms in Section 9.",
      },
    ],
  },
  {
    title: "SECTION 3 — SALE PRICE AND PAYMENT",
    clauses: [
      {
        id: "3.1",
        title: "Sale Price",
        text: "Publisher confirms the retail sale price for each title as set forth in Schedule A. If Publisher has not confirmed a wholesale price at signing, the default reimbursement rate for damage claims shall be fifty percent (50%) of the confirmed retail sale price.",
      },
      {
        id: "3.2",
        title: "Payment Terms — Net 60",
        text: "GMG shall remit Publisher's proceeds within sixty (60) days of the end of each calendar month in which sales occurred. Payment shall be made via ACH bank transfer to Publisher's designated account. Wire transfer is available upon written request. All payments are denominated in United States dollars.",
      },
      {
        id: "3.3",
        title: "Monthly Invoice",
        text: "Each net 60 payment shall be accompanied by a monthly invoice itemizing: (a) units sold by title, venue, and date; (b) gross proceeds by title; (c) any damage reimbursements passed through from venues; (d) any applicable venue commission by venue; and (e) net amount due to Publisher. The monthly invoice shall also include the inventory reconciliation required under Section 5.3.",
      },
      {
        id: "3.4",
        title: "Late Payment",
        text: "If GMG fails to remit payment by the net 60 deadline, a late fee of one and one-half percent (1.5%) per month shall accrue on the outstanding balance from the due date until paid.",
      },
      {
        id: "3.5",
        title: "Audit Rights",
        text: "Publisher has the right to request an audit of GMG's sales records related to Publisher's titles once per calendar year, with thirty (30) days written notice, at Publisher's expense. GMG shall provide reasonable access to relevant records.",
      },
    ],
  },
  {
    title: "SECTION 4 — VENUE DEPLOYMENT",
    clauses: [
      {
        id: "4.1",
        title: "Venue Agreements",
        text: "Each venue partner signs a separate agreement with GMG that includes a security deposit, acknowledgment that inventory remains Publisher's property until point of sale, and liability for loss, damage, and theft as described in Section 6.",
      },
      {
        id: "4.2",
        title: "Venue Security Deposit",
        text: "Each venue shall pay GMG a security deposit equal to the lesser of (a) the full retail replacement value of all units placed at that location or (b) five hundred dollars ($500.00) for initial deployments, with a minimum of two hundred fifty dollars ($250.00). The deposit shall be held by GMG and applied to insurance deductibles, damage reimbursements, or outstanding invoices as needed.",
      },
      {
        id: "4.3",
        title: "Deposit Replenishment",
        text: "If a venue's security deposit is drawn down by more than fifty percent (50%), GMG shall invoice the venue to restore the deposit to its original amount within thirty (30) days. Failure to replenish shall result in suspension of the venue's GMG platform access until the deposit is restored.",
      },
      {
        id: "4.4",
        title: "Venue Invoicing",
        text: "Venues are invoiced by GMG on net 30 terms for monthly subscription fees and any damage reimbursements. Publisher shall never invoice venues directly. All financial relationships with venues are managed exclusively by GMG.",
      },
    ],
  },
  {
    title: "SECTION 5 — INVENTORY MANAGEMENT AND RESTOCKING",
    clauses: [
      {
        id: "5.1",
        title: "Initial Shipment",
        text: "Publisher shall ship initial inventory to GMG's address as specified in writing by GMG. GMG shall be responsible for deployment to individual venues.",
      },
      {
        id: "5.2",
        title: "Restock Notifications",
        text: "GMG shall notify Publisher when a venue's inventory for any title reaches a restock threshold set in the GMG dashboard. Publisher shall ship replacement units directly to the venue address provided by GMG within fourteen (14) days of receiving a restock notification. Publisher bears the cost of restock shipments.",
      },
      {
        id: "5.3",
        title: "Inventory Reconciliation",
        text: "GMG shall provide Publisher with a monthly inventory reconciliation report attached to each net 60 invoice. The report shall show, by title and venue: (a) units on hand at start of period; (b) units sold; (c) units consumed as donor units; (d) units lost, stolen, or damaged; and (e) units on hand at end of period. Donor unit consumption shall be reflected as inventory depletion only — no monetary charge shall appear on the Publisher invoice for normal wear and tear or donor unit use.",
      },
      {
        id: "5.4",
        title: "Publisher Notification Options",
        text: "GMG shall provide Publisher with: (a) a weekly actionable report showing units sold that week and restock flags for any venue at or below restock threshold; and (b) the monthly comprehensive report described in Section 5.3. Publisher may additionally opt in to real-time sale notifications delivered via email each time a unit sells. Real-time notifications are optional and off by default.",
      },
      {
        id: "5.5",
        title: "Minimum Deployment Commitment",
        text: "Publisher shall maintain sufficient inventory to stock a minimum of fifty percent (50%) of active venues where their titles are deployed at any given time. If Publisher's available inventory falls below this threshold, GMG shall reduce Publisher's active venue deployments proportionally to maintain the fifty percent coverage ratio. Venues removed from Publisher's deployment due to inventory shortfall may be filled with titles from other publishers at GMG's discretion.",
      },
      {
        id: "5.6",
        title: "GMG Interim Rotation",
        text: "GMG may rotate inventory between venue locations as a courtesy when a venue is awaiting a Publisher restock. Such rotation is not guaranteed, is subject to inventory and logistics availability, and is performed at GMG's sole discretion.",
      },
    ],
  },
  {
    title: "SECTION 6 — LOSS, DAMAGE, AND INSURANCE",
    clauses: [
      {
        id: "6.1",
        title: "Normal Wear and Tear — Donor Unit Program",
        text: "Missing pieces and minor component damage attributable to normal use are handled through the donor unit program. When a Demo Unit requires replacement components to remain playable, GMG may designate one Sale Unit as a parts donor. The consumed unit shall be reflected as inventory depletion in the monthly reconciliation report. No monetary charge shall be assessed to Publisher for donor unit consumption. Publisher accepts this as an inherent cost of the consignment program, offset by the benefit of one hundred percent sale proceeds and free venue placement.",
      },
      {
        id: "6.2",
        title: "Catastrophic Loss and Theft",
        text: "In the event of theft, catastrophic damage, or complete loss of a unit at a venue, the venue shall be invoiced by GMG at the confirmed wholesale price, or fifty percent (50%) of the confirmed retail sale price if wholesale has not been confirmed at signing. The venue shall pay this invoice to GMG on net 30 terms. Upon GMG's receipt of payment from the venue, the reimbursement amount shall be reflected as a credit line item on Publisher's next net 60 invoice and remitted accordingly. Publisher shall never bear direct financial liability for catastrophic venue-level loss.",
      },
      {
        id: "6.3",
        title: "Insurance",
        text: "GMG shall maintain an inland marine insurance policy covering consigned inventory against catastrophic loss events — including mass theft, fire, flood, and structural damage — across all active venue locations. GMG is the named insured. The venue security deposit is sized to cover the applicable insurance deductible. Insurance claims are filed by GMG. Individual unit theft or single-unit damage shall be handled through venue invoicing under Section 6.2 rather than insurance claims, as such events typically do not reach the policy deductible threshold.",
      },
      {
        id: "6.4",
        title: "Venue Non-Payment",
        text: "If a venue fails to pay a damage invoice within thirty (30) days, GMG may suspend that venue's platform access and, if non-payment continues beyond sixty (60) days, terminate the venue agreement and retrieve all inventory. GMG shall pursue venue-level collection on behalf of the program. Publisher acknowledges that in cases of venue insolvency or bad faith, GMG's recourse may be limited to small claims proceedings.",
      },
    ],
  },
  {
    title: "SECTION 7 — DIGITAL GUIDE AND PLATFORM RIGHTS",
    clauses: [
      {
        id: "7.1",
        title: "Guide Creation",
        text: "Upon receipt of Publisher assets, GMG shall create a teaching guide for each title. GMG shall complete each guide within seven (7) days of receiving complete assets. Publisher shall receive the completed guide for review no less than forty-eight (48) hours before the guide goes live on the GMG platform. If Publisher does not provide written feedback within forty-eight (48) hours of delivery, the guide shall be deemed approved and will go live by default.",
      },
      {
        id: "7.2",
        title: "Rulebook Usage",
        text: "GMG reserves the right to reproduce Publisher's rulebook text verbatim within the GMG platform for the sole purpose of resolving explicit rules questions accurately and providing authoritative rules reference to players. All verbatim reproductions shall include a citation to the source rulebook, edition, and page number where applicable. This right is strictly limited to in-app teaching and rules reference use. GMG shall not reproduce rulebook text in marketing materials, external publications, or for any purpose outside the GMG platform without separate written permission from Publisher.",
      },
      {
        id: "7.3",
        title: "Intellectual Property — GMG",
        text: "GMG retains all intellectual property rights in the GMG platform, software, teaching guides, analytics, and all original content created by GMG. GMG's teaching guides are GMG's proprietary derivative works. Publisher may not use, reproduce, license, or distribute GMG's teaching guide content for any purpose — including use on Publisher's own digital platforms, apps, or third-party partnerships — without a separate written licensing agreement with GMG.",
      },
      {
        id: "7.4",
        title: "Intellectual Property — Publisher",
        text: "Publisher retains all intellectual property rights in their games, rules, artwork, and assets. Nothing in this agreement transfers ownership of Publisher's IP to GMG. GMG's license to use Publisher's assets is limited to the purposes expressly stated herein.",
      },
      {
        id: "7.5",
        title: "Marketing Rights",
        text: "Publisher grants GMG a non-exclusive license to use Publisher's game name, cover art, logo, and title descriptions in GMG marketing materials, venue pitch decks, press releases, social media content, and the GMG website for the purpose of promoting the GMG program and the availability of Publisher's titles on the platform. This license is effective for the duration of this agreement and terminates upon agreement termination.",
      },
      {
        id: "7.6",
        title: "Platform Changes",
        text: "GMG reserves the right to modify the platform, features, reporting format, analytics delivery, and user interface at any time. Publisher's rights to receive payments, inventory reports, and analytics as described in this agreement are not diminished by platform changes.",
      },
    ],
  },
  {
    title: "SECTION 8 — ANALYTICS AND REPORTING",
    clauses: [
      {
        id: "8.1",
        title: "Analytics Provided",
        text: "GMG shall provide Publisher with play session data, sell-through rates, conversion rates (play session to purchase), venue-level inventory status, and restock recommendations through weekly and monthly reporting as described in Section 5.4.",
      },
      {
        id: "8.2",
        title: "Internal Use Only",
        text: "All analytics and platform data provided to Publisher are for Publisher's internal business use only. Publisher shall not share, sell, license, publish, or otherwise distribute GMG platform data — in whole or in part, in identified or aggregated form — to any third party without GMG's prior written consent.",
      },
      {
        id: "8.3",
        title: "Audit Rights",
        text: "Publisher may request an audit of GMG's sales records related to Publisher's titles once per calendar year with thirty (30) days written notice. Audits shall be conducted at Publisher's expense by a mutually agreed auditor.",
      },
    ],
  },
  {
    title: "SECTION 9 — PERFORMANCE REVIEW AND INACTIVE TITLES",
    clauses: [
      {
        id: "9.1",
        title: "Performance Review",
        text: "GMG may place any title on inactive status if, in GMG's reasonable discretion, that title demonstrates insufficient play activity relative to comparable titles deployed across a comparable number of venues. Performance is assessed on a rolling ninety (90) day basis. GMG shall make a documented good faith promotional effort prior to deactivation, including featuring the title on the GMG platform home screen on alternating days for a minimum promotional period. If the title continues to underperform following this promotional effort, GMG may deactivate the title and initiate inventory return.",
      },
      {
        id: "9.2",
        title: "Return Shipping — Performance Deactivation",
        text: "If GMG terminates a title's deployment under Section 9.1 due to underperformance following a documented promotional effort, Publisher shall bear the cost of return shipping for that title's inventory. GMG shall provide Publisher with written notice of deactivation and the documented promotional record.",
      },
      {
        id: "9.3",
        title: "Unilateral Removal vs. Performance Deactivation",
        text: "GMG's right to remove inventory from any venue at any time under Section 2.6 is separate from the performance review process. Inventory removed under Section 2.6 for reasons other than documented underperformance shall be returned at GMG's shipping expense. The performance review process under this section is the exclusive mechanism by which Publisher becomes liable for return shipping costs.",
      },
      {
        id: "9.4",
        title: "Ninety-Day Rotation Request",
        text: "If a title has generated zero sales in any ninety (90) day period, Publisher may independently request rotation to different venue locations or partial return of that title's units without triggering full agreement termination. Such requests shall be accommodated by GMG within thirty (30) days.",
      },
    ],
  },
  {
    title: "SECTION 10 — TERM AND TERMINATION",
    clauses: [
      {
        id: "10.1",
        title: "Term",
        text: "This agreement commences on the effective date and continues until terminated by either party in accordance with this section.",
      },
      {
        id: "10.2",
        title: "Termination by Publisher",
        text: "Publisher may terminate this agreement with sixty (60) days written notice to GMG. Upon termination by Publisher, all unsold inventory shall be returned to Publisher within sixty (60) days of the termination notice date. Publisher shall bear all return shipping costs. All outstanding invoices become immediately due.",
      },
      {
        id: "10.3",
        title: "Termination by GMG",
        text: "GMG may terminate this agreement with thirty (30) days written notice to Publisher. Upon termination by GMG for reasons other than Publisher breach or title underperformance, GMG shall bear all return shipping costs and shall return unsold inventory within thirty (30) days of the termination notice date.",
      },
      {
        id: "10.4",
        title: "Termination for Cause",
        text: "Either party may terminate this agreement immediately upon written notice if the other party materially breaches this agreement and fails to cure such breach within fifteen (15) days of receiving written notice specifying the breach in reasonable detail. The terminating party shall bear no liability for the other party's failure to cure.",
      },
      {
        id: "10.5",
        title: "Effect of Termination",
        text: "Upon termination for any reason: (a) all outstanding payment obligations survive and become immediately due; (b) GMG's license to use Publisher's assets terminates; (c) Publisher's access to GMG analytics terminates; (d) the following provisions survive termination: intellectual property ownership, non-circumvention, non-disparagement, limitation of liability, indemnification, arbitration, and governing law.",
      },
    ],
  },
  {
    title: "SECTION 11 — NON-CIRCUMVENTION",
    clauses: [
      {
        id: "11.1",
        title: "Protection of GMG Venue Relationships",
        text: "Publisher agrees that during the term of this agreement and for twelve (12) months following termination, Publisher shall not directly approach, solicit, or enter into any direct consignment, distribution, sales, or platform arrangement with any venue that GMG has introduced Publisher to during the term of this agreement, for the purpose of establishing any relationship that bypasses GMG's platform or circumvents the commercial relationship established hereunder.",
      },
      {
        id: "11.2",
        title: "Right of First Negotiation",
        text: "If Publisher pursues a partnership with any third-party platform or operator offering services substantially similar to GMG's — including AI-powered game teaching, in-venue game deployment, and consignment sales — Publisher shall provide GMG with written notice and thirty (30) days to match or improve any competing offer before Publisher executes an agreement with that third party.",
      },
    ],
  },
  {
    title: "SECTION 12 — NON-DISPARAGEMENT",
    clauses: [
      {
        id: "12.1",
        title: "Mutual Non-Disparagement",
        text: "During the entire term of this agreement and for twelve (12) months following termination, neither party shall make, publish, post, or communicate any statement — oral, written, or digital — that disparages, defames, or materially harms the reputation, business, products, or personnel of the other party.",
      },
      {
        id: "12.2",
        title: "Carve-Out",
        text: "The foregoing shall not prohibit truthful statements made under oath in binding arbitration proceedings as required by law.",
      },
    ],
  },
  {
    title: "SECTION 13 — REPRESENTATIONS AND WARRANTIES",
    clauses: [
      {
        id: "13.1",
        title: "Signatory Authority",
        text: "Each party represents and warrants that the individual signing this agreement has full legal authority to bind that party to the obligations set forth herein.",
      },
      {
        id: "13.2",
        title: "Publisher IP Warranty",
        text: "Publisher represents and warrants that it owns or controls all rights necessary to grant GMG the licenses described in this agreement, and that the exercise of those licenses by GMG will not infringe the intellectual property rights of any third party.",
      },
      {
        id: "13.3",
        title: "No Warranty by GMG",
        text: "GMG makes no warranty, express or implied, regarding sales volume, venue performance, play session rates, or revenue projections. Publisher enters this agreement with full understanding that results are not guaranteed and are subject to market conditions, venue adoption, and consumer behavior.",
      },
    ],
  },
  {
    title: "SECTION 14 — LIMITATION OF LIABILITY AND INDEMNIFICATION",
    clauses: [
      {
        id: "14.1",
        title: "Limitation of Liability",
        text: "GMG's total aggregate liability to Publisher under or in connection with this agreement shall not exceed the total amount remitted by GMG to Publisher in the twelve (12) months immediately preceding the event giving rise to the claim. In no event shall either party be liable for indirect, consequential, incidental, special, exemplary, or punitive damages, regardless of the theory of liability and whether or not such party has been advised of the possibility of such damages.",
      },
      {
        id: "14.2",
        title: "Publisher Indemnification",
        text: "Publisher shall indemnify, defend, and hold harmless GMG and its officers, employees, and agents from and against any third-party claims, damages, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) any claim that Publisher's game content, artwork, or assets infringe the intellectual property rights of a third party; or (b) any breach of Publisher's representations and warranties under this agreement.",
      },
      {
        id: "14.3",
        title: "GMG Indemnification",
        text: "GMG shall indemnify, defend, and hold harmless Publisher from and against any third-party claims, damages, and expenses (including reasonable attorneys' fees) arising out of or related to GMG's platform operations, negligence, or willful misconduct.",
      },
    ],
  },
  {
    title: "SECTION 15 — DISPUTE RESOLUTION AND GOVERNING LAW",
    clauses: [
      {
        id: "15.1",
        title: "Governing Law",
        text: "This agreement shall be governed by and construed in accordance with the laws of the State of Nevada, without regard to its conflict of law provisions.",
      },
      {
        id: "15.2",
        title: "Informal Resolution",
        text: "Before initiating formal arbitration, the parties agree to attempt good faith resolution of any dispute through written notice and a thirty (30) day negotiation period. Either party may initiate this process by delivering written notice to the other party describing the dispute in reasonable detail.",
      },
      {
        id: "15.3",
        title: "Binding Arbitration",
        text: "If the parties fail to resolve the dispute within thirty (30) days of the informal resolution notice, all disputes, claims, or controversies arising out of or relating to this agreement — including its formation, performance, breach, or termination — shall be resolved exclusively through final and binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules, conducted in Clark County, Nevada. The arbitrator's award shall be final and binding and may be entered as a judgment in any court of competent jurisdiction.",
      },
      {
        id: "15.4",
        title: "Fees and Costs",
        text: "Each party shall bear its own legal fees and costs in connection with any arbitration proceeding unless the arbitrator determines that one party's position was frivolous or brought in bad faith, in which case the arbitrator may award fees to the prevailing party.",
      },
      {
        id: "15.5",
        title: "Class Action Waiver",
        text: "The parties waive any right to bring or participate in a class action, collective action, or representative proceeding in connection with any dispute arising under this agreement. All disputes shall be resolved on an individual basis only.",
      },
      {
        id: "15.6",
        title: "No Jury Trial",
        text: "The parties expressly waive any right to a jury trial in connection with any dispute arising under this agreement.",
      },
    ],
  },
  {
    title: "SECTION 16 — GENERAL PROVISIONS",
    clauses: [
      {
        id: "16.1",
        title: "Entire Agreement",
        text: "This agreement, together with Schedule A, constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior discussions, negotiations, representations, emails, and understandings — including any representations made at Dice Tower West or in prior correspondence — whether oral or written.",
      },
      {
        id: "16.2",
        title: "Amendments",
        text: "No amendment to this agreement shall be valid unless made in writing and signed by authorized representatives of both parties, except for modifications made pursuant to Section 1.2.",
      },
      {
        id: "16.3",
        title: "No Exclusivity",
        text: "Nothing in this agreement creates an exclusive arrangement. GMG may carry game titles from any publisher and may deploy any game at any venue without restriction. Publisher may distribute their titles through any other channel without restriction, subject to the non-circumvention obligations of Section 11.",
      },
      {
        id: "16.4",
        title: "Severability",
        text: "If any provision of this agreement is found to be unenforceable or invalid under applicable law, such provision shall be modified to the minimum extent necessary to make it enforceable, and the remainder of this agreement shall continue in full force and effect.",
      },
      {
        id: "16.5",
        title: "Waiver",
        text: "Failure by either party to enforce any provision of this agreement on any occasion shall not constitute a waiver of that party's right to enforce such provision on any future occasion.",
      },
      {
        id: "16.6",
        title: "Notices",
        text: "All formal notices required under this agreement shall be in writing and delivered by email with delivery confirmation or by certified mail to the addresses on record. Email notices are effective upon confirmed delivery.",
      },
      {
        id: "16.7",
        title: "Counterparts and Electronic Signatures",
        text: "This agreement may be executed in counterparts, each of which shall be deemed an original. Electronic signatures, including DocuSign and PDF signatures, shall be considered valid and binding for all purposes.",
      },
      {
        id: "16.8",
        title: "Force Majeure",
        text: "Neither party shall be liable for delays or failures in performance resulting from events beyond their reasonable control, including acts of God, natural disasters, government actions, pandemics, venue closures, or criminal acts of third parties not attributable to the party's negligence.",
      },
    ],
  },
  {
    title: "SCHEDULE A — INVENTORY",
    content: "Inventory is tracked per-game as games are onboarded through the Publisher Portal. Each game submission includes retail price, unit counts, and demo/sale unit designations. Schedule A is maintained digitally within the GMG platform and updated automatically as inventory is added, sold, or returned.",
  },
]

export const KEY_TERMS = [
  { icon: "\u2705", text: "100% of game sale proceeds go to you during pilot" },
  { icon: "\u2705", text: "Your IP stays yours \u2014 GMG creates teaching guides as derivative works" },
  { icon: "\u2705", text: "Free venue placement \u2014 no upfront costs" },
  { icon: "\u2705", text: "Monthly inventory reports and play analytics" },
  { icon: "\u2705", text: "Either party can terminate with 30\u201360 days notice" },
  { icon: "\u2696\uFE0F", text: "Disputes resolved by binding arbitration in Clark County, NV" },
]
