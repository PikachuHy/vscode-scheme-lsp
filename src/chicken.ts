import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as hasbin from 'hasbin';
import { waitForFile } from './util';

const lspChickenServerDirName = 'lsp-chicken-server'
const lspChickenServerExecutableName = 'chicken-lsp-server'

export function setupChickenEnvironment(context: vscode.ExtensionContext, terminal: vscode.Terminal)
{
    const targetDir = path.join(context.extensionPath, lspChickenServerDirName)
    terminal.sendText(`current_repository_path=$(csi -e '(import (chicken platform)) (for-each (lambda (p) (display p) (display \":\")) (repository-path))') && \
                       export CHICKEN_REPOSITORY_PATH=${targetDir}:$current_repository_path`)
}

export function ensureChickenLspServer(context: vscode.ExtensionContext, force: boolean = false)
{
    if ((! fs.existsSync(path.join(context.extensionPath, lspChickenServerDirName, 'bin', lspChickenServerExecutableName))
         && ! hasbin.sync(lspChickenServerExecutableName))
         || force) {
        installChickenLspServer(context)
    }
}


export async function installChickenLspServer(context: vscode.ExtensionContext)
{
    const targetDir = path.join(context.extensionPath, lspChickenServerDirName);

    fs.unlink(targetDir, async (err) => {
        if (err) {
            console.error(`Could not delete ${targetDir}: ${err.message}`);
        }
        console.log(`Successfully deleted ${targetDir}`);
        const terminal = vscode.window.createTerminal(`Chicken LSP install`);
        terminal.sendText(`CHICKEN_INSTALL_REPOSITORY=${targetDir} CHICKEN_INSTALL_PREFIX=${targetDir} chicken-install lsp-server`)
        await waitForFile(path.join(targetDir, lspChickenServerExecutableName))
      })
}