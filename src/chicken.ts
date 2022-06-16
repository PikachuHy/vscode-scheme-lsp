import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as hasbin from 'hasbin';
import * as util from 'util';

const lspChickenServerDirName = 'lsp-chicken-server'
const lspChickenServerExecutableName = 'chicken-lsp-server'

export async function setupChickenEnvironment(context: vscode.ExtensionContext, terminal: vscode.Terminal)
{
    const targetDir = path.join(context.extensionPath, lspChickenServerDirName)
    terminal.sendText("current_repository_path=$(csi -e '(import (chicken platform)) (for-each (lambda (p) (display p) (display \":\")) (repository-path))')")
    terminal.sendText(`export CHICKEN_REPOSITORY_PATH=${targetDir}:$current_repository_path`)
    
}

export async function ensureChickenLspServer(context: vscode.ExtensionContext)
{
    if (! fs.existsSync(path.join(context.extensionPath, lspChickenServerDirName, 'bin', lspChickenServerExecutableName))
        && ! hasbin.sync(lspChickenServerExecutableName)) {
        installChickenLspServer(context)
    }
}

export async function installChickenLspServer(context: vscode.ExtensionContext)
{
    const terminal = vscode.window.createTerminal(`Chicken LSP install`);
    const installDir = path.join(context.extensionPath, lspChickenServerDirName);
    
    terminal.sendText(`CHICKEN_INSTALL_REPOSITORY=${installDir} CHICKEN_INSTALL_PREFIX=${installDir} chicken-install lsp-server`)
}