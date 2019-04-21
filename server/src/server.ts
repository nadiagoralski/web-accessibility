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
	const settings = await getDocumentSettings(textDocument.uri);
	const diagnostics: vs.Diagnostic[] = [];
	const text = textDocument.getText();
	const rules: Rule[] = wa.rules;
	let m: RegExpExecArray | null;
	let problems = 0;
	

	rules.forEach(rule => {
		const pattern: RegExp = new RegExp(rule.identifier.join('|'), 'ig');
		let severity: vs.DiagnosticSeverity;

		switch (rule.severity) {
			case 1:
				severity = vs.DiagnosticSeverity.Error;
				break;
			case 2:
				severity = vs.DiagnosticSeverity.Warning;
				break;
			case 3:
				severity = vs.DiagnosticSeverity.Information;
				break;
			case 4:
				severity = vs.DiagnosticSeverity.Hint;
				break;
		}

		while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
			const lastFilter = rule.filters.length - 1;
			let test: RegExpExecArray; 
			rule.filters.forEach((filter, index) => {
				const filterPattern: RegExp = new RegExp(filter.identifier, 'i');
				if (filter.options.contains) {
					if (filterPattern.test(m[0])) {
						test = m;
					}
				}
				if (filter.options.negative) {
					if (!filterPattern.test(m[0])) {
						test = m;
					}
				}
				if (filter.options.replace) {
					connection.console.log('true rep');
				}

				if (index == lastFilter) {
					_diagnostics(test, rule.message, severity, rule.type);
				}
			});
		}
	});

	async function _diagnostics(
		regEx: RegExpExecArray,
		diagnosticsMessage: string,
		severity: vs.DiagnosticSeverity,
		type: string) {
		
		let diagnostic: vs.Diagnostic = {
			severity: severity,
			message: diagnosticsMessage,
			range: {
				start: textDocument.positionAt(regEx.index),
				end: textDocument.positionAt(regEx.index + regEx[0].length),
			},
			code: type,
			source: 'web accessibility'
		};

		diagnostics.push(diagnostic);
	}
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.listen(connection);

connection.listen();
