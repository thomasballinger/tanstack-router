import { InvalidArgumentError, createOption } from '@commander-js/extra-typings'
import { z } from 'zod'
import { select } from '@inquirer/prompts'
import { createModule } from '../module'
import { vsCodeModule } from './vscode'

const ide = z.enum(['vscode', 'cursor', 'other'])

const schema = z.object({
  ide: ide.optional(),
})

const SUPPORTED_IDES = ide.options
type SupportedIDE = z.infer<typeof ide>
const DEFAULT_IDE = 'vscode'

export const ideCliOption = createOption(
  `--ide <${SUPPORTED_IDES.join('|')}>`,
  `use this IDE (${SUPPORTED_IDES.join(', ')})`,
).argParser((value) => {
  if (!SUPPORTED_IDES.includes(value as SupportedIDE)) {
    throw new InvalidArgumentError(
      `Invalid IDE: ${value}. Only the following are allowed: ${SUPPORTED_IDES.join(', ')}`,
    )
  }
  return value as SupportedIDE
})

export const ideModule = createModule(schema)
  .init((schema) => schema)
  .prompt((schema) =>
    schema.transform(async (vals) => {
      const ide = vals.ide
        ? vals.ide
        : await select({
            message: 'Select an IDE',
            choices: SUPPORTED_IDES.map((i) => ({ value: i })),
            default: DEFAULT_IDE,
          })

      return {
        ide,
      }
    }),
  )
  .validateAndApply({
    validate: async ({ cfg, targetPath }) => {
      const issues: Array<string> = []

      if (cfg.ide === 'vscode') {
        const issuesVsCode =
          (await vsCodeModule._validateFn?.({ cfg, targetPath })) ?? []
        issues.push(...issuesVsCode)
      }
      return issues
    },
    apply: async ({ cfg, targetPath }) => {
      await vsCodeModule._applyFn({ cfg, targetPath })
    },
    spinnerConfigFn: (cfg) => {
      return ['vscode'].includes(cfg.ide)
        ? {
            error: `Failed to set up ${cfg.ide}`,
            inProgress: `Setting up ${cfg.ide}`,
            success: `${cfg.ide} set up`,
          }
        : undefined
    },
  })

// export const ideModuleaa = createModule({
//   interimStateSchema: schema.partial(),
//   finalStateSchema: schema,
// })
//   .promptFn(async ({ state }) => {
//     const ide = state.ide
//       ? state.ide
//       : await select({
//           message: 'Select an IDE',
//           choices: SUPPORTED_IDES.map((ide) => ({ value: ide })),
//           default: DEFAULT_IDE,
//         })

//     return {
//       ide,
//     }
//   })
//   .validateFn(async ({ state, targetPath }) => {
//     const issues: Array<string> = []

//     if (state.ide === 'vscode') {
//       const issuesVsCode = await vsCodeModule._validate({ state, targetPath })
//       issues.push(...issuesVsCode)
//     }
//     return issues
//   })
//   .spinnerConfig(({ state }) => {
//     return ['vscode'].includes(state.ide)
//       ? {
//           error: `Failed to set up ${state.ide}`,
//           inProgress: `Setting up ${state.ide}`,
//           success: `${state.ide} set up`,
//         }
//       : undefined
//   })
//   .applyFn(async ({ state, targetPath }) => {
//     await vsCodeModule._apply({ state, targetPath })
//   })
