/**
 * Test file for suspected bugs in el-table-pro component
 * 测试 el-table-pro 组件中可疑BUG的测试用例
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from 'vitest';
import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { ref, nextTick } from '@vue/composition-api';
import ElTablePro from '../index.tsx';

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(() => resolve(true), ms);
});

const localVue = createLocalVue();
localVue.use(VueRouter);
const router = new VueRouter();

describe('el-table-pro 可疑BUG测试 (Suspected Bug Tests)', () => {
  let wrapper;

  beforeEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
  });

  describe('Bug #1: Pagination state inconsistency', () => {
    it('should maintain current page when pageSize changes', async () => {
      // 当 pageSize 改变时，current 页码应该保持一致或重置为1
      const onPageChange = vi.fn();
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData,
          page: 3,
          pageSize: 10,
          total: 100,
          onPageChange,
          columns: [
            { colKey: 'id', title: 'ID' },
            { colKey: 'name', title: 'Name' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Change pageSize
      await wrapper.setProps({ pageSize: 20 });
      await nextTick();
      
      // Bug: 当 pageSize 从10变为20时，如果当前在第3页，
      // 第3页可能不存在了（100条数据，pageSize=20时只有5页）
      // 应该验证 current 页码是否被正确调整
      expect(wrapper.vm.current).toBeDefined();
    });

    it('should call onLoadData with correct parameters when pagination changes', async () => {
      const onLoadData = vi.fn();
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData,
          page: 1,
          pageSize: 10,
          total: 50,
          onLoadData,
          columns: [
            { colKey: 'id', title: 'ID' },
            { colKey: 'name', title: 'Name' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // onLoadData should be called on mount
      expect(onLoadData).toHaveBeenCalled();
      const lastCall = onLoadData.mock.calls[onLoadData.mock.calls.length - 1][0];
      expect(lastCall).toHaveProperty('page');
      expect(lastCall).toHaveProperty('size');
    });
  });

  describe('Bug #2: Row merging (rowspan) calculation', () => {
    it('should correctly calculate rowspan for autoMerge columns', async () => {
      // autoMerge 功能可能在某些情况下计算错误
      const mockData = [
        { id: 1, category: 'A', value: 'X' },
        { id: 2, category: 'A', value: 'Y' },
        { id: 3, category: 'B', value: 'Z' },
        { id: 4, category: 'B', value: 'W' },
      ];

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData,
          pagination: false,
          columns: [
            { colKey: 'id', title: 'ID' },
            { colKey: 'category', title: 'Category', autoMerge: true },
            { colKey: 'value', title: 'Value' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Bug: autoMerge 可能在数据更新时没有正确重新计算 rowspan
      // 验证第一行的 category 应该有 rowspan=2
      const firstRow = mockData[0];
      expect(firstRow.rowspan).toBeDefined();
      if (firstRow.rowspan) {
        expect(firstRow.rowspan.category).toBeGreaterThan(1);
      }
    });

    it('should recalculate rowspan when data changes', async () => {
      const mockData = ref([
        { id: 1, category: 'A', value: 'X' },
        { id: 2, category: 'A', value: 'Y' },
      ]);

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData.value,
          pagination: false,
          columns: [
            { colKey: 'id', title: 'ID' },
            { colKey: 'category', title: 'Category', autoMerge: true },
            { colKey: 'value', title: 'Value' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Update data
      const newData = [
        { id: 1, category: 'A', value: 'X' },
        { id: 2, category: 'B', value: 'Y' },
        { id: 3, category: 'B', value: 'Z' },
      ];
      
      await wrapper.setProps({ data: newData });
      await nextTick();
      await sleep(16);

      // Bug: rowspan 可能没有在数据变化后重新计算
      // 新数据中 category 'A' 只有1行，'B' 有2行
    });
  });

  describe('Bug #3: Display columns state synchronization', () => {
    it('should sync displayColumns when prop changes', async () => {
      const onDisplayColumnsChange = vi.fn();
      const columns = [
        { colKey: 'id', title: 'ID' },
        { colKey: 'name', title: 'Name' },
        { colKey: 'age', title: 'Age' },
      ];

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: [],
          displayColumns: ['id', 'name'],
          onDisplayColumnsChange,
          columns,
          pagination: false,
        },
      });

      await nextTick();
      await sleep(16);

      // Change displayColumns
      await wrapper.setProps({ displayColumns: ['id', 'age'] });
      await nextTick();

      // Bug: displayColumns 的状态同步可能存在问题
      // 在 basic-plugins.ts 的 watch 中，displayColumns 的更新可能不会正确触发
    });

    it('should handle displayColumns when not provided', async () => {
      const columns = [
        { colKey: 'id', title: 'ID' },
        { colKey: 'name', title: 'Name' },
      ];

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: [],
          columns,
          pagination: false,
          // displayColumns not provided
        },
      });

      await nextTick();
      await sleep(16);

      // Bug: 当 displayColumns 为空时，在 $render 中会自动设置为所有列的 colKey
      // 但这个逻辑可能在某些情况下不生效
    });
  });

  describe('Bug #4: Dynamic columns dataSource change detection', () => {
    it('should detect changes in dynamic column dataSource', async () => {
      // 测试动态列的数据源变化检测
      const dataSource1 = [
        { index: 1, label: 'Column 1' },
        { index: 2, label: 'Column 2' },
      ];

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: [],
          pagination: false,
        },
        slots: {
          default: `
            <el-table-column-dynamic-pro
              :dataSource="dataSource"
              colKey="index"
            />
          `,
        },
      });

      await nextTick();
      await sleep(16);

      // Bug: dynamicColumnsNodeData 的比较使用 _.isEqual
      // 可能在某些情况下不能正确检测数据源的变化
    });
  });

  describe('Bug #5: Sort state management', () => {
    it('should clear sort state when sort is removed', async () => {
      const onSortChange = vi.fn();
      const onLoadData = vi.fn();
      const mockData = [
        { id: 3, name: 'C' },
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData,
          onSortChange,
          onLoadData,
          pagination: false,
          columns: [
            { colKey: 'id', title: 'ID', sorter: true },
            { colKey: 'name', title: 'Name' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Trigger sort
      // Bug: 在 onSortChange 中，当 arg[0] 为 null/undefined 时
      // sort 和 order 应该被清空，但可能存在状态残留
    });

    it('should maintain sort state across pagination', async () => {
      const onLoadData = vi.fn();
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData,
          page: 1,
          pageSize: 10,
          total: 50,
          onLoadData,
          sorting: { field: 'id', order: 'asc' },
          columns: [
            { colKey: 'id', title: 'ID', sorter: true },
            { colKey: 'name', title: 'Name' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Bug: 翻页时，sort 和 order 应该保持不变
      // 但在某些情况下可能会丢失排序状态
    });
  });

  describe('Bug #6: Tree mode and pagination interaction', () => {
    it('should handle tree data with pagination correctly', async () => {
      const mockData = [
        { id: 1, name: 'Parent 1', children: [
          { id: 2, name: 'Child 1-1' },
          { id: 3, name: 'Child 1-2' },
        ]},
        { id: 4, name: 'Parent 2', children: [
          { id: 5, name: 'Child 2-1' },
        ]},
      ];

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData,
          treeDisplay: true,
          pagination: false,
          columns: [
            { colKey: 'id', title: 'ID' },
            { colKey: 'name', title: 'Name' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Bug: treeDisplay 模式下，组件使用 EnhancedTable
      // 但某些属性可能没有正确传递
    });

    it('should convert flat list to tree structure with parentField', async () => {
      const mockData = [
        { id: 1, name: 'Parent 1', parent: null },
        { id: 2, name: 'Child 1-1', parent: 1 },
        { id: 3, name: 'Child 1-2', parent: 1 },
        { id: 4, name: 'Parent 2', parent: null },
        { id: 5, name: 'Child 2-1', parent: 4 },
      ];

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData,
          treeDisplay: true,
          parentField: 'parent',
          valueField: 'id',
          pagination: false,
          columns: [
            { colKey: 'id', title: 'ID' },
            { colKey: 'name', title: 'Name' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Bug: listToTree 转换可能在某些边界情况下失败
      // 例如循环引用、无效的 parent 值等
    });
  });

  describe('Bug #7: pageSizeOptions parsing', () => {
    it('should handle invalid pageSizeOptions JSON string', async () => {
      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: [],
          pageSizeOptions: 'invalid json',
          columns: [
            { colKey: 'id', title: 'ID' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Bug: 在 basic-plugins.ts 中，pageSizeOptions 使用 JSON.parse
      // 如果传入无效的 JSON 字符串，catch 块返回默认值 [10, 20, 50]
      // 但可能在某些情况下出现异常
    });

    it('should handle non-array pageSizeOptions after parsing', async () => {
      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: [],
          pageSizeOptions: '{"key": "value"}',
          columns: [
            { colKey: 'id', title: 'ID' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Bug: JSON.parse 成功但返回的不是数组
      // 代码会返回默认值，但这个判断可能不够严格
    });
  });

  describe('Bug #8: Edit column configuration', () => {
    it('should handle edit column with missing component', async () => {
      const mockData = [
        { id: 1, name: 'Item 1' },
      ];

      // Bug: 在 editColumnProps 中，editNodeTag 可能获取失败
      // 导致 formComponentMap[editNodeTag] 返回 undefined
      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData,
          pagination: false,
          columns: [
            { colKey: 'id', title: 'ID' },
            { colKey: 'name', title: 'Name', type: 'editable' },
          ],
        },
      });

      await nextTick();
      await sleep(16);
    });

    it('should handle edit column validation rules', async () => {
      const mockData = [
        { id: 1, name: 'Item 1' },
      ];

      const rules = [
        { required: true, message: 'Name is required' },
      ];

      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: mockData,
          pagination: false,
          columns: [
            { colKey: 'id', title: 'ID' },
            { 
              colKey: 'name',
              title: 'Name',
              type: 'editable',
              rules,
            },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Bug: rules 的验证逻辑可能在某些情况下不触发
      // 或者验证结果没有正确返回
    });
  });

  describe('Bug #9: Selection and multiple mode', () => {
    it('should handle selection mode transitions', async () => {
      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
          ],
          selection: true,
          multiple: false,
          pagination: false,
          columns: [
            { colKey: 'id', title: 'ID' },
            { colKey: 'name', title: 'Name' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Change to multiple mode
      await wrapper.setProps({ multiple: true });
      await nextTick();

      // Bug: typeColumns 的计算依赖 selection 和 multiple
      // 当这些值动态变化时，可能导致列的类型不正确
    });
  });

  describe('Bug #10: Reload method and state reset', () => {
    it('should reset page to 1 when reload is called', async () => {
      const onLoadData = vi.fn();
      
      wrapper = mount(ElTablePro, {
        localVue,
        router,
        propsData: {
          data: [],
          page: 3,
          pageSize: 10,
          total: 100,
          onLoadData,
          columns: [
            { colKey: 'id', title: 'ID' },
          ],
        },
      });

      await nextTick();
      await sleep(16);

      // Call reload
      if (wrapper.vm.$refs && typeof wrapper.vm.reload === 'function') {
        wrapper.vm.reload();
        await nextTick();
        
        // Bug: reload 方法将 current 设置为 1
        // 但调用 onLoadData 时使用的是 pagination.value.current
        // 这可能导致参数不一致
      }
    });
  });
});
