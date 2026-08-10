import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 镜像需要 standalone 输出
  output: "standalone",
};

export default nextConfig;
