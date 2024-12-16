// // The core module for creating a Tanstack Start app
// // Also calls the:
// // - ide module - to set ide specific settings
// // - packageJson module - create a packageJson file with up-to-date packages

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import packageJsonModule from '../packageJson'
import { createModule, runWithSpinner } from '../../module'
import { ideModule } from '../ide'
import packageJson from '../../../package.json' assert { type: 'json' }
import packageManagerModule from '../packageManager'
import { initHelpers } from '../../utils/helpers'
import { gitModule } from '../git'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const coreModule = createModule(
  z.object({
    packageJson: packageJsonModule._initSchema.optional(),
    ide: ideModule._initSchema.optional(),
    packageManager: packageManagerModule._initSchema.optional(),
    git: gitModule._initSchema.optional(),
  }),
)
  .init((schema) =>
    schema.transform(async (vals, ctx) => {
      const packageJson: z.infer<typeof packageJsonModule._initSchema> = {
        type: 'new',
        dependencies: await deps([
          '@tanstack/react-router',
          '@tanstack/start',
          'react',
          'react-dom',
          'vinxi',
        ]),
        devDependencies: await deps(['@types/react', '@types/react']),
        scripts: [
          {
            name: 'dev',
            script: 'vinxi dev',
          },
          {
            name: 'build',
            script: 'vinxi build',
          },
          {
            name: 'start',
            script: 'vinxi start',
          },
        ],
        ...vals.packageJson,
      }

      const packageManager =
        await packageManagerModule._initSchema.safeParseAsync(
          vals.packageManager,
          {
            path: ['packageManager'],
          },
        )
      const ide = await ideModule._initSchema.safeParseAsync(vals.ide, {
        path: ['ide'],
      })
      const git = await gitModule._initSchema.safeParseAsync(vals.git, {
        path: ['git'],
      })

      if (!ide.success || !packageManager.success || !git.success) {
        ide.error?.issues.forEach((i) => ctx.addIssue(i))
        packageManager.error?.issues.forEach((i) => ctx.addIssue(i))
        git.error?.issues.forEach((i) => ctx.addIssue(i))
        throw Error('Failed vlaidation')
      }

      return {
        ...vals,
        packageManager: packageManager.data,
        ide: ide.data,
        git: git.data,
        packageJson,
      }
    }),
  )
  .prompt((schema) =>
    schema.transform(async (vals, ctx) => {
      const ide = await ideModule._promptSchema.safeParseAsync(vals.ide, {
        path: ['ide'],
      })

      const packageManager =
        await packageManagerModule._promptSchema.safeParseAsync(
          vals.packageManager,
          { path: ['packageManager'] },
        )

      const git = await gitModule._promptSchema.safeParseAsync(vals.git, {
        path: ['git'],
      })

      const packageJson = await packageJsonModule._promptSchema.safeParseAsync(
        vals.packageJson,
        {
          path: ['packageJson'],
        },
      )

      if (
        !ide.success ||
        !packageManager.success ||
        !git.success ||
        !packageJson.success
      ) {
        ide.error?.issues.forEach((i) => ctx.addIssue(i))
        packageManager.error?.issues.forEach((i) => ctx.addIssue(i))
        git.error?.issues.forEach((i) => ctx.addIssue(i))
        throw Error('Failed vlaidation')
      }

      return {
        packageJson: packageJson.data,
        ide: ide.data,
        packageManager: packageManager.data,
        git: git.data,
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

      if (ideModule._validateFn) {
        const issues = await ideModule._validateFn({ cfg: cfg.ide, targetPath })
        issues.push()
      }

      return issues
    },
    apply: async ({ cfg, targetPath }) => {
      const _ = initHelpers(__dirname, targetPath)

      await runWithSpinner({
        spinnerOptions: {
          inProgress: 'Copying core template files',
          error: 'Failed to copy core template files',
          success: 'Copied core template files',
        },
        fn: async () =>
          await _.copyTemplateFiles({
            file: '**/*',
            templateFolder: './template',
            targetFolder: '.',
            overwrite: false,
          }),
      })

      await packageJsonModule.apply({ cfg: cfg.packageJson, targetPath })

      await ideModule.apply({ cfg: cfg.ide, targetPath })
      await gitModule._applyFn({ cfg: cfg.git, targetPath })
      await packageManagerModule.apply({
        cfg: cfg.packageManager,
        targetPath,
      })
    },
  })

type DepNames<
  T extends
    (typeof packageJson)['peerDependencies'] = (typeof packageJson)['peerDependencies'],
> = keyof T

const deps = async (
  depsArray: Array<DepNames>,
): Promise<
  Exclude<
    z.infer<typeof packageJsonModule._initSchema>['dependencies'],
    undefined
  >
> => {
  const result = await Promise.all(
    depsArray.map((d) => {
      const version =
        packageJson['peerDependencies'][d] === 'workspace:^'
          ? 'latest' // Use latest in development
          : packageJson['peerDependencies'][d]
      return {
        name: d,
        version: version,
      }
    }),
  )

  return result
}
