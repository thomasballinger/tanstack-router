import { select } from '@inquirer/prompts'
import { InvalidArgumentError, createOption } from '@commander-js/extra-typings'
import invariant from 'tiny-invariant'
import { barebonesTemplate } from './barebones'
import type { coreModule } from '../modules/core'
import type { z } from 'zod'

const templates = [
  {
    id: 'barebones',
    name: 'Barebones',
    module: barebonesTemplate,
    description: 'The bare minimum',
  },
] as const

const templateIds = templates.map((t) => t.id)
export type TEMPLATE_NAME = (typeof templateIds)[number]
export const DEFAULT_TEMPLATE: TEMPLATE_NAME = 'barebones'

export const templateCliOption = createOption(
  '--template <string>',
  'Choose the template to use',
).argParser((value) => {
  if (!templateIds.includes(value as TEMPLATE_NAME)) {
    throw new InvalidArgumentError(
      `Invalid Template: ${value}. Only the following are allowed: ${templateIds.join(', ')}`,
    )
  }
  return value as TEMPLATE_NAME
})

export const templatePrompt = async () =>
  await select({
    message: 'Which template would you like to use?',
    choices: templates.map((t) => ({
      name: t.name,
      value: t.id,
      description: t.description,
    })),
    default: DEFAULT_TEMPLATE,
  })

export const scaffoldTemplate = async ({
  templateId,
  cfg,
  targetPath,
}: {
  templateId: TEMPLATE_NAME
  cfg: z.input<typeof coreModule._baseSchema>
  targetPath: string
}) => {
  // const template = templates.find((f) => f.id === templateId)
  const template = templates[0] // Remove this when we add more templates
  invariant(template, `The template with ${templateId} is not valid`)

  await template.module.execute({
    cfg,
    targetPath,
    type: 'new-project',
    applyingMessage: `Scaffolding the ${template.name} template`,
  })
}
