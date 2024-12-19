import { z } from 'zod'
import { createModule } from '../module'

import { createDebugger } from '../utils/debug'
import {select} from '@inquirer/prompts';
import {initHelpers} from '../utils/helpers';
import {installPackages} from '../utils/runPackageManagerCommand';
import {getPackageManager} from '../utils/getPackageManager';
import {dirname} from 'path';
import {fileURLToPath} from 'url';
import {runCmd} from '../utils/runCmd';

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const debug = createDebugger('convex');

const schema = z.object({
  really: z.enum(['yes', 'no']).optional(),
})

export const convexModule = createModule(schema)
  // init is for adding data at runtime (scour the filesystem etc.)
  .init((schema) => schema)
  // prompt is for prompting
  .prompt((schema) =>
    schema.transform(async (vals) => {
      debug.verbose('Prompting for convex options', vals)

      const really = vals.really != undefined
          ? vals.really
          : await select({
              message: 'Do you really want to use Convex?',
              choices: ['yes', 'no'].map((resp) => ({ value: resp })),
              default: "yes"
            })

      debug.verbose('really selected', { really, })
      return { really }
    }),
  )
  .validateAndApply({
    apply: async ({ cfg, targetPath }) => {
      const _ = initHelpers(__dirname, targetPath)
      const detectedPM = getPackageManager()
      await installPackages(detectedPM || 'npm', [
        "@convex-dev/react-query",
        "@tanstack/react-router-with-query",
        "@tanstack/react-query"
      ]);
      await runCmd('npx', ['convex', 'codegen'])

      // somehow update app/routes/__root.tsx
      ensureImport("./app/routes/__root.tsx", {
        packageName: "@tanstack/react-query",
        importName: "QueryClient"
      });
      ensureImport("./app/routes/__root.tsx", {
        packageName: "@tanstack/react-router",
        importName: "createRootRouteWithContext"
      });

      replaceRootRoute("./app/routes/__root.tsx");

      // somehow update app/router.tsx
      writeFileSync("./app/router.tsx", router, 'utf-8');

      console.log("now run `npx convex dev` and you're off!")


      if (cfg.really) {
        debug.info('Setting up Convex');

        debug.info('Goal is to add to package.json here')
      } else {
        debug.info('do nothing')
      }
    },
  })


import { parse } from "@typescript-eslint/parser";
import { readFileSync, writeFileSync } from "fs";

interface ImportCheck {
  packageName: string;
  importName: string;
}

function hasSpecificImport(filename: string, { packageName, importName }: ImportCheck): boolean {
  const code = readFileSync(filename, 'utf-8');
  const ast = parse(code, {
    ecmaVersion: 2022,
    sourceType: "module",
    jsx: true
  });

  return ast.body.some(node => 
    node.type === "ImportDeclaration" &&
    node.source.value === packageName &&
    node.specifiers.some(spec => 
      spec.type === "ImportSpecifier" && 
      'name' in spec.imported && 
      spec.imported.name === importName
    )
  );
}

function addImport(filename: string, { packageName, importName }: ImportCheck): void {
  let code = readFileSync(filename, 'utf-8');
  
  const importStatement = `import { ${importName} } from "${packageName}";\n`;
  
  const firstImportMatch = code.match(/^import .+?;/m);
  if (firstImportMatch) {
    const index = firstImportMatch.index || 0;
    code = code.slice(0, index) + importStatement + code.slice(index);
  } else {
    code = importStatement + code;
  }
  
  writeFileSync(filename, code, 'utf-8');
}

function ensureImport(filename: string, importDetails: ImportCheck): void {
  if (!hasSpecificImport(filename, importDetails)) {
    addImport(filename, importDetails);
  }
}

function replaceRootRoute(filename: string): boolean {
 const code = readFileSync(filename, 'utf-8');
 
 const ast = parse(code, {
   ecmaVersion: 2022,
   sourceType: "module",
   jsx: true
 });

 let foundCall = false;

 ast.body.forEach(node => {
   if (
     node.type === "ExportNamedDeclaration" &&
     node.declaration?.type === "VariableDeclaration" &&
     node.declaration.declarations[0]?.init?.type === "CallExpression" &&
     node.declaration.declarations[0].init.callee.type === "Identifier" &&
     node.declaration.declarations[0].init.callee.name === "createRootRoute"
   ) {
     foundCall = true;
   }
 });

 if (!foundCall) {
   console.log(`No 'createRootRoute' calls found in ${filename}`);
   return false;
 }

 const newCode = code.replace(
   /createRootRoute\({/,
   'createRootRouteWithContext<{ queryClient: QueryClient; }>()({'
 );

 writeFileSync(filename, newCode, 'utf-8');
 console.log(`Successfully updated ${filename}`);
 return true;
}


const router = `import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexProvider } from "convex/react";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!;
  if (!CONVEX_URL) {
    console.error("missing envar VITE_CONVEX_URL");
  }
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      defaultPreload: "intent",
      context: { queryClient },
      Wrap: ({ children }) => (
        <ConvexProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexProvider>
      ),
    }),
    queryClient,
  );

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}`;
