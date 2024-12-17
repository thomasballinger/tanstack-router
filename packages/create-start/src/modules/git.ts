import { z } from 'zod'
import { select } from '@inquirer/prompts'
import { createModule } from '../module'
import { runCmd } from '../utils/runCmd'
import { createDebugger } from '../utils/debug'

const debug = createDebugger('git-module')

export const gitModule = createModule(
  z.object({
    setupGit: z.boolean().optional(),
  }),
)
  .init((schema) => schema) // No init required
  .prompt((schema) =>
    schema.transform(async (vals) => {
      debug.verbose('Transforming git prompt schema', { vals })
      const setupGit =
        vals.setupGit != undefined
          ? vals.setupGit
          : await select({
              message: 'Initialize git',
              choices: [
                { name: 'yes', value: true },
                { name: 'no', value: false },
              ],
              default: 'yes',
            })
      debug.info('Git initialization choice made', { setupGit })
      return {
        setupGit,
      }
    }),
  )
  .validateAndApply({
    apply: async ({ cfg, targetPath }) => {
      debug.verbose('Applying git module', { cfg, targetPath })
      if (cfg.setupGit) {
        debug.info('Initializing git repository')
        try {
          await runCmd('git', ['init'])

          debug.info('Git repository initialized successfully')
        } catch (error) {
          debug.error('Failed to initialize git repository', error)
          throw error
        }
      } else {
        debug.info('Skipping git initialization')
      }
    },
    spinnerConfigFn: () => {
      return {
        success: 'Git initalized',
        error: 'Failed to initialize git',
        inProgress: 'Initializing git',
      }
    },
  })
