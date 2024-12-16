import { z } from 'zod'
import { select } from '@inquirer/prompts'
import { createModule } from '../module'
import { initGit } from '../utils/runCmd'

export const gitModule = createModule(
  z.object({
    setupGit: z.boolean().optional(),
  }),
)
  .init((schema) => schema) // No init required
  .prompt((schema) =>
    schema.transform(async (vals) => {
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
      return {
        setupGit,
      }
    }),
  )
  .validateAndApply({
    apply: async ({ cfg, targetPath }) => {
      if (cfg.setupGit) {
        await initGit(targetPath)
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
