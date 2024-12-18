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
      // somehow update app/router.tsx

      console.log("now run `npx convex dev` and you're off!")


      if (cfg.really) {
        debug.info('Setting up Convex');

        debug.info('Goal is to add to package.json here')
      } else {
        debug.info('do nothing')
      }
    },
  })

