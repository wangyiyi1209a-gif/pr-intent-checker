import AnalysisTable from "@/components/AnalysisTable";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-zinc-400">
          本地/服务器上最近的分析结果（保存在 <code>data/analyses.json</code>）。
        </p>
      </div>
      <AnalysisTable />
    </div>
  );
}
