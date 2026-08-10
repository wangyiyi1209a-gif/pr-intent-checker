import DemoAnalyzer from "@/components/DemoAnalyzer";

export default function DemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Interactive Demo</h1>
        <p className="mt-2 max-w-3xl text-zinc-400">
          不接 GitHub 也能体验核心能力。先用「漂移」样例：标题写修 README 错别字，diff
          却偷偷改了登录会话与依赖——这就是典型的意图漂移。
        </p>
      </div>
      <DemoAnalyzer />
    </div>
  );
}
