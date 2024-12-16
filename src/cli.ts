
debug.info('Starting CLI action', { options })import { initDebug, createDebugger } from './utils/debug'

const debug = createDebugger('cli')

export async function runCli(argv: Array<string>) {
if (argv.includes('--debug')) {
const debugIndex = argv.indexOf('--debug')
const debugLevel = argv[debugIndex + 1]
initDebug(Number(debugLevel) || 1)
debug.info('Debug mode enabled', { level: debugLevel || 1 })
}
