/*! server.ts
* Flamingos are pretty badass!
* Copyright (c) 2019 Max van der Schee; Licensed MIT */

import { Rule } from './types';
import * as vs from 'vscode-languageserver';
import * as wa from './web-accessibility.json';

let connection = vs.createConnection(vs.ProposedFeatures.all);
let documents: vs.TextDocuments = new vs.TextDocuments();
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;

connection.onInitialize((params: vs.InitializeParams) => {
	let capabilities = params.capabilities;

	hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
	hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		connection.client.register(
			vs.DidChangeConfigurationNotification.type,
			undefined
		);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

interface ServerSettings {
	maxNumberOfProblems: number;
	semanticExclude: boolean;
}

const defaultSettings: ServerSettings = { maxNumberOfProblems: 100, semanticExclude: false };
let globalSettings: ServerSettings = defaultSettings;
let documentSettings: Map<string, Thenable<ServerSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		documentSettings.clear();
	} else {
		globalSettings = <ServerSettings>(
			(change.settings.webAccessibility || defaultSettings)
		);
	}

	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ServerSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'webAccessibility'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
	connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});


documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

// Only this part is interesting.
async function validateTextDocument(textDocument: vs.TextDocument): Promise<void> {
	let settings = await getDocumentSettings(textDocument.uri);
	let diagnostics: vs.Diagnostic[] = [];
	let text = textDocument.getText();
	let problems = 0;
	let m: RegExpExecArray | null;
	let rules: Rule[] = wa.rules;
	

	rules.forEach(item => {
		let pattern: RegExp = new RegExp(item.pattern, 'ig');
		// let problemArray: Array;


		while ((m = pattern.exec(text)) !== null) {
			item.filters.forEach(filter => {
				let filterPattern: RegExp = new RegExp(filter.pattern, filter.options);
				let newRegExp: RegExpExecArray;

				if(filter['replace-regex'] === true) {
					newRegExp = filterPattern.exec(m[0]);
					newRegExp.index = m.index;
				} else {
					newRegExp = m;
				}

				// if (filter.followUp)

				if(filter['negative-lookup'] === true){
					if(filterPattern.test(newRegExp[0])) {
						problems++;
						_diagnostics(newRegExp, filter.description, item.severity);
					} 
				} else if (filterPattern.test(newRegExp[0])) {
					problems++;
					_diagnostics(newRegExp, filter.description, item.severity);
				}
			});
		}
	});

	async function _diagnostics(regEx: RegExpExecArray, diagnosticsMessage: string, severityNumber: number) {
		// add some stupid logic for giving hints warnings and shit
		
		let diagnostic: vs.Diagnostic = {
			severity: vs.DiagnosticSeverity.Warning,
			message: diagnosticsMessage,
			range: {
				start: textDocument.positionAt(regEx.index),
				end: textDocument.positionAt(regEx.index + regEx[0].length),
			},
			code: 0,
			source: 'web accessibility'
		};

		diagnostics.push(diagnostic);
	}
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.listen(connection);

connection.listen();
