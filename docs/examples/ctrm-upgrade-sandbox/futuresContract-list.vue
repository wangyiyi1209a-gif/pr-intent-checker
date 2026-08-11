<!-- 脱敏示例：期货合约列表页 - BaseForm v-model + condition 拆分 -->
<template>
  <div class="futures-contract-list">
    <BaseForm v-model="queryForm" class="gd-search-form" />
  </div>
</template>

<script>
export default {
  name: "FuturesContractListExample",
  data() {
    return {
      // paging 与 condition 分层，避免 :data.sync 整包互踩
      queryForm: {
        currentPage: 1,
        pageRow: 20,
        pageSize: 20,
        condition: {
          contractCode: "",
          exchange: "",
        },
      },
    };
  },
};
</script>
