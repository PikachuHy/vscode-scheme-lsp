import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as hasbin from 'hasbin';
import {downloadJsonRpcTarball, downloadLspServerTarball} from './util';
const lspGuileServerDirName = 'lsp-guile-server'
const lspGuileServerExecutableName = 'guile-lsp-server'


export async function ensureGuileLspServer(context: vscode.ExtensionContext)
{
    if (! fs.existsSync(path.join(context.extensionPath, lspGuileServerDirName, 'bin', lspGuileServerExecutableName))
        && ! hasbin.sync(lspGuileServerExecutableName)) {    
        await installGuileJsonRpcServer(context)
        
        await installGuileLspServer(context)
    }
}

export async function setupGuileEnvironment(context: vscode.ExtensionContext, terminal: vscode.Terminal)
{
    const targetDir = path.join(context.extensionPath, lspGuileServerDirName)
    terminal.sendText(`export GUILE_LOAD_COMPILED_PATH=${targetDir}:${targetDir}/lib/guile/3.0/site-ccache/:$GUILE_LOAD_COMPILED_PATH\n`)
    terminal.sendText(`export GUILE_LOAD_PATH=${targetDir}:${targetDir}/share/guile/3.0/:$GUILE_LOAD_PATH\n`)
}

export async function installGuileTarball(context: vscode.ExtensionContext, installerPath: string)
{
    const installerDir = path.dirname(installerPath);
    const tarballName = path.basename(installerPath);
    const targetDir = path.join(context.extensionPath, lspGuileServerDirName)

    const terminal = vscode.window.createTerminal(`Guile LSP install`);
    
    setupGuileEnvironment(context, terminal)
    terminal.sendText(`cd ${installerDir}\n`)
    terminal.sendText(`tar -xzvf ${tarballName}\n`)
    terminal.sendText(`cd ${path.basename(tarballName, ".tar.gz")}`)
    terminal.sendText(`cd guile && ./configure --prefix=${targetDir} && make && make install\n`)
}

export async function installGuileJsonRpcServer(context: vscode.ExtensionContext)
{
    downloadJsonRpcTarball(context, "lsp-guile-server", (installerPath) => {installGuileTarball(context, installerPath)})
}

export async function installGuileLspServer(context: vscode.ExtensionContext)
{
    downloadLspServerTarball(context, "lsp-guile-server", (installerPath) => {installGuileTarball(context, installerPath)})
}