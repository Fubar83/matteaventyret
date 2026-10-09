import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Storybook: every kind of question, in every configuration (src/stories/).
 * Uses the game's own Vite config - minus the offline worker (PWA), which has
 * no place in a story and would cache Storybook itself.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: { name: "@storybook/react-vite", options: {} },
  staticDirs: ["../public"],
  async viteFinal(viteConfig) {
    const isPwa = (p: unknown) => !!p && typeof p === "object" && "name" in p && String((p as { name: unknown }).name).startsWith("vite-plugin-pwa");
    viteConfig.plugins = (viteConfig.plugins ?? []).flat().filter((p) => !isPwa(p));
    // Scan the stories for dependencies to pre-bundle, not the game's index.html - its main.tsx registers the worker, which isn't here.
    viteConfig.optimizeDeps = { ...viteConfig.optimizeDeps, entries: ["src/**/*.stories.tsx", ".storybook/preview.tsx"] };
    // As in vite.config.ts: don't watch data/'s ~800k training files (nor the built Storybook) - walking them stalls the dev server.
    const ignored = viteConfig.server?.watch?.ignored;
    viteConfig.server = {
      ...viteConfig.server,
      watch: { ...viteConfig.server?.watch, ignored: [...(Array.isArray(ignored) ? ignored : ignored ? [ignored] : []), "**/data/**", "**/storybook-static/**"] },
    };
    return viteConfig;
  },
};

export default config;
