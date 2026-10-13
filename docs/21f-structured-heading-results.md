# Milestone 21F — structured job-heading correction

Date: 2026-10-14. Status: finite offline correction implemented/verified; local/unpublished. Baseline is published `daede22`. This follows [21E's frozen additional-case review](21e-quality-case-results.md); all five original inputs, criteria, references and reviewer judgments remain unchanged. No provider/page/vault/model/private-profile operation, spending, commit or push in this slice. Earlier provider approvals remain consumed.

## User outcome and bounded correction

The existing Results source disclosure now recognizes canonical role headings, adjacent explicit employer/location headings and tightly bounded standalone posting work-mode tags under [decision 0036](architecture/0036-structured-job-heading-evidence.md). Recognition requires a known individual posting URL pattern, generic `Job Posting` title, exactly one complete primary role heading and a bounded adjacent location ending in a literal catalog region. Place words are opaque, never geocoded. Missing/ambiguous/malformed/prose/code-example structures, company geography and work-mode policy do not qualify. A standalone tag cannot override an incompatible existing positive work mode; explicit negatives still produce conflicts. Collections/resources keep their suppression.

The same exact snippet spans appear in manual and assisted evidence disclosure. Existing role priority and filters use the recognized fields after analysis; source guidance mentions title and job-heading roles. No ranking weights or filter/query/source defaults change. No general hiring-prose, alias expansion, quality-role reinterpretation or requirement-grammar change.

## Fixed five-pool replay

All original byte-bound reviews validate before scoring. Compare production local analysis/frontend validation/filtering/grouping against baseline with fixed case-specific references and identical inputs. Original byte contents are checked again after replay. Across 235 candidate appearances (recurring URLs are not distinct vacancies), only the supported analyst opening's role/country/work-mode changes from unknown to supported. Those three field states agree with frozen judgments; zero new field disagreement is introduced. Agreement with one automated reviewer is not accuracy or representative human acceptance.

| Pool | Selected links / groups | Supported-label retention in selected manual/assisted | Strict supported-label retention before → after |
|---|---:|---:|---:|
| Historical software / India / Remote | 33 / 33 | 3 / 3 | 3 / 3 → 3 / 3 |
| A — software with optional tools | 39 / 35 | 5 / 5 | 3 / 5 → 3 / 5 |
| B — software without optional tools | 33 / 32 | 7 / 7 | 1 / 7 → 1 / 7 |
| Quality / India / Remote | 13 / 10 | 0 / 0, no supported denominator | 0 / 0 → 0 / 0 |
| Analyst / Canada / Hybrid | 36 / 36 | 1 / 1 | 0 / 1 → 1 / 1 |

Selected candidate membership is unchanged in every pool. Ordered indices remain identical in manual mode everywhere and in assisted mode for the first four pools. Analyst assisted order changes only by moving its supported opening from position twenty to ten; all other candidates retain relative order. Provider order, grouping and selected needs-review retention are unchanged. Full aggregate reports for the historical, A, B and quality pools are identical to their prior reports (parsed JSON equality, independent of line-ending formatting).

| Analyst replay | Links / groups before → after | First-ten primary supported / needs-review / mismatch before → after | Recognized same-link support before → after |
|---|---:|---:|---:|
| All returned, provider order | 50 / 50 → 50 / 50 | 1 / 7 / 2 → 1 / 7 / 2 | 0 → 1 |
| Selected manual | 36 / 36 → 36 / 36 | 1 / 7 / 2 → 1 / 7 / 2 | 0 → 1 |
| Selected assisted | 36 / 36 → 36 / 36 | 0 / 10 / 0 → 1 / 9 / 0 | 0 → 1 |
| Strict assisted | 0 / 0 → 1 / 1 | 0 / 0 / 0 → 1 / 0 / 0 | 0 → 1 |

Strict displays one group, not ten successful openings; its previously empty share remains null at baseline. No supported alternative is hidden behind an unsupported primary in this case. Analyst field agreement rises role 38/50 → 39/50, country 45/50 → 46/50 and mode 40/50 → 41/50. Remaining disagreements, source scope/collection noise, requirement gaps, suspected identity and unverified freshness retain their 21E meanings.

## Quality-role disputes and remaining shortfall

The two quality needs-review labels excluded by production remain unchanged. One explicit development-and-testing title has adjacent validation duties that the reviewer leaves role-unknown; the other software-engineer title emphasizes automation testing, which the reviewer considers quality work. Neither supplies unambiguous fixed-role metadata under this addition. Preserve those policy disagreements rather than relabeling either input or broadening role support from any testing duty. Quality selected retention remains four of six needs-review labels and zero supported openings.

Frozen full-pool supported yield is still zero for quality and one for analyst. The correction improves recognition and visibility of already-returned evidence, not discovery yield, personal suitability, verified freshness or unique-vacancy coverage. Sparse country/work-mode evidence remains the primary discovery shortfall; additional narrow rules cannot manufacture it. Strict still loses two supported A labels and six B labels. No default changes and no new acquisition follows from this correction.

## Verification and next action

Five new frontend tests cover exact signals across three regions/modes, LF/CRLF forms, absent/ambiguous/adversarial structure, headquarters wording, unrelated/malformed/conflicting tags, explicit exclusions/non-openings, preserved quality-role policy, production analysis/order/filter/reset and safely escaped manual rendering without external resources. Positive/filter tests failed against baseline before correction; unsafe headquarters/competing-mode additions were caught and fixed. The original frozen reviews were not tuned to outcomes.

All **136 frontend and 17 report/review/case checks pass**. Existing ten synthetic diagnostic pools retain **80/80 reviewable labels**; clean-pool evaluation preserves all 49 links/snippets in 41 groups. Production frontend typecheck/build passes. All five frozen-pool baseline/current comparisons and four unchanged full-report comparisons pass. No engine/native/API/schema/storage/dependency/version/setup change, so no new full engine suite or desktop/native/installer rebuild was required. The prior installer lacks this correction; installed interaction/accessibility/resource/CI acceptance remains owner 23. No new layout required a visual redesign; renderer evidence is automated, not interactive native acceptance.

The finite 21F checklist is complete; milestone 21 remains open. **Next concrete action: consolidate the five frozen pools into a finite representative-quality exit checklist and choose one source/query investigation addressing missing job-specific country/work-mode evidence**, rather than adding more rules from these inputs. Keep supported versus needs-review, restrictions, unknowns, freshness and automated-review limits explicit. Any provider/page experiment needs a fresh exact reviewed acquisition scope; both earlier approvals are consumed. Version remains 0.1.0; 17D stays core acceptance complete and release gates remain owner 23. Current changes are local/unpublished; previous publication checkpoint is `daede22`.
