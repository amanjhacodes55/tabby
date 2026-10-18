# CSV export

Source: [`src/app/api/groups/[id]/export/route.ts`](../../src/app/api/groups/[id]/export/route.ts),
[`src/lib/csv.ts`](../../src/lib/csv.ts).

## `GET /api/groups/{groupId}/export`

Download the whole ledger as a spreadsheet-friendly CSV: one row per expense and payment, then the
final balances and the settle-up plan. The **Export as CSV** button on the People tab links here.

**Access:** anyone with the group id.

### Path parameters

| Name | Type | Rules |
| --- | --- | --- |
| `groupId` | string | `^[A-Za-z0-9_-]{16,40}$` |

### Example

```bash
curl -s -OJ "$BASE/api/groups/$GROUP/export"   # saves tabby-goa-trip-demo.csv
```

`200 OK` with headers

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="tabby-goa-trip-demo.csv"
Cache-Control: no-store
```

Body (the demo group used for the screenshots):

```csv
Date,Type,Description,Category,Amount (INR),Paid by,Split,Asha,Ben,Chen,Divya
2026-10-10,Expense,Flights BLR → GOI,Travel,26400.00,Asha,equal,19800.00,-6600.00,-6600.00,-6600.00
2026-10-10,Expense,Beach villa (3 nights),Rent & bills,36000.00,Ben,shares,-7200.00,28800.00,-10800.00,-10800.00
2026-10-11,Expense,Scooter rental,Travel,2400.00,Chen,equal,-800.00,0.00,1600.00,-800.00
2026-10-11,Expense,Dinner at Thalassa,Food & drinks,6850.00,Divya,percent,-1712.50,-2055.00,-1712.50,5480.00
2026-10-12,Expense,Groceries & snacks,Groceries,1320.50,Asha,equal,990.37,-330.13,-330.12,-330.12
2026-10-12,Expense,Parasailing,Fun,9000.00,Ben,exact,0.00,6000.00,-3000.00,-3000.00
2026-10-13,Expense,Fish thali lunch,Food & drinks,1860.00,Chen,equal,-465.00,-465.00,1395.00,-465.00
2026-10-14,Payment,Chen paid Asha (Flights share),,5000.00,Chen,,-5000.00,0.00,5000.00,0.00

Balance,,,,,,,5612.87,25349.87,-14447.62,-16515.12

Settle up,From,To,Amount (INR)
,Divya,Ben,16515.12
,Chen,Ben,8834.75
,Chen,Asha,5612.87
```

### Format details

- **Filename:** `tabby-<slug>.csv`, where the slug is the group name lower-cased with runs of
  non-`[a-z0-9]` characters replaced by `-` (falls back to `group`).
- **Encoding:** UTF-8 with a byte-order mark (so Excel detects UTF-8), CRLF line endings.
- **Rows:** expenses and payments sorted oldest first (by `date`, then creation time).
- **Amounts** are plain decimals in major units with the currency's decimals and no thousands separators.
- **Per-person columns** show that row's net effect on each person: positive means the group owes
  them more, negative means they owe more. Each column sums to that person's balance, shown in the
  `Balance` row. For a payment, the sender gets `+amount` and the receiver `−amount`.
- **Settle up** lists the transfers from the [settle-up algorithm](balances.md#settle-up-plan); it's
  omitted when everyone is settled.
- **Formula-injection guard:** text cells starting with `=`, `+`, `-`, `@`, tab or CR (other than
  plain numbers) are prefixed with `'`. Cells containing `,`, `"` or newlines are quoted.

### Errors

The error body is JSON even though success is CSV.

| Status | `error` | Cause |
| --- | --- | --- |
| `404` | `Group not found` | Malformed id or no such group |
