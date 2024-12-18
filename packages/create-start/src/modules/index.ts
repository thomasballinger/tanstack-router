
import type {z} from 'zod';
import {modules} from '..'
import { createDebugger } from '../utils/debug'

const debug = createDebugger('templates')

console.log(modules)


export type MODULE_ID = keyof typeof modules;


export const addModule = async({
  moduleId,
  targetPath,
}: {
  moduleId: MODULE_ID,
  targetPath: string
}) => {


}
