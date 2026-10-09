import type { Decorator, Preview } from "@storybook/react-vite";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/800.css";
import "../src/index.css";
import { setLocale, type Locale } from "../src/i18n";

/** The game's page around a question: its background, and no wider than a round's column. */
const page: Decorator = (Story, context) => {
  setLocale((context.globals.locale as Locale) ?? "sv");
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-2xl flex flex-col items-center gap-5">
        <Story />
      </div>
    </div>
  );
};

const preview: Preview = {
  decorators: [page],
  globalTypes: {
    locale: {
      description: "Språk / language",
      toolbar: { title: "Språk", icon: "globe", items: [{ value: "sv", title: "Svenska" }, { value: "en", title: "English" }], dynamicTitle: true },
    },
  },
  initialGlobals: { locale: "sv" },
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
    viewport: { defaultViewport: "responsive" },
  },
};

export default preview;
