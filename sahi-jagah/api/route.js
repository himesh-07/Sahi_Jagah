// POST /api/route
// Classifies a free-text grievance to a jurisdiction and drafts the complaint.
// Runs on Vercel's Node runtime. No dependencies.

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const CENTRAL = [
  "Ministry of Railways (incl. IRCTC bookings, refunds, catering)",
  "Employees' Provident Fund Organisation (EPFO)",
  "Employees' State Insurance Corporation (ESIC)",
  "Department of Financial Services — Banking",
  "Department of Financial Services — Insurance",
  "Department of Posts",
  "Ministry of Petroleum & Natural Gas (LPG connections and subsidy)",
  "Department of Telecommunications",
  "Central Board of Direct Taxes (Income Tax)",
  "Central Board of Indirect Taxes & Customs (GST, Customs)",
  "Ministry of External Affairs — Passport Services (CPV Division)",
  "Unique Identification Authority of India (Aadhaar)",
  "Department of Pension & Pensioners' Welfare",
  "Ministry of Defence — Ex-servicemen and defence pensions",
  "Ministry of Civil Aviation",
  "Ministry of Road Transport & Highways (National Highways, tolls, VAHAN/SARATHI systems)",
  "Department of Consumer Affairs",
  "Department of School Education & Literacy",
  "University Grants Commission / AICTE (higher education institutions)",
  "National Health Authority (Ayushman Bharat PM-JAY)",
  "Department of Social Justice & Empowerment (National Scholarship Portal)",
  "Ministry of Corporate Affairs",
  "Ministry of Electronics & Information Technology",
  "Department of Food & Public Distribution (national PDS policy)",
  "Ministry of Rural Development (MGNREGA, PMAY-Gramin — central policy)",
  "Ministry of Housing & Urban Affairs (PMAY-Urban — central policy)",
  "Ministry of Women & Child Development",
  "Ministry of Labour & Employment"
];

// Matters that CPGRAMS routinely receives but cannot act on.
const STATE_SUBJECTS = [
  "water supply, sewerage, drainage",
  "local roads, potholes, streetlights, garbage collection",
  "property tax and municipal billing",
  "birth, death, marriage, caste, income, domicile and residence certificates",
  "ration card issue, correction, and the conduct of a fair price shop",
  "land records, mutation, registration of property",
  "electricity distribution, metering and billing (state DISCOMs)",
  "police, law and order, FIR registration",
  "state transport, RTO, driving licences and vehicle registration desks",
  "state-run schools, colleges, hospitals and dispensaries",
  "state revenue, tehsil and panchayat offices"
];

// Matters with a dedicated statutory venue that works better than a grievance portal.
const SPECIAL_VENUES = [
  "Bank service failure unresolved for 30 days → RBI Ombudsman (cms.rbi.org.in)",
  "Insurance claim rejection or delay → IRDAI Bima Bharosa, then Insurance Ombudsman",
  "Listed company, broker, mutual fund → SEBI SCORES",
  "Mobile, broadband, DTH billing or service → operator's appellate authority, then TRAI",
  "Defective goods, refunds, e-commerce → National Consumer Helpline 1915, then Consumer Commission",
  "A request for information or documents, not a complaint → this is an RTI application, not a grievance"
];

const SYSTEM = `You route Indian citizens' grievances to the office that actually has jurisdiction, and you draft the complaint.

Central ministries and bodies reachable through CPGRAMS:
${CENTRAL.map(c => "- " + c).join("\n")}

Subjects that are STATE responsibilities. CPGRAMS cannot act on these; they must go to the state portal or municipal body:
${STATE_SUBJECTS.map(c => "- " + c).join("\n")}

Matters with a better statutory venue than a grievance portal:
${SPECIAL_VENUES.map(c => "- " + c).join("\n")}

Rules:
- Pick exactly one department. Prefer the specific body over the parent ministry.
- Set is_state_subject true when the substance is a state responsibility, even if a central scheme funds it.
- Set wrong_venue true when CPGRAMS is the wrong forum: a state subject, a special venue above, or an RTI request. Then name the correct venue precisely, with the state's name filled in where relevant.
- confidence is honest: below 0.6 when the description is genuinely ambiguous.
- reasoning is one or two plain sentences a citizen understands. Never cite rules or section numbers. Say what in their description decided it.
- alternates: two other plausible offices, most likely first.
- draft_local: the complaint in the SAME language and script the citizen used. Warm, plain, first person.
- draft_en: formal English in this exact structure — "To,\\n<office>\\n\\nSubject: <one line>\\n\\nSir/Madam,\\n\\n<chronology, dated, factual, no adjectives>\\n\\nRelief sought: <specific and actionable>\\n\\nYours faithfully,\\n[Your name]\\n[Address · Mobile · Email]". Include any reference number the citizen gave. Never invent facts, names, amounts or dates the citizen did not provide.
- Never use or invent Aadhaar, PAN, account or card numbers.

Reply with JSON only, no markdown fence:
{"department":"","category":"","subordinate_office":"","is_state_subject":false,"confidence":0.0,"reasoning":"","alternates":["",""],"wrong_venue":false,"wrong_venue_reason":"","correct_venue":"","local_language":"","draft_local":"","draft_en":""}`;

const FALLBACK = {
  department: "Employees' Provident Fund Organisation (EPFO)",
  category: "Provident fund — claim settlement",
  subordinate_office: "Regional PF Commissioner's office",
  is_state_subject: false,
  confidence: 0.86,
  reasoning: "You described a provident fund claim that has been pending without a status change, which is handled by EPFO and not by your employer or a state office.",
  alternates: ["Ministry of Labour & Employment", "Employees' State Insurance Corporation (ESIC)"],
  wrong_venue: false,
  wrong_venue_reason: "",
  correct_venue: "",
  local_language: "Hindi",
  draft_local: "मेरा भविष्य निधि का दावा दो महीने से लंबित है और पोर्टल पर स्थिति नहीं बदल रही है। कृपया दावे की जाँच कर के निपटान किया जाए।",
  draft_en: "To,\nThe Regional Provident Fund Commissioner\n\nSubject: Provident fund claim pending beyond the prescribed period\n\nSir/Madam,\n\nI submitted a provident fund claim through the member portal. Since then the status has not changed and no communication has been received from the office.\n\nRelief sought: Examination and settlement of the claim, and communication of the reason for the delay.\n\nYours faithfully,\n[Your name]\n[Address · Mobile · Email]",
  fallback: true
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { story = "", state = "", since = "", refno = "" } = req.body || {};
  if (!story.trim()) return res.status(400).json({ error: "Empty description" });

  if (!process.env.OPENAI_API_KEY) return res.status(200).json(FALLBACK);

  const user = [
    "Citizen's description: " + story.trim(),
    "State: " + (state || "not given"),
    "Problem began: " + (since || "not given"),
    "Reference number given: " + (refno || "none")
  ].join("\n");

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user }
        ]
      })
    });

    if (!r.ok) return res.status(200).json(FALLBACK);
    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const out = JSON.parse(raw.replace(/```json|```/g, "").trim());
    out.fallback = false;
    return res.status(200).json(out);
  } catch (e) {
    return res.status(200).json(FALLBACK);
  }
}
