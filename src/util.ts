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
import { checkServerIdentity } from 'tls';


export async function downloadTarball(
    tarballUrl: string, 
    libraryName: string, 
    callback: (installerPath: string) => void)
{
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'installers'))
    const installerPath= path.join(tmpDir, `${libraryName}.tar.gz`);
    console.log(`downloading ${tarballUrl}`)

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

    const tarballUrl: string =
        new URL('master.tar.gz', tarballDirectoryUrl).toString()

    return downloadTarball(tarballUrl, "scheme-json-rpc", callback)
}

export async function downloadLspServerTarball(
    context: vscode.ExtensionContext,
    targetName: string,
    callback: (installerPath: string) => void)
{
    const tarballDirectoryUrl: string = 
        vscode.workspace.getConfiguration().get('schemeLsp.lspServerTarballDirectoryUrl')!

    const tarballUrl: string =
        new URL('master.tar.gz', tarballDirectoryUrl).toString()

    return await downloadTarball(tarballUrl, "scheme-lsp-server", callback)
}

export function extractVersion(versionOutput: string) {
    const lines = versionOutput.split(os.EOL);
    const regexp = new RegExp('^Version (.*)')
    for (let line of lines) {
        let m = line.match(regexp)
        if (m !== null) {
            return m[1]
        }
    }
    return null
}

export function installedVersionSufficient(installedVersion: string, requiredVersion: string) {
    return requiredVersion === 'master' ||
        (installedVersion !== null && installedVersion.localeCompare(requiredVersion, undefined, { numeric: true }) >= 0);
}

export function findLspServer(
    context: vscode.ExtensionContext, directoryName: string, executableName: string, extraDirs: any[]=[]) {
    const localInstallation = 
        path.join(context.extensionPath, directoryName, 'bin', executableName)
    const alternativePath = 
        path.join(context.extensionPath, directoryName, executableName)
    const extraPaths = extraDirs.map(dir => path.join(dir, executableName))

    if (hasbin.sync(executableName)) {
        return executableName;   
    } else if (fs.existsSync(localInstallation)) {
        return localInstallation;
    } else if (fs.existsSync(alternativePath)) {
        return alternativePath;
    } else {
        const extraExe = extraPaths.find(p => fs.existsSync(p))
        return extraExe || null
    }
}

export async function promptForMissingTool(msg: string, installFunction: () => void)
{
    const selected = await vscode.window.showErrorMessage(
		`"${msg}". Install it automatically?.`,
        ...['Install']
	);
	switch (selected) {
		case 'Install':
			installFunction();
			break;
		default:
			break;
	}
}

