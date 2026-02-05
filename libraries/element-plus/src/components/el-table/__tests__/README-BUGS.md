# ElementPlus el-table 可疑BUG测试用例文档

## 概述

本测试文件（`table-bugs.test.ts`）包含针对 ElementPlus `el-table` 组件潜在BUG的测试用例。这些测试用例基于对组件源代码（`plugins/index.tsx`）的深入分析，识别出可能存在的边界情况和潜在问题。

## 测试用例详细说明

### Bug #1: 分页状态管理 (Pagination State Management)

**问题位置：** `plugins/index.tsx` 第 86-103 行

**问题描述：**
当 `pageSize` 改变时，代码会调用 `setCurrentPage(1, { pageSize })`。这是为了处理以下场景：
- 100条数据，`pageSize=10` 时有10页
- 当前在第5页
- 改变 `pageSize=50` 后只有2页
- 第5页不再存在，需要重置到第1页

**潜在问题：**
1. 如果用户在第3页，改变 `pageSize` 后第3页仍然有效，是否应该保持在第3页？
2. `pageSizes` 的 JSON 解析可能失败，需要确保有合适的错误处理

**测试场景：**
- 测试 `pageSize` 改变时 `currentPage` 是否正确重置
- 测试无效 JSON 字符串的处理
- 测试非数组值的回退逻辑

---

### Bug #2: 排序状态同步 (Sort State Synchronization)

**问题位置：** `plugins/index.tsx` 第 188-199 行

**问题描述：**
```typescript
const onSortChange = useCallback(({ prop, order }) => {
  setSort(prop);
  setOrder(order);
  _.attempt(ref?.reload, { sort: prop, order, pagination });
}, [ref, emit, pagination]);
```

**潜在问题：**
1. 使用 `_.attempt` 意味着如果 `ref.reload` 不存在，会静默失败
2. 可能导致用户认为排序生效了，但数据没有重新加载
3. `order` 的值映射（`orderMap`）可能处理不完整的状态

**测试场景：**
- 测试 `reload` 方法未定义时的行为
- 测试 `order` 为 `undefined` 的情况
- 测试排序状态与分页的交互

---

### Bug #3: 数据源请求处理 (Data Source Request Handling)

**问题位置：** `plugins/index.tsx` 第 19-27 行（`formatResult` 函数）、第 218-262 行

**问题描述：**
`formatResult` 使用 `_.cond` 处理不同的数据格式：
```typescript
const formatResult = _.cond([
  [Array.isArray, (list) => ({ list, total: list.length, pageLocal: true })],
  [_.conforms({ list: _.isArray }), _.identity],
  [fp.stubTrue, fp.constant({ list: [], total: 0, pageLocal: true })],
])
```

**潜在问题：**
1. 空值（`null`/`undefined`）的处理
2. 无效数据格式的回退
3. `dataSource` 为函数时的异步处理

**测试场景：**
- 测试 `null`/`undefined` 数据源
- 测试各种数据格式
- 测试空数组

---

### Bug #4: 树形数据转换 (Tree Data Conversion)

**问题位置：** `plugins/index.tsx` 第 248-251 行

**问题描述：**
```typescript
const treeData = useMemo(
  () => useDataSourceToTree(data, parentField, rowKey as string),
  [data, parentField, rowKey],
);
```

**潜在问题：**
1. **循环引用：** 如果数据中存在循环引用（A的父是B，B的父是A），可能导致无限循环
2. **缺失父节点：** 如果子节点的 `parentId` 指向不存在的父节点
3. **无效的 `rowKey`：** 如果 `rowKey` 路径不存在于数据中

**测试场景：**
- 测试正常的平面数据到树形结构的转换
- 测试循环引用数据
- 测试孤立节点（父节点不存在）

---

### Bug #5: 选择状态管理 (Selection State Management)

**问题位置：** `plugins/index.tsx` 第 394-439 行

**问题描述：**
选择功能通过以下方式管理：
```typescript
function getSelectedRows(data, selectedValues) {
  return _.map(selectedValues, (rowKey) => 
    _.find(data, (item) => getRowKey(item) === rowKey)
  ).filter(Boolean);
}
```

然后使用 `_.defer` 异步更新选择状态：
```typescript
_.defer(() => {
  ref?.clearSelection?.();
  return _.map(selectRows, (row) => _.attempt(ref?.toggleRowSelection, row, true));
}, 0);
```

**潜在问题：**
1. **缺失的行：** `selectedValues` 中包含数据中不存在的 ID
2. **竞态条件：** 快速连续更改选择时，`_.defer` 可能导致状态不一致
3. **无效的 `rowKey`：** 如果 `rowKey` 路径在某些行中不存在

**测试场景：**
- 测试 `selectedValues` 包含不存在的 ID
- 测试快速连续的选择更改
- 测试无效的 `rowKey` 路径

---

### Bug #6: 列配置状态 (Column Configuration State)

**问题位置：** `plugins/index.tsx` 第 321-350 行

**问题描述：**
列配置插件允许用户动态显示/隐藏列：
```typescript
const columns = _.flatMap(slots.default(), (node) => 
  (node.type.name === 'ElTableColumn' && node.props.prop
    ? [{ ...node.props, header: node.children?.header }]
    : []
));
```

**潜在问题：**
1. 如果没有列或所有列都被隐藏，表格可能显示异常
2. 列状态的初始化可能不正确

**测试场景：**
- 测试空列配置
- 测试所有列都被过滤的情况

---

### Bug #7: 高度和样式处理 (Height and Style Handling)

**问题位置：** `plugins/index.tsx` 第 353-365 行（高度）、第 164-178 行（sticky）

**问题描述：**
高度优先级：`heightProps || styleProps.height`
Sticky偏移：使用 CSS 变量 `--el-table-sticky-offset`

**潜在问题：**
1. `height` prop 和 `style.height` 同时存在时的优先级
2. `stickyOffset` 为无效值（字符串、负数）时的处理

**测试场景：**
- 测试高度优先级
- 测试各种无效的 `stickyOffset` 值

---

### Bug #8: 引用和重载方法 (Ref and Reload Method)

**问题位置：** `plugins/index.tsx` 第 252、274、315 行

**问题描述：**
多个插件通过 `Object.assign` 修改同一个 `ref`：
```typescript
ref: Object.assign(ref, { reload, data: treeData, getData: () => data })
ref: Object.assign(ref, _.omit(tableRef.value, ['reload', 'data']))
ref: Object.assign(ref, _.omit(tableRef.value, ['reload', 'data']))
```

**潜在问题：**
1. **属性冲突：** 后续的 `Object.assign` 可能覆盖之前的属性
2. **reload 依赖：** `reload` 方法需要 `dataSource`，但如果只传 `data` prop 则无法工作

**测试场景：**
- 测试 ref 属性合并
- 测试没有 `dataSource` 时调用 `reload`

---

### Bug #9: 编辑表格模式 (Edit Table Mode)

**问题位置：** `plugins/index.tsx` 第 298-318 行

**问题描述：**
检测可编辑列：
```typescript
const editableColumn = _.find(
  _.attempt(slots?.default), 
  (node) => _.get(node, 'props.type') === 'editable'
);
```

**潜在问题：**
1. `slots.default` 返回的结构可能不符合预期
2. 使用 `_.attempt` 可能掩盖错误

**测试场景：**
- 测试可编辑列的检测
- 测试 `editTable` 模式下的表单包装

---

### Bug #10: 事件处理边界情况 (Event Handler Edge Cases)

**问题位置：** `plugins/index.tsx` 第 387-390 行

**问题描述：**
```typescript
onCurrentChange: _.wrap(currentChange, (fn, value) => {
  fn({ row: value });
  setSelectedValue(getRowKey(value));
})
```

**潜在问题：**
1. `value` 可能是 `undefined`（取消选择当前行）
2. `getRowKey(undefined)` 的行为未定义

**测试场景：**
- 测试 `onCurrentChange` 接收 `undefined` 值

---

## 如何运行测试

### 运行单个测试文件
```bash
cd libraries/element-plus
pnpm vitest src/components/el-table/__tests__/table-bugs.test.ts
```

### 运行所有 el-table 测试
```bash
cd libraries/element-plus
pnpm vitest src/components/el-table/__tests__/
```

### 运行并查看覆盖率
```bash
cd libraries/element-plus
pnpm test:coverage
```

### 开发模式（监听文件变化）
```bash
cd libraries/element-plus
pnpm test:dev
```

## 测试结果解释

### 成功的测试
- ✓ 绿色勾号表示测试通过
- 说明组件正确处理了该边界情况

### 失败的测试
- ✗ 红色叉号表示测试失败
- **这可能确实揭示了一个BUG**
- 需要检查失败原因并修复组件代码

### 待完善的测试
某些测试用例只验证了组件不崩溃（`expect(wrapper.exists()).toBe(true)`），而没有验证具体的行为。这些测试可以进一步完善：

1. **验证状态值：** 检查 props/state 的实际值
2. **验证 DOM 结构：** 检查渲染的 HTML 是否正确
3. **验证事件触发：** 确认回调函数被正确调用

## 注意事项

1. **这些是潜在的BUG：** 并非所有测试用例都会失败。某些边界情况可能已经被正确处理。
2. **需要根据实际情况修复：** 如果测试失败，需要分析具体原因，可能需要修改组件代码或调整测试用例。
3. **持续维护：** 随着组件功能的更新，需要持续添加新的测试用例。
4. **性能考虑：** 某些测试（如树形数据转换）可能涉及性能问题，需要考虑大数据集的情况。

## 相关文件

- **组件主文件：** `src/components/el-table/index.ts`
- **插件逻辑：** `src/components/el-table/plugins/index.tsx`
- **列插件：** `src/components/el-table/plugins/column.tsx`
- **动态列插件：** `src/components/el-table/plugins/column-dynamic.tsx`
- **已有测试：** `src/components/el-table/__tests__/table.test.ts`
- **本测试文件：** `src/components/el-table/__tests__/table-bugs.test.ts`

## 贡献指南

如果你发现了新的潜在BUG或边界情况，请：
1. 在此测试文件中添加新的测试用例
2. 清晰地注释问题位置和描述
3. 如果测试失败，提交 Issue 或 PR 修复组件代码
4. 更新此 README 文档
