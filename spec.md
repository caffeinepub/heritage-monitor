# Heritage Monitor

## Current State

The app has a fully built 3-tab structure detail view (Overview, Damage Log, Preservation Guide). The Preservation Guide (`PreservationTab.tsx`) currently:
- Fetches generic per-category recommendations from the backend (single paragraph per category: Foundation, Walls, Roof, General)
- Shows a fixed 4-phase conservation roadmap with static bullet points that are identical for every structure
- Displays 4 static "Core Conservation Principles" cards

The content is not structure-specific -- every structure sees the exact same roadmap and principles regardless of its name, era, location, condition, or damage entries.

## Requested Changes (Diff)

### Add
- Per-structure maintenance type classification: derive a maintenance tier (Preventive / Corrective / Emergency) from the structure's current condition scores and damage entry severity distribution; show it prominently at the top of the guide
- Expanded per-category recommendation panels: each category card should show not just a paragraph but also a structured list of specific maintenance tasks (what to do, frequency, tools/materials, specialist required), derived from the structure's actual condition value for that component
- Structure-specific roadmap: the 4-phase roadmap bullet points must vary based on the structure's era (material assumptions), location (climate/environment hints), overall condition level, and dominant damage categories
- Maintenance urgency timeline: a visual indicator showing which tasks are immediate (0-3 months), short-term (3-12 months), and long-term (1+ years) based on severity of damage entries

### Modify
- `PreservationTab.tsx`: replace static roadmap and principles with dynamically computed content that uses the `structure` prop (name, era, location, originalCondition, currentCondition) and damage entries to generate varied output
- Category recommendation cards: expand from a single paragraph to a multi-section card with header, description paragraph, and a checklist of specific tasks with frequency labels
- Intro panel: include the derived maintenance tier badge and a short severity-aware summary sentence

### Remove
- Static `ROADMAP_STEPS` constant (replace with a function that generates steps based on structure data)
- Static "Core Conservation Principles" generic cards (replace with a structure-aware maintenance schedule summary)

## Implementation Plan

1. Create a utility function `generatePreservationPlan(structure, entries)` in the frontend that:
   - Computes maintenance tier (Emergency / Corrective / Preventive) from avg condition and high-severity entry count
   - Generates per-category task lists keyed to the component's condition value (e.g. Foundation at 40% gets different tasks than Foundation at 80%)
   - Generates era-aware and location-aware roadmap phases
   - Returns urgency buckets (immediate / short-term / long-term) for tasks

2. Update `PreservationTab.tsx` to:
   - Call the utility with `structure` and `entries` data
   - Render the maintenance tier badge in the intro panel
   - Render expanded category cards with task checklists
   - Render the dynamically generated roadmap phases
   - Render urgency timeline strip at the bottom

3. All content variation must be deterministic (no random) so re-renders are stable; variation comes from the structure's data fields.
