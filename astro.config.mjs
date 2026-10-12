// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'PUBLIC_');
const site = (env.PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');

export default defineConfig({
  output: 'static',
  ...(site ? { site } : {}),
  build: { inlineStylesheets: 'auto' },
});
