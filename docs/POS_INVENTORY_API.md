# POS Inventory API

## Endpoint

`POST https://hr-app-rho-blush.vercel.app/api/integrations/pos/consumption`

## Headers

```http
Content-Type: application/json
x-api-key: <ask-hr-for-current-pos-api-key>
```

รองรับ `Authorization: Bearer <api-key>` ได้ด้วย แต่แนะนำให้ใช้ `x-api-key`

## Purpose

ให้ POS ส่งรายการขายเข้ามาเพื่อให้ระบบ inventory ตัด stock อัตโนมัติ

## Request Body

```json
{
  "source_system": "pos",
  "event_type": "sale",
  "external_ref": "POS-ORDER-20260625-0001",
  "branch_code": "001",
  "warehouse_code": "001",
  "sold_at": "2026-06-25T13:00:00+07:00",
  "notes": "โต๊ะ A12",
  "items": [
    {
      "sku_code": "BEV-BEERCHANG-620-1",
      "qty": 2,
      "consumption_type": "production"
    }
  ]
}
```

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `source_system` | string | no | default = `pos` |
| `event_type` | string | no | default = `sale` |
| `external_ref` | string | yes | รหัสออเดอร์จาก POS ห้ามซ้ำ |
| `branch_code` | string | yes | ตอนนี้ใช้ `001` |
| `warehouse_code` | string | yes | ตอนนี้ใช้ `001` |
| `sold_at` | string | no | ISO datetime |
| `notes` | string | no | หมายเหตุเพิ่มเติม |
| `items` | array | yes | อย่างน้อย 1 รายการ |
| `items[].sku_code` | string | yes | SKU code ในระบบคลัง |
| `items[].qty` | number | yes | ต้องมากกว่า 0 |
| `items[].consumption_type` | string | no | `production`, `sampling`, `testing` |
| `items[].notes` | string | no | หมายเหตุต่อรายการ |

## Success Response

```json
{
  "ok": true,
  "event_id": "uuid",
  "consumption_ids": ["uuid"]
}
```

## Duplicate Response

ถ้ายิง `external_ref` เดิมซ้ำ ระบบจะไม่ตัด stock ซ้ำ

```json
{
  "ok": true,
  "duplicate": true,
  "event_id": "uuid",
  "status": "processed",
  "consumption_ids": ["uuid"]
}
```

## Common Errors

### Unauthorized

```json
{
  "error": "unauthorized"
}
```

### SKU not found

```json
{
  "error": "sku not found: SKU-NOT-REAL"
}
```

### Branch or warehouse not found

```json
{
  "error": "branch not found: 001"
}
```

หรือ

```json
{
  "error": "warehouse not found for branch 001: 001"
}
```

### Insufficient stock

```json
{
  "error": "insufficient stock",
  "event_id": "uuid"
}
```

## Current Codes

### Branch

- `001` = Bang Na

### Warehouse

- `001` = Bang Na

### Example SKU codes

- `BEV-BEERCHANG-620-1`
- `DRY-FLOUR-STARCH`
- `BEV-BEERSINGHA-620`
- `BEV-WINE-389`

## cURL Example

```bash
curl -X POST 'https://hr-app-rho-blush.vercel.app/api/integrations/pos/consumption' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: <ask-hr-for-current-pos-api-key>' \
  --data @docs/pos-inventory-sample.json
```
