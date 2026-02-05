# el-table-pro 可疑BUG测试用例文档

## 概述

本测试文件包含针对 `el-table-pro` 组件潜在BUG的测试用例。这些测试用例基于对组件源代码（`basic-plugins.ts`）的分析，识别出可能存在的边界情况和潜在问题。

## 测试用例列表

### Bug #1: 分页状态不一致 (Pagination state inconsistency)

**问题描述：**
当 `pageSize` 改变时，当前页码（`current`）可能超出有效范围。例如，100条数据，`pageSize=10` 时有10页，如果当前在第8页，当 `pageSize` 改变为20时，只有5页，第8页已不存在。

**测试场景：**
- 测试 `pageSize` 变化时 `current` 页码的处理
- 验证 `onLoadData` 被调用时的参数正确性

**潜在影响：**
- 用户可能看到空白页面
- 数据加载可能失败

---

### Bug #2: 行合并(rowspan)计算问题 (Row merging calculation)

**问题描述：**
在 `basic-plugins.ts` 的第251-274行，`autoMerge` 功能通过 `watch` 监听数据变化并计算 `rowspan`。但在某些情况下：
1. 数据更新时可能不会触发重新计算
2. `rowspan` 计算逻辑可能在边界情况下出错
3. 使用 `_.isEqual` 比较可能导致不必要的计算或遗漏更新

**测试场景：**
- 测试具有相同值的连续行是否正确合并
- 测试数据更新后 `rowspan` 是否重新计算

**潜在影响：**
- 表格显示错误
- 行合并不生效或合并错误

---

### Bug #3: displayColumns 状态同步问题 (Display columns state synchronization)

**问题描述：**
在第500-514行，`displayColumns` 的同步逻辑存在以下问题：
1. `watch` 监听 `props.get('displayColumns')` 并更新本地状态
2. `onDisplayColumnsChange` 中根据是否有回调函数决定更新逻辑
3. 在 `$render` 中，如果没有提供 `displayColumns`，会自动设置为所有列的 `colKey`

这种复杂的状态管理可能导致：
- 状态不同步
- 更新丢失
- 回调函数未正确触发

**测试场景：**
- 测试 `displayColumns` prop 变化时的同步
- 测试未提供 `displayColumns` 时的默认行为

**潜在影响：**
- 列显示/隐藏功能异常
- 用户配置丢失

---

### Bug #4: 动态列数据源变化检测 (Dynamic columns dataSource change detection)

**问题描述：**
在第486-495行，动态列通过 `_.isEqual` 比较 `dataSource` 来检测变化。但这种方式可能：
1. 对于大数据集性能不佳
2. 某些情况下无法检测到深层对象的变化
3. 引用相同但内容变化的对象可能被忽略

**测试场景：**
- 测试动态列 `dataSource` 变化是否被正确检测

**潜在影响：**
- 动态列不更新
- 性能问题

---

### Bug #5: 排序状态管理 (Sort state management)

**问题描述：**
在第442-459行，排序状态的管理存在以下问题：
1. 当 `arg[0]` 为 falsy 值时，`sort` 和 `order` 被设置为 `null`
2. 但在某些情况下，可能存在状态残留
3. 排序状态在分页切换时可能丢失

**测试场景：**
- 测试排序清除时状态是否正确重置
- 测试分页时排序状态是否保持

**潜在影响：**
- 排序功能异常
- 数据加载参数错误

---

### Bug #6: 树形模式与分页交互 (Tree mode and pagination interaction)

**问题描述：**
在第224-241行，树形模式的处理：
1. 使用 `listToTree` 将平面数据转换为树形结构
2. `treeDisplay` 为 true 时使用 `EnhancedTable`
3. 转换逻辑可能在边界情况下失败（循环引用、无效parent等）

**测试场景：**
- 测试树形数据的正确处理
- 测试平面数据到树形结构的转换

**潜在影响：**
- 树形展示异常
- 数据转换失败

---

### Bug #7: pageSizeOptions 解析 (pageSizeOptions parsing)

**问题描述：**
在第410-417行，`pageSizeOptions` 的解析使用 `JSON.parse`：
```javascript
try {
  const list = JSON.parse(value);
  return Array.isArray(list) ? list : [10, 20, 50];
} catch (e) {
  return [10, 20, 50];
}
```

可能的问题：
1. 无效的JSON字符串会回退到默认值，但可能掩盖配置错误
2. 解析成功但非数组的情况处理可能不够严格

**测试场景：**
- 测试无效JSON字符串的处理
- 测试非数组值的处理

**潜在影响：**
- 分页选项配置失效
- 用户无法自定义分页大小选项

---

### Bug #8: 编辑列配置 (Edit column configuration)

**问题描述：**
在第89-154行，可编辑列的配置逻辑复杂：
1. 通过 `_.attempt(edit, { item: {} })` 获取编辑节点
2. 从节点中提取组件标签、属性、监听器等
3. `editNodeTag` 可能获取失败导致 `formComponentMap[editNodeTag]` 返回 `undefined`
4. 验证规则的处理可能存在问题

**测试场景：**
- 测试编辑列组件缺失时的处理
- 测试验证规则的正确性

**潜在影响：**
- 编辑功能失效
- 验证不生效

---

### Bug #9: 选择模式切换 (Selection and multiple mode)

**问题描述：**
在第182-203行，选择列的类型基于 `selection` 和 `multiple` 属性：
1. 使用 `_.cond` 进行条件判断
2. 当这些属性动态变化时，可能导致列类型不正确
3. `typeColumns` 是计算出来的，但可能不会响应式更新

**测试场景：**
- 测试选择模式从单选切换到多选

**潜在影响：**
- 选择列显示错误
- 选择功能异常

---

### Bug #10: reload 方法和状态重置 (Reload method and state reset)

**问题描述：**
在第577-588行，`reload` 方法的实现：
```javascript
reload() {
  current.value = 1;
  if (_.isFunction(onLoadData)) {
    onLoadData?.({
      page: _.get(pagination.value, 'current', undefined),
      size: _.get(pagination.value, 'pageSize', undefined),
      sort: sort.value,
      order: order.value,
    });
  }
}
```

问题：
1. 先设置 `current.value = 1`
2. 但调用 `onLoadData` 时使用 `pagination.value.current`
3. 这可能导致参数不一致（取决于 `pagination` 的计算时机）

**测试场景：**
- 测试 reload 调用时页码是否正确重置为1

**潜在影响：**
- reload 后数据加载参数错误
- 页码状态不一致

---

## 如何运行测试

```bash
# 进入 element-ui 目录
cd libraries/element-ui

# 运行所有测试
pnpm test:dev

# 运行特定测试文件
pnpm vitest src/pro-components/el-table-pro/tests/bug-cases.test.js

# 生成覆盖率报告
pnpm test:coverage
```

## 注意事项

1. **这些是潜在的BUG**：并非所有测试用例都会失败，某些可能是已经处理好的边界情况
2. **需要根据实际情况修复**：如果测试失败，需要分析具体原因并修复
3. **持续维护**：随着组件功能的更新，需要持续添加新的测试用例

## 相关文件

- 组件实现：`src/pro-components/el-table-pro/index.tsx`
- 插件逻辑：`src/pro-components/el-table-pro/plugins/basic-plugins.ts`
- 测试文件：`src/pro-components/el-table-pro/tests/bug-cases.test.js`
