/*
 * Next.js config.
 * reactCompiler: true — включает бета-версию React Compiler
 * (babel-plugin-react-compiler) для автоматической мемоизации.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
