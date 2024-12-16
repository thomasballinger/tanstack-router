import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { createModule, runWithSpinner } from '../../module'
import { coreModule } from '../../modules/core'
import { initHelpers } from '../../utils/helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const schema = coreModule._initSchema

export const barebonesTemplate = createModule(schema)
  .init((schema) => schema)
  .prompt((schema) =>
    schema.transform(async (vals) => {
      const core = await coreModule._promptSchema.parseAsync(vals)

      return {
        ...core,
      }
    }),
  )
  .validateAndApply({
    validate: async ({ cfg, targetPath }) => {
      const _ = initHelpers(__dirname, targetPath)

      const issues = await _.getTemplateFilesThatWouldBeOverwritten({
        file: '**/*',
        templateFolder: './template',
        targetFolder: targetPath,
        overwrite: false,
      })

      issues.push(
        ...((await coreModule._validateFn?.({ cfg, targetPath })) ?? []),
      )

      return issues
    },
    apply: async ({ cfg, targetPath }) => {
      const _ = initHelpers(__dirname, targetPath)

      await runWithSpinner({
        spinnerOptions: {
          inProgress: 'Copying barebones template files',
          error: 'Failed to copy barebones template files',
          success: 'Copied barebones template files',
        },
        fn: async () =>
          await _.copyTemplateFiles({
            file: '**/*',
            templateFolder: './template',
            targetFolder: '.',
            overwrite: false,
          }),
      })

      await coreModule._applyFn({ cfg, targetPath })
    },
  })
