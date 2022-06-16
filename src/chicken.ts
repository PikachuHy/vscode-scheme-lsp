import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as hasbin from 'hasbin';

const lspChickenServerDirName = 'lsp-chicken-server'
const lspChickenServerExecutableName = 'chicken-lsp-server'

export async function setupChickenEnvironment(context: vscode.ExtensionContext, terminal: vscode.Terminal)
{
    const targetDir = path.join(context.extensionPath, lspChickenServerDirName)
    terminal.sendText("current_repository_path=$(csi -e '(import (chicken platform)) (for-each (lambda (p) (display p) (display \":\")) (repository-path))')")
    terminal.sendText(`export CHICKEN_REPOSITORY_PATH=${targetDir}:$current_repository_path`)
    
}

export async function ensureChickenLspServer(context: vscode.ExtensionContext, force: boolean = false)
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
    
    fs.unlink(targetDir, (err) => {
        if (err) {
            console.error(`Could not delete ${targetDir}: ${err.message}`);
            throw err
        }
        console.log(`Successfully deleted ${targetDir}`);
      })

    const terminal = vscode.window.createTerminal(`Chicken LSP install`);
    terminal.sendText(`CHICKEN_INSTALL_REPOSITORY=${targetDir} CHICKEN_INSTALL_PREFIX=${targetDir} chicken-install lsp-server`)
}