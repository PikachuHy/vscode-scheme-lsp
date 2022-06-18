import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as hasbin from 'hasbin';

const lspChickenServerDirName = 'lsp-chicken-server'
const lspChickenServerExecutableName = 'chicken-lsp-server'

export function setupChickenEnvironment(context: vscode.ExtensionContext, terminal: vscode.Terminal)
{
    const targetDir = path.join(context.extensionPath, lspChickenServerDirName)
    terminal.sendText(`current_repository_path=$(csi -e '(import (chicken platform)) (for-each (lambda (p) (display p) (display \":\")) (repository-path))') && \
                       export CHICKEN_REPOSITORY_PATH=${targetDir}:$current_repository_path`)
}

export function ensureChickenLspServer(
    context: vscode.ExtensionContext,
    force: boolean = false,
    callback: () => void = () => {})
{
    if ((! fs.existsSync(path.join(context.extensionPath, lspChickenServerDirName, 'bin', lspChickenServerExecutableName))
         && ! hasbin.sync(lspChickenServerExecutableName))
         || force) {
        installChickenLspServer(context, callback)
    } else {
        callback()
    }
}

export async function installChickenLspServer(
    context: vscode.ExtensionContext,
    callback: () => void)
{
    const targetDir = path.join(context.extensionPath, lspChickenServerDirName);

    fs.unlink(targetDir, async (err) => {
        if (err) {
            console.error(`Could not delete ${targetDir}: ${err.message}`);
        }
        console.log(`Successfully deleted ${targetDir}`);
        let witnessFile = path.join(targetDir, 'bin', lspChickenServerExecutableName)

        fs.mkdirSync(path.dirname(witnessFile), {recursive: true})
        // create an empty file and monitor it for changes to detect installation end.
        fs.writeFileSync(witnessFile, "")
        const terminal = vscode.window.createTerminal(`Chicken LSP install`);
        terminal.sendText(`CHICKEN_INSTALL_REPOSITORY=${targetDir} CHICKEN_INSTALL_PREFIX=${targetDir} chicken-install lsp-server`)

        fs.watch(witnessFile,
            (eventType, filename) => {
                if (eventType === 'change') {
                    callback()
                }
            })
      })
}