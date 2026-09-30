# Public search criteria

The Discover page offers an initial, intentionally limited catalog of roles, broad optional regions, seniority, work arrangements and public skills (maximum five). Users choose these independently of their resume. No field accepts free text and no profile or model module is imported by the criteria contract/component.

`PublicSearchCriteria` uses catalog identifiers. Runtime validation rejects unknown/missing/extra fields, unknown values, duplicate skills and excessive skill selections; it returns a copied, frozen snapshot. Catalog expansion requires a source change and review of the generic terms. Regions are explicit job preferences, not inferred addresses. `any` means no preference and must be omitted from future provider query construction.

Choices and review status live in React application state, retained through page navigation and cleared on reload/exit. There is no local disk storage or query history. Changes invalidate review immediately. Review is of the selected categories only: it does not authorize network activity. Online search remains unavailable, so provider setup and credentials are not required for this increment.

This is a UI/local data contract, not the outbound security boundary. Authoritative engine validation and deterministic query construction are now implemented (decision 0006). Before an adapter is introduced, add allowlisted endpoints, actual query/provider UI preview and explicit dispatch confirmation. Adapters must receive only validated public criteria and have no access to profile storage. Never treat UI types or review state as sufficient outbound authorization.

Validation: frontend typecheck/production build and synthetic contract tests. Browser/native interaction and theme checks remain pending.
