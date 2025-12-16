# Swagger 文档生成错误修复指南

## 问题

运行 `node ace docs:generate` 时出现错误：
```
TypeError: Cannot convert undefined or null to object
CommentParser.jsonToObj
```

## 原因

`adonis-autoswagger` 的 `CommentParser.jsonToObj` 在解析某些 JSON 格式时会失败，特别是：
1. 空对象 `{}`
2. 空数组 `[]`
3. `null` 值
4. 嵌套过深的 JSON
5. 某些特殊字符或格式

## 解决方案

### 1. 避免空对象和空数组

❌ **错误示例：**
```typescript
@responseBody 200 - {"code": 200, "data": {}}
@responseBody 200 - {"code": 200, "data": []}
@responseBody 200 - {"code": 200, "data": null}
```

✅ **正确示例：**
```typescript
// 使用简单的对象结构
@responseBody 200 - {"code": 200, "data": {"id": 1}}
@responseBody 200 - {"code": 200, "data": [{"id": 1}]}
```

### 2. 简化嵌套结构

❌ **错误示例（嵌套过深）：**
```typescript
@responseBody 200 - {"code": 200, "data": {"posts": [{"id": 1, "author": {"name": "John", "profile": {"avatar": "url"}}}]}}
```

✅ **正确示例（简化嵌套）：**
```typescript
@responseBody 200 - {"code": 200, "data": {"posts": [{"id": 1, "title": "Example"}]}}
```

### 3. 避免特殊字符

如果 JSON 中包含中文字符导致问题，可以：
- 使用英文描述
- 或者确保 JSON 格式正确

### 4. 检查注释格式

确保所有注释格式正确：
- `@responseBody` 格式：`@responseBody <status> - <json>`
- `@requestBody` 格式：`@requestBody <json>` 或 `@requestBody <validator>`
- `@paramQuery` 格式：`@paramQuery <name> - <description> - @type(<type>) @optional/@required`
- `@paramPath` 格式：`@paramPath <name> - <description> - @type(<type>) @required`

## 临时解决方案

如果问题持续存在，可以：

1. **暂时移除有问题的注释**
2. **使用更简单的 JSON 结构**
3. **等待 adonis-autoswagger 更新**

## 检查清单

- [ ] 所有 `@responseBody` 中没有空对象 `{}`
- [ ] 所有 `@responseBody` 中没有空数组 `[]`
- [ ] 所有 `@responseBody` 中没有 `null` 值
- [ ] JSON 格式正确（可以验证）
- [ ] 没有嵌套过深的结构
- [ ] 所有注释格式正确

