import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const rootDir = __dirname;
const distDir = resolve(rootDir, 'dist');
const demoBase = normalizeBasePath(process.env.BASE_PATH ?? '/');

export default defineConfig(({ mode }) => {
  if (mode === 'standalone') {
    return {
      resolve: {
        alias: {
          '@': resolve(rootDir, 'src')
        }
      },
      build: {
        emptyOutDir: false,
        minify: 'esbuild',
        outDir: distDir,
        lib: {
          entry: resolve(rootDir, 'src/standalone/index.ts'),
          name: 'PixelScript',
          fileName: () => 'pixelscript.min.js',
          formats: ['iife']
        }
      }
    };
  }

  if (mode === 'demo') {
    return {
      base: demoBase,
      resolve: {
        alias: {
          '@': resolve(rootDir, 'src')
        }
      },
      build: {
        emptyOutDir: false,
        outDir: resolve(distDir, 'demo')
      }
    };
  }

  return {
    resolve: {
      alias: {
        '@': resolve(rootDir, 'src')
      }
    },
    build: {
      emptyOutDir: true,
      outDir: distDir,
      lib: {
        entry: {
          index: resolve(rootDir, 'src/index.ts'),
          'element/register': resolve(rootDir, 'src/element/register.ts')
        },
        formats: ['es'],
        fileName: (_format, entryName) => `${entryName}.js`
      }
    }
  };
});

function normalizeBasePath(value: string): string {
  if (!value.startsWith('/')) {
    return `/${value.endsWith('/') ? value : `${value}/`}`;
  }

  return value.endsWith('/') ? value : `${value}/`;
}
