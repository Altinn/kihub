import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import pagefindResources from "./src/integrations/pagefind-resources";

const defaultSite = "https://altinn.github.io/kihub/";
const defaultBase = "/kihub/";
const normalizeSite = (value = defaultSite) => new URL(value).toString();
const normalizeBase = (value = defaultBase) => {
  if (!value || value === "/") return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

const site = normalizeSite(process.env.SITE_URL);
const base = normalizeBase(process.env.BASE_PATH);
const siteDescription =
  "KI Hub - Community-contributed agents, instructions, skills, and plugins for enhanced AI development";
const socialImageUrl = new URL("/images/social-image.png", site).toString();

// https://astro.build/config
export default defineConfig({
  site,
  base,
  output: "static",
  integrations: [
    starlight({
      title: "KI Hub",
      description: siteDescription,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Altinn/Kitt_KI_Hub",
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: socialImageUrl,
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content: siteDescription,
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: socialImageUrl,
          },
        },
      ],
      customCss: ["./src/styles/starlight-overrides.css", "./src/styles/global.css"],
      editLink: {
        baseUrl:
          "https://github.com/Altinn/kihub/edit/staged/website/",
      },
      sidebar: [
        {
          label: "Browse Resources",
          items: [
            { label: "Home", link: "/" },
            { label: "Agents", link: "/agents/" },
            { label: "Instructions", link: "/instructions/" },
            { label: "Skills", link: "/skills/" },
            { label: "Hooks", link: "/hooks/" },
            { label: "Workflows", link: "/workflows/" },
            { label: "Plugins", link: "/plugins/" },
            { label: "Tools", link: "/tools/" },
            { label: "Contributors", link: "/contributors/" },
            {
              label: "Tips & Triks",
              items: [
                "tips-and-tricks/fa-ki-en-til-a-forsta-deg",
                "tips-and-tricks/fa-dybde-ikke-fluff",
                "tips-and-tricks/ki-en-som-sparringspartner",
                "tips-and-tricks/iterasjon-er-nokkelen",
                "tips-and-tricks/oppsummeringer-som-faktisk-fungerer",
                "tips-and-tricks/sikkerhet-og-ansvarlig-bruk",
                "tips-and-tricks/skriv-bedre-ved-aa-skrive-mindre",
                "tips-and-tricks/strukturere-kaos-til-klarhet",
                "tips-and-tricks/fa-bedre-svar-med-eksempler",
                "tips-and-tricks/presentasjoner-med-substans",
                "tips-and-tricks/kontekst-og-hukommelse",
                "tips-and-tricks/din-personlige-ki-arbeidsflyt",
                "tips-and-tricks/spesialutgave-for-utviklerne",
                "tips-and-tricks/context-engineering",
                "tips-and-tricks/ki-assistent-agent-eller-agentisk-ki",
                "tips-and-tricks/ki-verktoy-hva-er-hva",
                "tips-and-tricks/llm-rag-agenter-agentisk-ki",
                "tips-and-tricks/harness-skills-hooks-og-mcp",
                "tips-and-tricks/slutt-aa-sporre-ki-om-ting-den-ikke-vet",
              ],
            },
          ],
        },
        {
          label: "Fundamentals",
          items: [
            "learning-hub/what-are-agents-skills-instructions",
            "learning-hub/understanding-copilot-context",
            "learning-hub/copilot-configuration-basics",
            "learning-hub/defining-custom-instructions",
            "learning-hub/creating-effective-skills",
            "learning-hub/building-custom-agents",
            "learning-hub/understanding-mcp-servers",
            "learning-hub/automating-with-hooks",
            "learning-hub/agentic-workflows",
            "learning-hub/using-copilot-coding-agent",
            "learning-hub/installing-and-using-plugins",
            "learning-hub/before-after-customization-examples",
          ],
        },
        {
          label: "Reference",
          items: ["learning-hub/github-copilot-terminology-glossary"],
        },
        {
          label: "Hands-on",
          items: [
            {
              label: "Cookbook",
              link: "/learning-hub/cookbook/",
            },
          ],
        },
      ],
      disable404Route: true,
      // pagefind: true is required so Starlight renders the search UI.
      // Our pagefindResources() integration overwrites the index after build.
      pagefind: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      components: {
        Head: "./src/components/Head.astro",
        Header: "./src/components/Header.astro",
        Footer: "./src/components/Footer.astro",
      },
    }),
    sitemap(),
    pagefindResources(),
  ],
  redirects: {
    "/samples/": "/learning-hub/cookbook/",
  },
  build: {
    assets: "assets",
  },
  trailingSlash: "always",
  vite: {
    build: {
      sourcemap: true,
    },
    css: {
      devSourcemap: true,
    },
  },
});
