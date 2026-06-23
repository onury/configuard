// @ts-check
// Per-project Astro + Starlight config. The shared THEME comes from
// @onury/docs-kit via the CSS string paths in `customCss` below.
//
// NOTE: do NOT `import` from @onury/docs-kit here. It is ESM-only, and importing
// it into the Astro config makes Vite externalize @astrojs/starlight and load its
// TypeScript entry under Node, which fails on Node >=22.18.
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

const [starlightTypeDoc, typeDocSidebarGroup] = createStarlightTypeDocPlugin();

/**
 * Drops the auto-generated `## Constructors` heading from the TypeDoc API
 * pages (each class has a single constructor, so the title is noise).
 */
function remarkDropConstructorsHeading() {
  return (/** @type {any} */ tree) => {
    tree.children = tree.children.filter(
      (/** @type {any} */ node) =>
        !(
          node.type === 'heading' &&
          node.depth === 2 &&
          node.children?.length === 1 &&
          node.children[0].value === 'Constructors'
        )
    );
  };
}

export default defineConfig({
  site: 'https://onury.io',
  base: "/configuard",
  markdown: { remarkPlugins: [remarkDropConstructorsHeading] },
  integrations: [
    starlight({
      title: "Configuard",
      logo: { light: './src/assets/configuard-mark-on-light.svg', dark: './src/assets/configuard-mark-on-dark.svg', replacesTitle: true, alt: 'Configuard' },
      description: "Builds a nested, typed configuration object from a flat list of config items, with templating and accessor-based (ABAC) filtering. Built on notation.",
      social: [{ icon: 'github', label: 'GitHub', href: "https://github.com/onury/configuard" }],
      components: { Head: '@onury/docs-kit/components/Head.astro' },
      customCss: [
        '@onury/docs-kit/styles/custom.css',
        '@onury/docs-kit/styles/theme.css',
        './src/styles/overrides.css',
        './src/styles/hero.css'
      ],
      plugins: [
        starlightTypeDoc({
          entryPoints: ['../src/index.ts'],
          tsconfig: '../tsconfig.build.json',
          output: 'api',
          sidebar: { label: 'API Reference', collapsed: false },
          typeDoc: { githubPages: false, excludeInternal: true, sort: ['source-order'] }
        })
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [{ label: 'Getting Started', slug: 'getting-started' }]
        },
        {
          label: 'Concepts',
          items: [
            { label: 'The Config Item', slug: 'concepts/config-item' },
            { label: 'Value & List Types', slug: 'concepts/value-types' },
            { label: 'Templating', slug: 'concepts/templating' },
            { label: 'Option Lists', slug: 'concepts/option-lists' },
            { label: 'Access Control (ABAC)', slug: 'concepts/access-control' },
            { label: 'Building & Reading', slug: 'concepts/building' },
            { label: 'Validation — Fail Loud', slug: 'concepts/validation' },
            { label: 'Encryption', slug: 'concepts/encryption' }
          ]
        },
        {
          label: 'Guides',
          items: [{ label: 'Admin UI Workflow', slug: 'guides/admin-ui' }]
        },
        {
          label: 'Help',
          items: [
            { label: 'FAQ', slug: 'faq' },
            { label: 'Changelog', slug: 'changelog' }
          ]
        },
        typeDocSidebarGroup
      ]
    })
  ]
});
