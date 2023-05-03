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
    'codeberg.org/rgherdt/scheme-json-rpc/json-rpc'
]

function findUserlibDir () {
    const res = execFileSync(
        'gsi',
        ['-e', '(display (path-expand "~~userlib"))']
    )
    return res.toString()
}

export function findGambitLspServer(context: vscode.ExtensionContext) {
    const libDir = path.join(findUserlibDir(), "codeberg.org", "rgherdt", "scheme-lsp-server", "@", "gambit")
    return findLspServer(context,
                         lspGambitServerDirName,
                         lspGambitServerExecutableName,
                         [libDir]);
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

export function isGambitLspLibraryInstalled(context: vscode.ExtensionContext) {
    let res = spawnSync('gsi',
        ['-e', '(import (codeberg.org/rgherdt/scheme-lsp-server lsp-server private gambit)) (exit)']
    )
    return res.status == 0
}

function probeAndInstall(libName: string, callback: () => void) {
    let res = spawnSync('gsi',
        ['-e', '(import libName)'])
    if (res.status != 0) {
        execFile('gsi', ['-install', libName],
            (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showInformationMessage(`error installing ${libName}: ${error}`);
                    return
                }
                callback()
            })
    } else {
        execFile('gsi', ['-update', libName],
            (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showInformationMessage(`error updating ${libName}: ${error}`);
                    return
                }
                callback()
            })
    }
}

function compileGambitExecutable(context: vscode.ExtensionContext, callback: () => void) {

    vscode.window.showInformationMessage(`Compiling gambit-lsp-server.`)
    let source =
        path.join(context.extensionPath, 'tools', 'gambit-lsp-server.scm')

    execFile('gsc', ['-exe', '-nopreload', source],
        (error, stdout, stderr) => {
            if (error) {
                vscode.window.showInformationMessage(`error compiling gambit-lsp-server: ${error}`);
                return
            }
            callback()
        })
}


export function ensureGambitLspServer(
    context: vscode.ExtensionContext,
    force: boolean = false,
    callback: () => void = () => { }
) {
    const isLibraryInstalled = isGambitLspLibraryInstalled(context)
    const isExecutableInstalled = findGambitLspServer(context)
    const installScriptPath = 
        path.join(context.extensionPath, lspGambitServerDirName, 'install-gambit-lsp-server.sh')

    const installLspServerFunc = () => {
        vscode.window.showInformationMessage(`Installing LSP server for Gambit.`)

        execFile(installScriptPath, [],
            (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showInformationMessage(`error installing LSP server: ${error}`);
                    return
                }
                callback()
            })
    }

    if (!isLibraryInstalled || ! isExecutableInstalled || force) {
        promptForMissingTool("Lsp Server for Gambit not found.", installLspServerFunc);
    } else if (!installedVersionSufficient(getGambitLspServerVersion(context)!,  
                                           vscode.workspace.getConfiguration()
                                              .get('schemeLsp.gambitLspServerMinVersion')!)) {
        promptForMissingTool("Lsp Server for Gambit outdated.", installLspServerFunc);
    } else {
        callback()
    }
}




