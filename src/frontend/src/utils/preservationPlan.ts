import type { DamageEntry, Structure } from "../backend.d";
import { DamageCategory, DamageSeverity } from "../backend.d";

// ── Types ──────────────────────────────────────────────────────────────────

export type MaintenanceTier = "Emergency" | "Corrective" | "Preventive";

export interface TaskGroup {
  label: string;
  frequency: string;
  tasks: string[];
  requiresSpecialist: boolean;
}

export interface CategoryPlan {
  conditionPct: number;
  taskGroups: TaskGroup[];
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  timeline: string;
  items: string[];
}

export interface UrgencyBuckets {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
}

export interface PreservationPlan {
  maintenanceTier: MaintenanceTier;
  tierReason: string;
  urgencyBuckets: UrgencyBuckets;
  categoryPlans: Record<DamageCategory, CategoryPlan>;
  roadmapPhases: RoadmapPhase[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function detectEraStyle(
  era: string,
): "medieval" | "colonial" | "modern" | "classical" {
  const e = era.toLowerCase();
  if (
    e.includes("medieval") ||
    e.includes("gothic") ||
    e.includes("roman") ||
    e.includes("byzantine")
  )
    return "medieval";
  if (
    e.includes("colonial") ||
    e.includes("18th") ||
    e.includes("17th") ||
    e.includes("victorian") ||
    e.includes("georgian")
  )
    return "colonial";
  if (
    e.includes("modern") ||
    e.includes("20th") ||
    e.includes("contemporary") ||
    e.includes("brutalist") ||
    e.includes("concrete")
  )
    return "modern";
  // Year-based fallback
  const yearMatch = e.match(/\b(1[0-4]\d\d|[5-9]\d\d)\b/);
  if (yearMatch) return "medieval";
  const colonialYear = e.match(/\b(1[5-8]\d\d)\b/);
  if (colonialYear) return "colonial";
  return "classical";
}

function detectClimate(
  location: string,
): "coastal" | "desert" | "tropical" | "mountain" | "temperate" {
  const l = location.toLowerCase();
  if (
    l.includes("coast") ||
    l.includes("sea") ||
    l.includes("ocean") ||
    l.includes("port") ||
    l.includes("beach") ||
    l.includes("bay")
  )
    return "coastal";
  if (
    l.includes("desert") ||
    l.includes("arid") ||
    l.includes("sahara") ||
    l.includes("dryland")
  )
    return "desert";
  if (
    l.includes("tropical") ||
    l.includes("rainforest") ||
    l.includes("jungle") ||
    l.includes("humid")
  )
    return "tropical";
  if (
    l.includes("mountain") ||
    l.includes("alpine") ||
    l.includes("highland") ||
    l.includes("hill") ||
    l.includes("peak")
  )
    return "mountain";
  return "temperate";
}

function eraSpecificMaterial(
  eraStyle: ReturnType<typeof detectEraStyle>,
): string {
  switch (eraStyle) {
    case "medieval":
      return "rubble-core masonry with lime mortar";
    case "colonial":
      return "hand-made brick with lime plaster render";
    case "modern":
      return "reinforced concrete and steel framing";
    case "classical":
      return "ashlar stone with hydraulic lime pointing";
  }
}

function climateNote(climate: ReturnType<typeof detectClimate>): string {
  switch (climate) {
    case "coastal":
      return "salt-laden marine air accelerates metal corrosion and masonry spalling";
    case "desert":
      return "extreme thermal cycling between day and night causes micro-crack propagation";
    case "tropical":
      return "high humidity and biological growth accelerate surface decay and subsoil movement";
    case "mountain":
      return "freeze-thaw cycling drives frost heave in foundations and joint failure";
    case "temperate":
      return "seasonal moisture variation promotes efflorescence and slow biological colonisation";
  }
}

// ── Category Plan Generation ───────────────────────────────────────────────

function buildFoundationPlan(
  conditionPct: number,
  entries: DamageEntry[],
): TaskGroup[] {
  const groups: TaskGroup[] = [];
  const hasHighSeverity = entries.some(
    (e) =>
      e.category === DamageCategory.foundation &&
      e.severity === DamageSeverity.high,
  );

  if (conditionPct < 50) {
    groups.push({
      label: "Emergency Underpinning",
      frequency: "Immediate — within 2 weeks",
      tasks: [
        "Engage a geotechnical engineer to conduct foundation load-bearing capacity assessment",
        "Install temporary shoring and acrow props to prevent progressive collapse",
        "Excavate trial pits at 3-metre intervals around the perimeter to expose footing depth",
        "Apply cementitious grout injection under settled bearing slabs",
        "Monitor settlement daily using precision survey pins for minimum 30 days",
      ],
      requiresSpecialist: true,
    });
    groups.push({
      label: "Crack Grouting & Stitching",
      frequency: "Once — then quarterly inspection",
      tasks: [
        "Map all active cracks using tell-tale gauge sensors before any grouting begins",
        "Inject low-pressure epoxy resin into structural cracks exceeding 0.5 mm width",
        "Install stainless steel helical ties across stepped masonry cracks",
        "Apply flexible polyurethane sealant to hairline cracks to prevent moisture ingress",
        "Photograph and catalogue all crack locations for before/after comparison record",
      ],
      requiresSpecialist: true,
    });
    groups.push({
      label: "Drainage Overhaul",
      frequency: "Annually — post-rainy season",
      tasks: [
        "Install French drain system with perforated pipe at footing level, graded to a sump",
        "Re-grade surface ground away from structure at minimum 1:50 fall for 3 metres",
        "Apply crystalline waterproofing slurry to all exposed below-grade masonry faces",
        "Install tanking membrane on inside face of basement/substructure walls",
        "Clear existing drainage channels of silt, vegetation roots, and debris",
      ],
      requiresSpecialist: false,
    });
  } else if (conditionPct < 75 || hasHighSeverity) {
    groups.push({
      label: "Crack Monitoring Programme",
      frequency: "Monthly",
      tasks: [
        "Install calibrated tell-tale gauges across all visible cracks and record readings",
        "Photograph crack progression under consistent lighting conditions each visit",
        "Log any new cracks with precise measurements and GPS co-ordinates in the site register",
        "Review 6-month trend data to determine whether movement is active or dormant",
        "Submit quarterly monitoring report to the appointed heritage conservation officer",
      ],
      requiresSpecialist: false,
    });
    groups.push({
      label: "Subsurface Drainage Maintenance",
      frequency: "Bi-annually",
      tasks: [
        "CCTV survey of underground drainage runs to identify root intrusion and collapse",
        "Jet-wash existing drainage gullies and inspection chambers",
        "Re-seal any leaking joints in the below-grade drainage network",
        "Check and empty silt traps in all interceptor chambers",
      ],
      requiresSpecialist: false,
    });
    groups.push({
      label: "Soil Stabilization",
      frequency: "Every 3-5 years",
      tasks: [
        "Conduct topographic and sub-surface ground survey to identify zones of movement",
        "Apply lime stabilisation to cohesive soils within the zone of influence",
        "Install root barriers to prevent tree root encroachment within 5 metres of the structure",
        "Re-compact any disturbed subsoil adjacent to external foundations",
      ],
      requiresSpecialist: true,
    });
  }

  groups.push({
    label: "Periodic Load Assessment",
    frequency: "Every 5 years",
    tasks: [
      "Commission a structural engineer to verify that current loading does not exceed original design capacity",
      "Review any additions or alterations that may have altered load distribution",
      "Check for evidence of differential settlement across all corners using precise levelling",
      "Inspect bearing pads and anchor bolts for corrosion or deterioration",
    ],
    requiresSpecialist: true,
  });
  groups.push({
    label: "Anti-vibration Measures",
    frequency: "Quarterly checks — permanent installation",
    tasks: [
      "Install vibration monitoring sensors if the structure is within 50 m of traffic or construction",
      "Review vibration data thresholds against BS 7385 or equivalent heritage standard",
      "Install anti-vibration isolation pads beneath any mechanical plant near the structure",
      "Coordinate with local authority on road works scheduling within the buffer zone",
    ],
    requiresSpecialist: false,
  });

  return groups;
}

function buildWallsPlan(
  conditionPct: number,
  entries: DamageEntry[],
): TaskGroup[] {
  const groups: TaskGroup[] = [];
  const hasHighSeverity = entries.some(
    (e) =>
      e.category === DamageCategory.walls && e.severity === DamageSeverity.high,
  );

  if (conditionPct < 50) {
    groups.push({
      label: "Structural Repointing",
      frequency: "One-off — then 10-year review",
      tasks: [
        "Rake out all failed mortar joints to a depth of 25 mm using non-impact hand tools only",
        "Analyse existing mortar composition before specifying replacement mix",
        "Repoint using NHL 3.5 natural hydraulic lime mortar with compatible aggregate",
        "Apply mortar in two stages — scratch coat followed by finish coat after initial set",
        "Protect newly repointed sections from rain and frost for minimum 7 days with hessian covers",
      ],
      requiresSpecialist: true,
    });
    groups.push({
      label: "Spalling & Delamination Repair",
      frequency: "Once — then annual survey",
      tasks: [
        "Identify all spalled areas using a rubber mallet tap test to find hollow zones",
        "Remove loose or delaminating material using wooden wedges and compressed air",
        "Consolidate friable stone surfaces with Paraloid B-72 in acetone (5–10% solution)",
        "Fill spalls with lime mortar or matching stone inserts no larger than 300 mm²",
        "Record all repaired areas on a masonry elevation drawing for future reference",
      ],
      requiresSpecialist: true,
    });
    groups.push({
      label: "Salt Crystallisation Treatment",
      frequency: "Annual — spring and autumn",
      tasks: [
        "Map visible efflorescence and salt bloom using UV light survey at dusk",
        "Remove salt crusts by dry-brushing; never use water on active salt-affected surfaces",
        "Apply desalination poultice (kaolin and distilled water) to affected zones for 48 hours",
        "Monitor salt moisture content using non-destructive impedance sensors",
        "Install sacrificial lime render render to walls where salt migration cannot be stopped at source",
      ],
      requiresSpecialist: true,
    });
  } else if (conditionPct < 75 || hasHighSeverity) {
    groups.push({
      label: "Biocide Treatment",
      frequency: "Bi-annually",
      tasks: [
        "Apply D/2 Biological Solution or equivalent biocide to all lichen, algae, and moss growths",
        "Allow 3–4 weeks dwell time before gentle rinsing with low-pressure water",
        "Physically remove larger growths with non-metallic brushes prior to chemical treatment",
        "Re-apply biocide 6 months after first treatment to address regrowth",
      ],
      requiresSpecialist: false,
    });
    groups.push({
      label: "Selective Joint Repointing",
      frequency: "Every 3 years",
      tasks: [
        "Probe all accessible mortar joints with a thin steel rule to assess depth of failure",
        "Prioritise repointing on north-facing and below-DPC sections first",
        "Match mortar composition to existing blend — avoid OPC mortars on historic masonry",
        "Ensure all repointing is slightly recessed (2 mm) to avoid water bridging",
      ],
      requiresSpecialist: false,
    });
    groups.push({
      label: "Weatherproofing Application",
      frequency: "Every 5 years",
      tasks: [
        "Apply breathable silicone water repellent cream (not film-forming) to all exposed faces",
        "Test repellent compatibility with existing lime render on a 1 m² trial patch first",
        "Mask all windows, metal fixings, and vegetation before application",
        "Document all product datasheets in the structure's conservation record",
      ],
      requiresSpecialist: false,
    });
  }

  groups.push({
    label: "Surface Cleaning Programme",
    frequency: "Annual",
    tasks: [
      "Remove graffiti using age-appropriate solvent (avoid alkaline strippers on limestone)",
      "Clean soot and atmospheric soiling with DOFF steam or Torc conservation clean system",
      "Inspect for iron staining from ferrous cramps or fixings and treat with oxalic acid poultice",
      "Document all cleaning methods in the conservation log for future reference",
    ],
    requiresSpecialist: false,
  });
  groups.push({
    label: "Condition Survey",
    frequency: "Annual",
    tasks: [
      "Conduct full photographic elevation survey on a 2 m × 2 m grid",
      "Update the masonry condition map with colour-coded zones (good/fair/poor/critical)",
      "Measure crack widths and note any change from previous year's record",
      "Submit updated survey to the conservation architect for review",
    ],
    requiresSpecialist: false,
  });

  return groups;
}

function buildRoofPlan(
  conditionPct: number,
  entries: DamageEntry[],
): TaskGroup[] {
  const groups: TaskGroup[] = [];
  const hasHighSeverity = entries.some(
    (e) =>
      e.category === DamageCategory.roof && e.severity === DamageSeverity.high,
  );

  if (conditionPct < 50) {
    groups.push({
      label: "Emergency Leak Sealing",
      frequency: "Immediate — within 1 week",
      tasks: [
        "Apply temporary waterproofing membrane (Aquaseal or equivalent) over all active leak areas",
        "Install internal catch containers and protective covers over culturally sensitive interiors",
        "Erect scaffold access for a specialist roofer to assess full extent of failure",
        "Identify all missing, displaced, or cracked tiles and tag them on a roof plan drawing",
        "Commission emergency structural survey of ridge beam and principal rafters",
      ],
      requiresSpecialist: true,
    });
    groups.push({
      label: "Rafter & Structural Timber Replacement",
      frequency: "One-off — with ongoing 5-year inspection",
      tasks: [
        "Probe all accessible timbers for rot using a sharp scriber — soft timber must be replaced",
        "Commission a timber decay survey using borescope inspection of inaccessible areas",
        "Specify replacement timbers to match original species, grain, and profile",
        "Apply Boron-based fungicide preservative to all replacement and adjacent timbers",
        "Ensure all new fixings are hot-dip galvanised or stainless steel to prevent staining",
      ],
      requiresSpecialist: true,
    });
    groups.push({
      label: "Insulation & Ventilation Overhaul",
      frequency: "One-off — then 10-year review",
      tasks: [
        "Remove all existing insulation and inspect for condensation damage and pest infestation",
        "Install breathable Thermafleece or equivalent natural-fibre insulation to avoid vapour trapping",
        "Ensure minimum 50 mm ventilation gap is maintained at eaves and ridge",
        "Install CO₂ monitoring sensors in closed roof spaces to detect biological activity",
      ],
      requiresSpecialist: true,
    });
  } else if (conditionPct < 75 || hasHighSeverity) {
    groups.push({
      label: "Tile & Slate Re-fixing",
      frequency: "Bi-annually — pre-winter and post-winter",
      tasks: [
        "Walk roof (with appropriate fall-arrest equipment) and lift any loose or slipped units",
        "Re-bed any loose tiles using lime and sand mortar — avoid OPC bedding",
        "Replace any split, cracked, or missing units with matching material from approved salvage source",
        "Check verge mortar fillets and re-point where cracked or missing",
      ],
      requiresSpecialist: false,
    });
    groups.push({
      label: "Flashings Inspection & Repair",
      frequency: "Annual",
      tasks: [
        "Inspect all lead, zinc, or copper flashings for cracking, splitting, or lifting",
        "Re-dress any lifted flashings using a dresser — do not use bituminous compounds on heritage roofs",
        "Re-point stepped flashing chase pockets using lime mortar",
        "Replace any corroded or perforated flashing sections with matching material",
      ],
      requiresSpecialist: true,
    });
    groups.push({
      label: "Gutter & Downpipe Maintenance",
      frequency: "Quarterly",
      tasks: [
        "Clear all gutters of leaves, silt, and vegetation at the start of each season",
        "Check fall of gutter runs — minimum 1:600 gradient towards outlets",
        "Inspect and repair any leaking joints in cast iron or lead gutter sections",
        "Ensure downpipe shoes discharge to a sealed drain — no free discharge against masonry",
      ],
      requiresSpecialist: false,
    });
  }

  groups.push({
    label: "Annual Roof Inspection",
    frequency: "Annual — October (before winter)",
    tasks: [
      "Full aerial inspection using drone with 4K camera to identify missing or damaged units",
      "Check all ridge and hip tile bedding for cracking or movement",
      "Test all roof outlets are clear by running water from a hose for 60 seconds",
      "Update roof condition schedule drawing with year stamp",
    ],
    requiresSpecialist: false,
  });
  groups.push({
    label: "Moss & Biological Growth Removal",
    frequency: "Annual — spring",
    tasks: [
      "Apply zinc strip or biocide strip to ridge tiles to prevent biological re-establishment",
      "Remove established moss growth by hand-scraping followed by biocide spray",
      "Never use high-pressure washing — it forces water under laps and damages surfaces",
      "Bag and dispose of all removed biological material off-site",
    ],
    requiresSpecialist: false,
  });

  return groups;
}

function buildGeneralPlan(entries: DamageEntry[]): TaskGroup[] {
  const groups: TaskGroup[] = [];
  const hasHighSeverity = entries.some(
    (e) => e.severity === DamageSeverity.high,
  );

  if (hasHighSeverity) {
    groups.push({
      label: "Immediate Safety Fencing",
      frequency: "Immediate — within 48 hours",
      tasks: [
        "Erect Heras security fencing with hazard signage at 5 m exclusion radius around critical zones",
        "Notify the local heritage and planning authority of the hazard within 24 hours",
        "Engage a structural engineer for a rapid first assessment within 72 hours",
        "Record and photograph all dangerous elements before any access is allowed",
        "Install overhead netting to prevent falling debris endangering public access routes",
      ],
      requiresSpecialist: true,
    });
  }

  groups.push({
    label: "Site Security Audit",
    frequency: "Monthly",
    tasks: [
      "Inspect perimeter fencing and gates for breaches, damage, or unauthorised access points",
      "Check all window and door openings for any sign of forced entry or vandalism",
      "Test any installed motion-sensor lighting and CCTV cameras for correct operation",
      "Update the site access register and ensure all key holders are current",
    ],
    requiresSpecialist: false,
  });
  groups.push({
    label: "Vegetation Management",
    frequency: "Quarterly",
    tasks: [
      "Cut back all self-sown trees and shrubs growing within 3 m of the structure",
      "Remove ivy and climbing plants from masonry — never by mechanical stripping; cut at root first",
      "Treat stumps with systemic herbicide glyphosate within 15 minutes of cutting",
      "Maintain a clear 1 m gravel margin around the base of external walls to control moisture",
    ],
    requiresSpecialist: false,
  });
  groups.push({
    label: "Drainage Inspection",
    frequency: "Bi-annually",
    tasks: [
      "Walk all surface drainage channels and check for blockage, erosion, or silting",
      "Clear all gully gratings and inspection chamber covers of debris",
      "Check that all surface water is directed away from the structure at correct fall",
      "Report any evidence of rising damp or sub-surface flooding to the conservation officer",
    ],
    requiresSpecialist: false,
  });

  return groups;
}

// ── Roadmap Phase Generation ───────────────────────────────────────────────

function generateRoadmapPhases(
  structure: Structure,
  entries: DamageEntry[],
  tier: MaintenanceTier,
): RoadmapPhase[] {
  const eraStyle = detectEraStyle(structure.era);
  const climate = detectClimate(structure.location);
  const material = eraSpecificMaterial(eraStyle);
  const climateRisk = climateNote(climate);
  const name = structure.name;

  const dominantCategories = [
    ...new Set(
      entries
        .filter((e) => e.severity !== DamageSeverity.low)
        .map((e) => e.category),
    ),
  ];
  const hasCritical = tier === "Emergency";

  const phase1Items: string[] = [
    `Commission a licensed heritage conservation engineer for a full structural survey of ${name}`,
    `Document all visible deterioration at ${name} using photogrammetry and orthographic mapping`,
    `Apply emergency stabilisation to the most critical sections using ${material}-compatible materials`,
    hasCritical
      ? `Erect temporary propping and exclusion zones at ${name} as a matter of immediate priority`
      : `Establish a baseline condition database for ${name} including all existing crack and damage records`,
    "Notify the relevant heritage authority and obtain any necessary emergency consent for stabilisation works",
    climateRisk.startsWith("salt") || climate === "coastal"
      ? `Commission marine-environment corrosion survey of all embedded metal fixings at ${name}`
      : "Install temporary weather protection over the most exposed roof and wall sections",
  ];

  const phase2Items: string[] = [
    `Extract material samples from ${name}'s ${material} fabric for laboratory mortar and aggregate analysis`,
    `Research original construction records, historical maps, and building surveys specific to ${name}`,
    `Develop a phased Conservation Management Plan for ${name} approved by the relevant heritage authority`,
    `Specify all replacement materials to match originals — ${material} must not be substituted with Portland cement products`,
    dominantCategories.includes(DamageCategory.walls)
      ? `Commission a salt and moisture profile survey of ${name}'s walls to guide repointing specification`
      : `Undertake measured survey drawings (1:50) of all elevations, plans, and sections of ${name}`,
    `Brief local contractors on ${structure.location}-specific environmental risks, particularly where ${climateRisk}`,
  ];

  const phase3Items: string[] = [
    `Begin active conservation works at ${name} using only reversible, period-appropriate interventions`,
    `Install a continuous environmental monitoring network inside ${name}: temperature, relative humidity, and vibration sensors`,
    dominantCategories.includes(DamageCategory.foundation)
      ? `Install precision settlement monitoring stations at all four corners of ${name} and review monthly`
      : `Establish a 5-year inspection schedule for all ${material} fabric at ${name}`,
    `Train a dedicated site maintenance team in ${eraStyle === "medieval" ? "lime mortar" : eraStyle === "colonial" ? "lime plaster and brick" : "concrete repair"} techniques specific to ${name}`,
    `Engage the local community in a monitoring volunteer programme to extend the eyes-on-site presence at ${name}`,
    climate === "tropical" || climate === "coastal"
      ? `Install stainless-steel fixings and marine-grade protective coatings on all exposed metalwork at ${name}`
      : `Apply breathable water-repellent treatment to all exposed ${material} surfaces at ${name}`,
  ];

  const phase4Items: string[] = [
    `Develop an interpretive heritage trail and signage programme that tells the authentic story of ${name}`,
    `Archive all conservation records, material analyses, and survey drawings for ${name} in a certified digital repository`,
    `Review and update ${name}'s Conservation Management Plan on a 5-year cycle in response to condition monitoring data`,
    `Train local custodians in early defect identification and routine maintenance specific to ${material}`,
    `Publish an open-access condition report for ${name} to build community stewardship and attract conservation funding`,
    climate === "mountain" || climate === "temperate"
      ? `Implement a seasonal maintenance calendar for ${name} aligned with freeze-thaw risk windows`
      : `Implement a year-round biological growth management programme tailored to ${structure.location}'s climate`,
  ];

  return [
    {
      phase: "Phase 1",
      title: "Emergency Assessment & Stabilisation",
      timeline: "0–3 months",
      items: phase1Items,
    },
    {
      phase: "Phase 2",
      title: "Materials Analysis & Conservation Planning",
      timeline: "3–12 months",
      items: phase2Items,
    },
    {
      phase: "Phase 3",
      title: "Active Restoration & Monitoring",
      timeline: "1–5 years",
      items: phase3Items,
    },
    {
      phase: "Phase 4",
      title: "Long-term Stewardship & Community Education",
      timeline: "Ongoing",
      items: phase4Items,
    },
  ];
}

// ── Urgency Bucket Assembly ────────────────────────────────────────────────

function deriveUrgencyBuckets(
  structure: Structure,
  entries: DamageEntry[],
  categoryPlans: Record<DamageCategory, CategoryPlan>,
): UrgencyBuckets {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];

  const categorySeverity: Record<DamageCategory, DamageSeverity | null> = {
    [DamageCategory.foundation]: null,
    [DamageCategory.walls]: null,
    [DamageCategory.roof]: null,
    [DamageCategory.general]: null,
  };

  for (const e of entries) {
    const cat = e.category as DamageCategory;
    const currentWorst = categorySeverity[cat];
    if (
      currentWorst === null ||
      e.severity === DamageSeverity.high ||
      (e.severity === DamageSeverity.medium &&
        currentWorst === DamageSeverity.low)
    ) {
      categorySeverity[cat] = e.severity as DamageSeverity;
    }
  }

  const conditionMap: Record<DamageCategory, number> = {
    [DamageCategory.foundation]: Number(structure.currentCondition.foundation),
    [DamageCategory.walls]: Number(structure.currentCondition.walls),
    [DamageCategory.roof]: Number(structure.currentCondition.roof),
    [DamageCategory.general]: 100,
  };

  for (const cat of Object.values(DamageCategory)) {
    const pct = conditionMap[cat];
    const worstSeverity = categorySeverity[cat];
    const plan = categoryPlans[cat];
    if (!plan.taskGroups.length) continue;

    const firstTaskGroup = plan.taskGroups[0];
    const label = firstTaskGroup.label;
    const firstTask = firstTaskGroup.tasks[0];
    const summary = `${label}: ${firstTask.slice(0, 80)}${firstTask.length > 80 ? "…" : ""}`;

    if (pct < 50 || worstSeverity === DamageSeverity.high) {
      immediate.push(summary);
    } else if (pct < 75 || worstSeverity === DamageSeverity.medium) {
      shortTerm.push(summary);
    } else {
      longTerm.push(summary);
    }
  }

  // Add one specific task to each bucket from deeper task groups
  const allGroups = Object.values(categoryPlans).flatMap((p) => p.taskGroups);
  for (const group of allGroups.slice(1, 4)) {
    if (group.tasks.length > 1) {
      const task = group.tasks[1];
      const item = `${group.label}: ${task.slice(0, 90)}${task.length > 90 ? "…" : ""}`;
      if (
        conditionMap.foundation < 50 ||
        conditionMap.walls < 50 ||
        conditionMap.roof < 50
      ) {
        if (immediate.length < 5) immediate.push(item);
      } else if (
        conditionMap.foundation < 75 ||
        conditionMap.walls < 75 ||
        conditionMap.roof < 75
      ) {
        if (shortTerm.length < 5) shortTerm.push(item);
      } else {
        if (longTerm.length < 5) longTerm.push(item);
      }
    }
  }

  return { immediate, shortTerm, longTerm };
}

// ── Main Export ────────────────────────────────────────────────────────────

export function generatePreservationPlan(
  structure: Structure,
  entries: DamageEntry[],
): PreservationPlan {
  const foundationPct = Number(structure.currentCondition.foundation);
  const wallsPct = Number(structure.currentCondition.walls);
  const roofPct = Number(structure.currentCondition.roof);
  const avgCondition = (foundationPct + wallsPct + roofPct) / 3;
  const highCount = entries.filter(
    (e) => e.severity === DamageSeverity.high,
  ).length;

  // Tier determination
  let maintenanceTier: MaintenanceTier;
  let tierReason: string;
  if (avgCondition < 40 || highCount >= 3) {
    maintenanceTier = "Emergency";
    tierReason =
      avgCondition < 40
        ? `Average structural condition is critically low at ${Math.round(avgCondition)}% — immediate intervention is required to prevent irreversible loss.`
        : `${highCount} high-severity damage entries indicate active, accelerating deterioration requiring urgent professional response.`;
  } else if (avgCondition < 65 || highCount >= 1) {
    maintenanceTier = "Corrective";
    tierReason =
      avgCondition < 65
        ? `Average structural condition is ${Math.round(avgCondition)}% — corrective works should begin within the next 3–6 months to prevent escalation.`
        : "One or more high-severity damage entries highlight specific vulnerabilities that require targeted corrective treatment.";
  } else {
    maintenanceTier = "Preventive";
    tierReason = `Average structural condition is ${Math.round(avgCondition)}% — the structure is in a stable state and benefits from a proactive preventive maintenance regime.`;
  }

  // Category plans
  const categoryPlans: Record<DamageCategory, CategoryPlan> = {
    [DamageCategory.foundation]: {
      conditionPct: foundationPct,
      taskGroups: buildFoundationPlan(foundationPct, entries),
    },
    [DamageCategory.walls]: {
      conditionPct: wallsPct,
      taskGroups: buildWallsPlan(wallsPct, entries),
    },
    [DamageCategory.roof]: {
      conditionPct: roofPct,
      taskGroups: buildRoofPlan(roofPct, entries),
    },
    [DamageCategory.general]: {
      conditionPct: 100,
      taskGroups: buildGeneralPlan(entries),
    },
  };

  const urgencyBuckets = deriveUrgencyBuckets(
    structure,
    entries,
    categoryPlans,
  );
  const roadmapPhases = generateRoadmapPhases(
    structure,
    entries,
    maintenanceTier,
  );

  return {
    maintenanceTier,
    tierReason,
    urgencyBuckets,
    categoryPlans,
    roadmapPhases,
  };
}

// ── Schedule Helpers ───────────────────────────────────────────────────────

export type ScheduleFrequency =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Annual"
  | "5-Yearly"
  | "As needed";

export interface ScheduleItem {
  task: string;
  category: string;
  requiresSpecialist: boolean;
}

export function buildMaintenanceSchedule(
  plan: PreservationPlan,
): Record<ScheduleFrequency, ScheduleItem[]> {
  const schedule: Record<ScheduleFrequency, ScheduleItem[]> = {
    Daily: [],
    Weekly: [],
    Monthly: [],
    Quarterly: [],
    Annual: [],
    "5-Yearly": [],
    "As needed": [],
  };

  const freqMap: Record<string, ScheduleFrequency> = {
    annual: "Annual",
    quarterly: "Quarterly",
    monthly: "Monthly",
    weekly: "Weekly",
    daily: "Daily",
    "bi-annually": "Quarterly",
    "every 5 years": "5-Yearly",
    "every 3-5 years": "5-Yearly",
    "every 3 years": "5-Yearly",
    "every 10-year": "5-Yearly",
  };

  for (const [cat, plan_] of Object.entries(plan.categoryPlans)) {
    for (const group of plan_.taskGroups) {
      const freq = group.frequency.toLowerCase();
      let resolved: ScheduleFrequency = "As needed";
      for (const [key, val] of Object.entries(freqMap)) {
        if (freq.includes(key)) {
          resolved = val;
          break;
        }
      }
      if (group.tasks.length > 0) {
        schedule[resolved].push({
          task: `${group.label}: ${group.tasks[0].slice(0, 70)}${group.tasks[0].length > 70 ? "…" : ""}`,
          category: cat,
          requiresSpecialist: group.requiresSpecialist,
        });
      }
    }
  }

  return schedule;
}
