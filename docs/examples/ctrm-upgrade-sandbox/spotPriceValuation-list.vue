<!-- 脱敏示例：现货估值列表 - 窄布局防挤叠 -->
<template>
  <div class="spot-price-list">
    <BaseForm v-model="queryForm" class="gd-search-form narrow-layout" />
    <div class="form-actions-col actions">
      <button>Search</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "SpotPriceValuationListExample",
  data() {
    return {
      queryForm: {
        currentPage: 1,
        pageSize: 10,
        condition: { valuationDate: "" },
      },
    };
  },
};
</script>

<style scoped>
.narrow-layout .form-actions-col {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
