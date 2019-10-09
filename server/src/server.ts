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
	const diagnostics: vs.Diagnostic[] = [];
	const rules: Rule[] = wa.rules;
	let problems = 0;
	let m: RegExpExecArray | null;

	try {	
		const settings = await getDocumentSettings(textDocument.uri);
		const text: string = textDocument.getText();

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
				if (m != null || m[0] != '') {
					const lastFilter = rule.filters.length - 1;
					let result: RegExpExecArray;

					rule.filters.forEach((filter, index) => {
						const filterPattern: RegExp = new RegExp(filter.identifier, 'i');

						if (filter.options.contains) {
							if (filterPattern.test(m[0])) {
								result = m;
							}
						}
						if (filter.options.negative) {
							if (!filterPattern.test(m[0])) {
								result = m;
							}
						}
						if (filter.options.replace) {
							let aRegEx: RegExpExecArray;
							let oldRegEx: RegExpExecArray = m;
							const newValue = filter.options.replaceOptions.newValue;
							const regexFlag = filter.options.replaceOptions.regexFlag;						
							let filteredString = m[0].replace(`/${filter.identifier}/${regexFlag}`, "");
							if (!/(?:\\S+?)/ig.test(filteredString)) {
								connection.console.log('true');
								aRegEx = /<a(?:.)+?>/i.exec(oldRegEx[0]);
								aRegEx.index = oldRegEx.index;
								result = aRegEx;
								connection.console.log(`/${filter.identifier}/${regexFlag} , ${newValue}`);
							}
						}
		
						if (index == lastFilter) {
							_diagnostics(result, rule.message, severity, rule.type);
						}
					});
				}
			}
		});

		async function _diagnostics(
			regEx: RegExpExecArray,
			diagnosticsMessage: string,
			severity: vs.DiagnosticSeverity,
			type: string) {
			
			try {
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
			} catch (error) {
				connection.console.log(error.toString());
			}
		}
	} catch (error) {
		connection.console.log(error.toString());
	}

	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.listen(connection);

connection.listen();
