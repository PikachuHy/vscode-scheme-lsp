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
import { exec, execFile, execFileSync, spawnSync } from 'child_process';
import { downloadJsonRpcTarball, downloadLspServerTarball, extractVersion, findLspServer, installedVersionSufficient, promptForMissingTool } from './util';
import * as path from 'path';

const lspGambitServerExecutableName = 'gambit-lsp-server'
const lspGambitServerDirName = 'tools'

const dependencies = [
    'codeberg.org/rgherdt/srfi',
    'github.com/ashinn/irregex',
    'github.com/rgherdt/chibi-scheme',
    'codeberg.org/rgherdt/scheme-json-rpc/json-rpc',
    'codeberg.org/rgherdt/scheme-lsp-server/lsp-server'
]

export function findGambitLspServer(context: vscode.ExtensionContext) {
    return findLspServer(context, lspGambitServerDirName, lspGambitServerExecutableName);
}

export function getGambitLspServerVersion(context: vscode.ExtensionContext)
{
    const lspServerCommand = findGambitLspServer(context);
    if (lspServerCommand === null) {
        return null
    }

    const versionOutput = execFileSync(
        lspServerCommand,
        ['--version']
    )
    return extractVersion(versionOutput.toString())
}

export function isGambitLspServerInstalled(context: vscode.ExtensionContext) {
    let res = spawnSync('gsi',
        ['-e', '(import (codeberg.org/rgherdt/scheme-lsp-server gambit util)) (exit)']
    )
    return res.status == 0
}

function probeAndInstall(libName: string) {
    let res = spawnSync('gsi',
        ['-e', '(import libName)'])
    if (res.status != 0) {
        execFile('gsi', ['-install', libName],
            (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showInformationMessage(`error installing ${libName}: ${error}`);
                    return
                }
            })
    } else {
        execFile('gsi', ['-update', libName],
            (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showInformationMessage(`error updating ${libName}: ${error}`);
                    return
                }
            })
    }
}


export function ensureGambitLspServer(
    context: vscode.ExtensionContext,
    force: boolean = false,
    callback: () => void = () => { }
) {
    const isInstalled = isGambitLspServerInstalled(context)
    const installLspServerFunc = () => {
        vscode.window.showInformationMessage(`Installing LSP server for Gambit.`)

        dependencies.forEach((libName: string) => {
            probeAndInstall(libName)
        })

        const lspParts = ["gambit/util",
            "private",
            "trie",
            "parse",
            "adapter",
            "document",
            "gambit",
            "lsp-server"]
        lspParts.forEach(lib => {
            execFile('gsc', [`codeberg.org/rgherdt/scheme-lsp-server/${lib}`],
                (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showInformationMessage(`error compiling ${lib}: ${error}`);
                        return
                    }
                })
        });
        const scriptPath = path.join(context.extensionPath, 'tools', 'gambit-lsp-server')
        execFile('gsc', ['-exe', '-nopreload', scriptPath],
            (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showInformationMessage(`error compiling ${scriptPath}: ${error}`);
                    return
                }
            })

        vscode.window.showInformationMessage(`LSP server for Gambit successfully installed. Restarting extension.`)

        vscode.commands.executeCommand('scheme-lsp-client.reload-extension')
    }

    if (!isInstalled || force) {
        promptForMissingTool("Lsp Server for Gambit not found.", installLspServerFunc);
    } else if (!installedVersionSufficient(getGambitLspServerVersion(context)!,  
                                           vscode.workspace.getConfiguration()
                                              .get('schemeLsp.gambitLspServerMinVersion')!)) {
        promptForMissingTool("Lsp Server for Gambit outdated.", installLspServerFunc);
    } else {
        callback()
    }
}




