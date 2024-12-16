import yoctoSpinner from 'yocto-spinner'
import {
  checkFolderExists,
  checkFolderIsEmpty,
} from './utils/helpers/base-utils'
import type {
  ParseReturnType,
  SafeParseReturnType,
  ZodType,
  input,
  output,
  z,
} from 'zod'
import type { Spinner } from 'yocto-spinner'

type Schema = ZodType<any, any, any>

class ModuleBase<TSchema extends Schema> {
  private _baseSchema: TSchema

  constructor(baseSchema: TSchema) {
    this._baseSchema = baseSchema
  }

  init<TInitSchema extends Schema>(
    fn: (baseSchema: TSchema) => TInitSchema,
  ): InitModule<TSchema, TInitSchema> {
    const schema = fn(this._baseSchema)
    return new InitModule<TSchema, TInitSchema>(this._baseSchema, schema)
  }
}

class InitModule<TSchema extends Schema, TInitSchema extends Schema> {
  private _baseSchema: TSchema
  private _initSchema: TInitSchema

  constructor(baseSchema: TSchema, initSchema: TInitSchema) {
    this._baseSchema = baseSchema
    this._initSchema = initSchema
  }

  prompt<TPromptSchema extends Schema>(
    fn: (initSchema: TInitSchema) => TPromptSchema,
  ): PromptModule<TSchema, TInitSchema, TPromptSchema> {
    const schema = fn(this._initSchema)
    return new PromptModule<TSchema, TInitSchema, TPromptSchema>(
      this._baseSchema,
      this._initSchema,
      schema,
    )
  }
}

class PromptModule<
  TSchema extends Schema,
  TInitSchema extends Schema,
  TPromptSchema extends Schema,
> {
  private _baseSchema: TSchema
  private _initSchema: TInitSchema
  private _promptSchema: TPromptSchema

  constructor(
    baseSchema: TSchema,
    initSchema: TInitSchema,
    promptSchema: TPromptSchema,
  ) {
    this._baseSchema = baseSchema
    this._initSchema = initSchema
    this._promptSchema = promptSchema
  }

  validateAndApply<
    TApplyFn extends ApplyFn<TPromptSchema>,
    TValidateFn extends ValidateFn<TPromptSchema>,
  >({
    validate,
    apply,
    spinnerConfigFn,
  }: {
    validate?: TValidateFn
    apply: TApplyFn
    spinnerConfigFn?: SpinnerConfigFn<TPromptSchema>
  }): FinalModule<TSchema, TInitSchema, TPromptSchema, TValidateFn, TApplyFn> {
    return new FinalModule<
      TSchema,
      TInitSchema,
      TPromptSchema,
      TValidateFn,
      TApplyFn
    >(
      this._baseSchema,
      this._initSchema,
      this._promptSchema,
      apply,
      validate,
      spinnerConfigFn,
    )
  }
}

type ApplyFn<TPromptSchema extends Schema> = (opts: {
  targetPath: string
  cfg: z.output<TPromptSchema>
}) => void | Promise<void>

type ValidateFn<TPromptSchema extends Schema> = (opts: {
  targetPath: string
  cfg: z.output<TPromptSchema>
}) => Promise<Array<string>> | Array<string>

type SpinnerOptions = {
  success: string
  error: string
  inProgress: string
}

type SpinnerConfigFn<TValidateSchema extends Schema> = (
  cfg: z.infer<TValidateSchema>,
) => SpinnerOptions | undefined

class FinalModule<
  TSchema extends Schema,
  TInitSchema extends Schema,
  TPromptSchema extends Schema,
  TValidateFn extends ValidateFn<TPromptSchema>,
  TApplyFn extends ApplyFn<TPromptSchema>,
> {
  public _baseSchema: TSchema
  public _initSchema: TInitSchema
  public _promptSchema: TPromptSchema
  public _applyFn: TApplyFn
  public _validateFn: TValidateFn | undefined
  public _spinnerConfigFn: SpinnerConfigFn<TPromptSchema> | undefined

  constructor(
    baseSchema: TSchema,
    initSchema: TInitSchema,
    promptSchema: TPromptSchema,
    applyFn: TApplyFn,
    validateFn?: TValidateFn,
    spinnerConfigFn?: SpinnerConfigFn<TPromptSchema>,
  ) {
    this._baseSchema = baseSchema
    this._initSchema = initSchema
    this._promptSchema = promptSchema
    this._applyFn = applyFn
    this._validateFn = validateFn
    if (spinnerConfigFn) this._spinnerConfigFn = spinnerConfigFn
  }

  async init(cfg: input<TInitSchema>): Promise<ParseReturnType<TInitSchema>> {
    return await this._initSchema.parseAsync(cfg)
  }

  public async initSafe(
    cfg: input<TInitSchema>,
  ): Promise<SafeParseReturnType<input<TInitSchema>, output<TInitSchema>>> {
    return await this._initSchema.safeParseAsync(cfg)
  }

  public async prompt(
    cfg: input<TPromptSchema>,
  ): Promise<SafeParseReturnType<input<TPromptSchema>, output<TPromptSchema>>> {
    return await this._promptSchema.parseAsync(cfg)
  }

  public async validate(
    cfg: input<TPromptSchema>,
  ): Promise<SafeParseReturnType<input<TPromptSchema>, output<TPromptSchema>>> {
    return await this._promptSchema.safeParseAsync(cfg)
  }

  public async apply({
    cfg,
    targetPath,
  }: {
    cfg: output<TPromptSchema>
    targetPath: string
  }) {
    const spinnerOptions = this._spinnerConfigFn?.(cfg)
    await runWithSpinner({
      fn: async () => {
        return await this._applyFn({ cfg, targetPath })
      },
      spinnerOptions,
    })
  }

  public async execute({
    cfg,
    targetPath,
    type,
    applyingMessage,
  }: {
    cfg: input<TSchema>
    targetPath: string
    type: 'new-project' | 'update'
    applyingMessage?: string
  }) {
    const targetExists = await checkFolderExists(targetPath)
    const targetIsEmpty = await checkFolderIsEmpty(targetPath)

    if (type === 'new-project') {
      if (targetExists && !targetIsEmpty) {
        console.error("The target folder isn't empty")
        process.exit(0)
      }
    }

    if (type === 'update') {
      if (!targetExists) {
        console.error("The target folder doesn't exist")
        process.exit(0)
      }
    }

    const initState = await this._initSchema.parseAsync(cfg)

    const promptState = await this._promptSchema.parseAsync(initState)

    if (applyingMessage) {
      console.log()
      console.log(applyingMessage)
    }
    await this.apply({ cfg: promptState, targetPath })
  }
}

export function createModule<TSchema extends Schema>(
  baseSchema: TSchema,
): ModuleBase<TSchema> {
  return new ModuleBase<TSchema>(baseSchema)
}

export const runWithSpinner = async ({
  spinnerOptions,
  fn,
}: {
  spinnerOptions: SpinnerOptions | undefined
  fn: () => Promise<void>
}) => {
  let spinner: Spinner

  if (spinnerOptions != undefined) {
    spinner = yoctoSpinner({
      text: spinnerOptions.inProgress,
    }).start()
  }

  try {
    await fn()
    if (spinnerOptions) {
      spinner!.success(spinnerOptions.success)
    }
  } catch (e) {
    if (spinnerOptions) {
      spinner!.error(spinnerOptions.error)
    }
    throw e
  }
}
