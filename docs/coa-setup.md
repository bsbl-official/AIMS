# Chart of Account setup

The original master is now **Initial COA**, at `/setup/initial-coa` and `/api/initial-coa`.
The old `/accounts` URL redirects to it; `/api/coa` remains a compatibility alias.
The stored `a_coa` key and existing `coa.read` / `coa.manage` grants are retained so existing data and roles continue to work.

The five-layer setup is at `/setup/chart-of-accounts`. It uses `a_l1`, `a_l2`, `a_l3`, `a_l4`, and `a_acc_head`.
Select the company and Initial COA, then choose a layer. Parent accounts can be selected in the create form.
Search, view, edit, and delete are available for each layer; deletion is blocked while children exist.
Account head column choices include every property and are remembered per user in the current browser.

## Data mappings

- Account types: Liabilities `L`, Assets `A`, Income `I`, Expense `E`.
- Account groups: Bank `B`, Cash `C`, Other `O`.
- Checkbox fields store `Y` or `N`; an untouched checkbox stores `N`.
- BS/IS mappings use `BS` and `IS` report specifications; RP uses `RP`; CF uses `CF`.
- Dropdowns display code and description but submit only `layer2_code`. The backend validates report membership and company scope.
- Report specifications use the same default Initial COA as the existing Financial Statement setup (the first Initial COA). Account layers may use any selected Initial COA.
- Category choices come from `category_info`. The group form can add a category.

## Schema integration

These are PostgreSQL adaptations of the supplied Oracle definitions. The existing application uses a numeric Initial COA ID and organization codes up to 40 characters; these types are preserved. Company code participates in the hierarchy keys to keep companies isolated, and is resolved from the authorized company rather than a hard-coded default. The account head also references its sub-layer parent.

`CATEGORY_INFO` was absent and its full schema was not supplied. V18 adds the minimal global dictionary (`category_code`, `category_desc`) required by the supplied foreign key, preserves existing group category codes, and adds the relationship. V18 also normalizes legacy null checkbox fields to `N`. Historical migrations are not rewritten.

## API

Under `/api/companies/{companyId}/account-layers`:

- `GET /{level}?coaId=...`: list records for layers 1–5.
- `POST /{level}?coaId=...`: create; returns `201` and the saved record.
- `PUT /{level}?coaId=...`: update; returns `200` and the saved record.
- `DELETE /{level}?coaId=...`: delete; returns `204`.
- `GET /report-options`: financial statement lookup values.
- `GET /categories`, `POST /categories`: list/add category choices.

Bodies use the supplied column names in lower case. Parent and current layer codes are required. Audit identity and timestamps are server-controlled. Writes are transactional and recorded in `audit_events`.

