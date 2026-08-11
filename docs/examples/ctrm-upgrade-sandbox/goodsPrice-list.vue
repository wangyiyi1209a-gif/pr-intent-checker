<!--
  脱敏示例：模拟 CTRM 列表页升级到 gd-search-form-config。
  不含公司真实业务代码，仅用于验证 PR Intent Checker。
-->
<template>
  <div class="goods-price-list">
    <!-- before: <BaseForm :data.sync="queryForm" /> -->
    <BaseForm v-model="queryForm" class="gd-search-form" />
    <div class="form-actions-col">
      <button type="button">查询</button>
      <button type="button">重置</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "GoodsPriceListExample",
  data() {
    return {
      queryForm: {
        currentPage: 1,
        pageSize: 20,
        condition: {
          keyword: "",
        },
      },
    };
  },
};
</script>

<style scoped>
.form-actions-col {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}
</style>
