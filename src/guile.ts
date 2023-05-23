// Scheme LSP client for VS Codium and co.

// Copyright (C) 2022  Ricardo Gabriel Herdt <r.herdt@posteo.de>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.


import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import {downloadJsonRpcTarball, downloadLspServerTarball, extractVersion, findLspServer, installedVersionSufficient, promptForMissingTool} from './util';
const lspGuileServerDirName = 'lsp-guile-server';
const lspGuileServerExecutableName = 'guile-lsp-server';

export function findGuileLspServer(context: vscode.ExtensionContext)
{
    return findLspServer(context, lspGuileServerDirName, lspGuileServerExecutableName);
}

export function ensureGuileLspServer(
    context: vscode.ExtensionContext,
    force: boolean = false,
    callback: () => void = () => {}
    )
{
    const guileLspServerCmd = findGuileLspServer(context);
    const installLspServerFunc = () => {
        installGuileLspServer(context, callback);
    };
    const installJsonRpcFunc = () => {
        installGuileJsonRpcServer(context, installLspServerFunc);
    };
    if (guileLspServerCmd === null || force) {
        promptForMissingTool("Lsp Server for Guile is missing.", installJsonRpcFunc);
    } else if (! installedVersionSufficient(getGuileLspServerVersion(context)!,  
                                            vscode.workspace.getConfiguration()
                                                            .get('schemeLsp.guileLspServerMinVersion')!
    )) {
        promptForMissingTool("Lsp Server for Guile is outdated.", installJsonRpcFunc);
    } else {
        callback();
    }
}

export function setupGuileEnvironment(context: vscode.ExtensionContext, terminal: vscode.Terminal)
{
    const targetDir = path.join(context.extensionPath, lspGuileServerDirName);
    terminal.sendText(`export GUILE_LOAD_COMPILED_PATH=.:...:${targetDir}:${targetDir}/lib/guile/3.0/site-ccache/:$GUILE_LOAD_COMPILED_PATH\n`);
    terminal.sendText(`export GUILE_LOAD_PATH=.:...:${targetDir}:${targetDir}/share/guile/site/3.0/:$GUILE_LOAD_PATH\n`);
}

export function guileEnvironmentMap(context: vscode.ExtensionContext)
{
    const targetDir = path.join(context.extensionPath, lspGuileServerDirName);
    return {
        ...process.env,
        GUILE_LOAD_COMPILED_PATH: `.:...:${targetDir}:${targetDir}/lib/guile/3.0/site-ccache/:${process.env.GUILE_LOAD_COMPILED_PATH}`,
        GUILE_LOAD_PATH: `.:...:${targetDir}:${targetDir}/share/guile/site/3.0/:${process.env.GUILE_LOAD_PATH}:`
    };
}

export function getGuileLspServerVersion(context: vscode.ExtensionContext)
{
    const lspServerCommand = findGuileLspServer(context);
    if (lspServerCommand === null) {
        return null;
    }
    let customEnv = guileEnvironmentMap(context);
    const versionOutput = execFileSync(
        lspServerCommand,
        ['--version'],
        {
            env: customEnv
        }
    );
    return extractVersion(versionOutput.toString());
}

export async function installGuileTarball(
    context: vscode.ExtensionContext,
    installerPath: string)
{
    const installerDir = path.dirname(installerPath);
    const tarballName = path.basename(installerPath);
    const targetDir = path.join(context.extensionPath, lspGuileServerDirName);

    const terminal = vscode.window.createTerminal(`Guile LSP install`);
    
    setupGuileEnvironment(context, terminal);
    terminal.sendText(`cd ${installerDir}\n`);
    terminal.sendText(`tar -xzvf ${tarballName}\n`);
    terminal.sendText(`cd ${path.basename(tarballName, ".tar.gz")}`);
    terminal.sendText(`cd guile && ./configure --prefix=${targetDir} && make && make install\n`);
}

export function installGuileJsonRpcServer(context: vscode.ExtensionContext, callback: () => void)
{
    const targetDir = path.join(context.extensionPath, lspGuileServerDirName);
    if (fs.existsSync(targetDir)) {
        fs.rmdirSync(targetDir, {recursive: true});
        vscode.window.showInformationMessage(`Successfully deleted ${targetDir}`);
    }

    let witnessFile = path.join(targetDir, 'lib', 'guile', '3.0', 'site-ccache', 'json-rpc.go');
    fs.mkdirSync(path.dirname(witnessFile), {recursive: true});
    // create an empty file and monitor it for changes to detect installation end.
    fs.writeFileSync(witnessFile, "");
    downloadJsonRpcTarball(
        context,
        "lsp-guile-server",
        (installerPath) => {
            installGuileTarball(context, installerPath);
            fs.watch(witnessFile,
                (eventType, filename) => {
                    if (eventType === 'change') {
                        vscode.window.showInformationMessage('JSON RPC installed.');
                        callback();
                    }
                }
            );
        });
    }


export function installGuileLspServer(context: vscode.ExtensionContext, callback: () => void)
{
    vscode.window.showInformationMessage('Installing LSP server for Guile.');
    const targetDir = path.join(context.extensionPath, lspGuileServerDirName);

    let witnessFile = path.join(targetDir, 'bin', lspGuileServerExecutableName);
    fs.mkdirSync(path.dirname(witnessFile), {recursive: true});
    // create an empty file and monitor it for changes to detect installation end.
    fs.writeFileSync(witnessFile, "");
    vscode.window.showInformationMessage('Downloading LSP server tarball.');
    downloadLspServerTarball(
        context,
        "lsp-guile-server",
        (installerPath) => {
            installGuileTarball(context, installerPath);
            fs.watch(witnessFile,
                (eventType, filename) => {
                    if (eventType === 'change') {
                        vscode.window.showInformationMessage('Guile LSP server installed. Restarting extension.');
                        vscode.commands.executeCommand('scheme-lsp-client.reload-extension');
                    }
                });
        });
}
