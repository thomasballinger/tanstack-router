import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { input } from '@inquirer/prompts'
import { InvalidArgumentError, createOption } from '@commander-js/extra-typings'
import { initHelpers } from '../utils/helpers'
import { createModule } from '../module'
import { validateProjectName } from '../utils/validateProjectName'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const packageNameCliOption = createOption(
  '--package-name <string>',
  'The name to use in the package.json',
).argParser((name) => {
  const validation = validateProjectName(name)
  if (!validation.valid) {
    throw new InvalidArgumentError(`The project name ${name} is invalid`)
  }
  return name
})

const dependencies = z.array(
  z.object({
    name: z.string(),
    version: z.string(),
  }),
)

const script = z.object({
  name: z.string(),
  script: z.string(),
})

const schema = z.object({
  type: z.enum(['new', 'update']),
  name: z.string().optional(),
  dependencies: dependencies.optional(),
  devDependencies: dependencies.optional(),
  scripts: z.array(script).optional(),
})

const packageJsonModule = createModule(schema)
  .init((schema) => schema)
  .prompt((schema) => {
    return schema.transform(async (vals) => {
      if (vals.type === 'new') {
        const name = vals.name
          ? vals.name
          : await input({
              message: 'Enter the project name',
              default: 'tanstack-start',
              validate: (name) => {
                const validation = validateProjectName(name)
                if (validation.valid) {
                  return true
                }
                return 'Invalid project name: ' + validation.problems[0]
              },
            })

        return {
          ...vals,
          name,
        }
      } else {
        return vals
      }
    })
  })
  .validateAndApply({
    validate: async ({ cfg, targetPath }) => {
      const issues: Array<string> = []
      const _ = initHelpers(__dirname, targetPath)

      const packageJsonExists = await _.targetFileExists('./package.json')

      if (cfg.type === 'new') {
        if (packageJsonExists) issues.push('Package.json already exists')
      } else {
        if (!packageJsonExists)
          issues.push("Package.json doesn't exist to update")
      }

      return issues
    },
    apply: async ({ cfg, targetPath }) => {
      const _ = initHelpers(__dirname, targetPath)
      if (cfg.type === 'new') {
        const packageJson = {
          name: cfg.name,
          version: '0.0.0',
          private: true,
          type: 'module',
        }

        await _.writeTargetfile(
          './package.json',
          JSON.stringify(packageJson, null, 2),
          false,
        )
      }

      let packageJson = JSON.parse(await _.readTargetFile('./package.json'))

      const dependenciesRecord = createDepsRecord(cfg.dependencies ?? [])
      const devDependenciesRecord = createDepsRecord(cfg.devDependencies ?? [])
      const scriptsRecord = createScriptsRecord(cfg.scripts ?? [])

      packageJson = {
        ...packageJson,
        scripts: {
          ...packageJson.scripts,
          ...scriptsRecord,
        },
        dependencies: {
          ...packageJson.dependencies,
          ...dependenciesRecord,
        },
        devDependencies: {
          ...packageJson.devDependencies,
          ...devDependenciesRecord,
        },
      }

      await _.writeTargetfile(
        './package.json',
        JSON.stringify(packageJson, null, 2),
        true,
      )
    },
    spinnerConfigFn: (cfg) => ({
      success: `${cfg.type === 'new' ? 'Created' : 'Updated'} package.json`,
      error: `Failed to ${cfg.type === 'new' ? 'create' : 'update'} package.json`,
      inProgress: `${cfg.type === 'new' ? 'Creating' : 'Updating'} package.json`,
    }),
  })

export default packageJsonModule

const createDepsRecord = (deps: Array<{ name: string; version: string }>) =>
  deps.reduce(
    (acc: Record<string, string>, dep: { name: string; version: string }) => ({
      ...acc,
      [dep.name]: dep.version,
    }),
    {},
  )

const createScriptsRecord = (
  scripts: Array<{ name: string; script: string }>,
) =>
  scripts.reduce(
    (
      acc: Record<string, string>,
      script: { name: string; script: string },
    ) => ({
      ...acc,
      [script.name]: script.script,
    }),
    {},
  )
