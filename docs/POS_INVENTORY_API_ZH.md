# POS 库存接口说明

## 接口地址

`POST https://hr-app-rho-blush.vercel.app/api/integrations/pos/consumption`

## 请求 Header

```http
Content-Type: application/json
x-api-key: <ask-hr-for-current-pos-api-key>
```

也支持：

```http
Authorization: Bearer <ask-hr-for-current-pos-api-key>
```

建议直接使用 `x-api-key`

## 用途

POS 在销售完成后，把销售数据发送到此接口，库存系统会自动扣减库存。

## 请求参数

```json
{
  "source_system": "pos",
  "event_type": "sale",
  "external_ref": "POS-ORDER-20260625-0001",
  "branch_code": "001",
  "warehouse_code": "001",
  "sold_at": "2026-06-25T13:00:00+07:00",
  "notes": "A12 桌",
  "items": [
    {
      "sku_code": "BEV-BEERCHANG-620-1",
      "qty": 2,
      "consumption_type": "production"
    }
  ]
}
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `source_system` | string | 否 | 默认值：`pos` |
| `event_type` | string | 否 | 默认值：`sale` |
| `external_ref` | string | 是 | POS 订单号，必须唯一，不能重复 |
| `branch_code` | string | 是 | 分店代码，目前使用 `001` |
| `warehouse_code` | string | 是 | 仓库代码，目前使用 `001` |
| `sold_at` | string | 否 | 销售时间，ISO 日期时间格式 |
| `notes` | string | 否 | 备注 |
| `items` | array | 是 | 至少 1 条明细 |
| `items[].sku_code` | string | 是 | 库存系统中的 SKU 编码 |
| `items[].qty` | number | 是 | 数量，必须大于 0 |
| `items[].consumption_type` | string | 否 | 可选值：`production`、`sampling`、`testing` |
| `items[].notes` | string | 否 | 单条明细备注 |

## 成功返回

```json
{
  "ok": true,
  "event_id": "uuid",
  "consumption_ids": ["uuid"]
}
```

## 重复订单返回

如果同一个 `external_ref` 重复发送，系统不会重复扣库存。

```json
{
  "ok": true,
  "duplicate": true,
  "event_id": "uuid",
  "status": "processed",
  "consumption_ids": ["uuid"]
}
```

## 常见错误

### 1. 未授权

```json
{
  "error": "unauthorized"
}
```

### 2. SKU 不存在

```json
{
  "error": "sku not found: SKU-NOT-REAL"
}
```

### 3. 分店或仓库不存在

```json
{
  "error": "branch not found: 001"
}
```

或

```json
{
  "error": "warehouse not found for branch 001: 001"
}
```

### 4. 库存不足

```json
{
  "error": "insufficient stock",
  "event_id": "uuid"
}
```

## 当前可用代码

### 分店代码

- `001` = Bang Na

### 仓库代码

- `001` = Bang Na

### SKU 示例

- `BEV-BEERCHANG-620-1`
- `DRY-FLOUR-STARCH`
- `BEV-BEERSINGHA-620`
- `BEV-WINE-389`

## cURL 示例

```bash
curl -X POST 'https://hr-app-rho-blush.vercel.app/api/integrations/pos/consumption' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: <ask-hr-for-current-pos-api-key>' \
  --data '{
    "source_system": "pos",
    "event_type": "sale",
    "external_ref": "POS-ORDER-20260625-0001",
    "branch_code": "001",
    "warehouse_code": "001",
    "sold_at": "2026-06-25T13:00:00+07:00",
    "notes": "A12 桌",
    "items": [
      {
        "sku_code": "BEV-BEERCHANG-620-1",
        "qty": 2,
        "consumption_type": "production"
      }
    ]
  }'
```
