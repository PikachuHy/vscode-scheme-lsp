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
import * as os from 'os';
import * as path from 'path';
import * as https from 'https';
import hasbin = require('hasbin');


export async function downloadTarball(
    tarballUrl: string, 
    libraryName: string, 
    callback: (installerPath: string) => void)
{
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'installers'))
    const installerPath= path.join(tmpDir, `${libraryName}.tar.gz`);

    https.get(tarballUrl, (res) => {
        const filePath = fs.createWriteStream(installerPath);
        res.pipe(filePath);
        filePath.on('finish',() => {
            filePath.close();
            console.log(`Download of ${libraryName} Completed`);
            callback(installerPath)
        })
    }).on('error', function(err) {
        vscode.window.showErrorMessage(`Error downloading ${libraryName}: ${err.message}`)
    })
    return installerPath;
}

export async function downloadJsonRpcTarball(
    context: vscode.ExtensionContext, 
    targetName: string,
    callback: (installerPath: string) => void)
{
    const tarballDirectoryUrl: string = 
        vscode.workspace.getConfiguration().get('schemeLsp.jsonRpcTarballDirectoryUrl') !

    const jsonRpcVersion: string = 
        vscode.workspace.getConfiguration().get('schemeLsp.jsonRpcVersion')!
    const tarballUrl: string =
        new URL(`${jsonRpcVersion}.tar.gz`, tarballDirectoryUrl).toString()

    return downloadTarball(tarballUrl, "scheme-json-rpc", callback)
}

export async function downloadLspServerTarball(
    context: vscode.ExtensionContext,
    targetName: string,
    callback: (installerPath: string) => void)
{
    const tarballDirectoryUrl: string = 
        vscode.workspace.getConfiguration().get('schemeLsp.lspServerTarballDirectoryUrl')!

    const lspServerVersion:string = 
        vscode.workspace.getConfiguration().get('schemeLsp.lspServerVersion')!
    const tarballUrl: string =
        new URL(`${lspServerVersion}.tar.gz`, tarballDirectoryUrl).toString()

    return await downloadTarball(tarballUrl, "scheme-lsp-server", callback)
}

