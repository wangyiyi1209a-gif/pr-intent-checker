import StatusPanel from "@/components/StatusPanel";
import Link from "next/link";

export default function StatusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">上线就绪检查</h1>
        <p className="mt-2 max-w-3xl text-zinc-400">
          上线前先看本页。绿色越多越接近「可以给人用」。详细步骤见{" "}
          <Link href="/setup" className="text-emerald-300 underline">
            Setup
          </Link>{" "}
          与仓库 <code className="text-zinc-200">docs/GO_LIVE.md</code>。
        </p>
      </div>
      <StatusPanel />
    </div>
  );
}
