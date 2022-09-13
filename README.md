# vscode-scheme-lsp

**EXPERIMENTAL**

A LSP Client for Scheme.

This extension currently supports following Scheme implementations: CHICKEN 5,
Gambit 4.9.4+ and Guile 3.
It is based on the also in early development stage [Scheme Language Server](https://gitlab.com/rgherdt/scheme-language-server).
See the corresponding page for more details about the supported features.

## Usage

Before opening a `.scm` file, make sure to configure the extension for your
Scheme of choice. You can do this by setting (`Scheme Lsp: Scheme implementation`).

To install an LSP server, you can either follow the instructions available
in `scheme-lsp-server`'s [README](https://codeberg.org/rgherdt/scheme-lsp-server#a-name-user-content-installing-a-installing),
or let the extension install it automatically. In this case, when opening a
Scheme file for the first time, you will be prompted for installation.
