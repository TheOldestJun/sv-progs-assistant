/*
 * Next.js config.
 * reactCompiler: true — включает бета-версию React Compiler
 * (babel-plugin-react-compiler) для автоматической мемоизации.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-mariadb", "mariadb"],
};

export default nextConfig;
