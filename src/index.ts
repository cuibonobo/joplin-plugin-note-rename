import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		console.info('Note Rename plugin started!');

		const prefixNoteNames = async (prefix: string) => {
			await renameSelected((noteName: string) => {
				return prefix + noteName;
			});
		};

		const suffixNoteNames = async (suffix: string) => {
			await renameSelected((noteName: string) => {
				return noteName + suffix;
			});
		};

		const searchAndReplaceNoteNames = async (search: string, replace: string) => {
			await renameSelected((noteName: string) => {
				const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				return noteName.replace(new RegExp(escapedSearch, "g"), replace);
			});
		};

		const renameSelected = async (renameFn: (noteName: string) => string) => {
			const noteIds = await joplin.workspace.selectedNoteIds();
			const notes: any[] = [];
			for (let noteId of noteIds) {
				notes.push(await joplin.data.get(["notes", noteId]))
			}
			// FIXME: Reversing order of notes to preserve original modified order,
			// but we should look at the actual dates of the notes instead
			notes.reverse();
			for (let note of notes) {
				await joplin.data.put(["notes", note.id], null, {title: renameFn(note.title)})
			}
		};

		const alterHandle = await joplin.views.dialogs.create('noteNameAlter');
		await joplin.views.dialogs.setHtml(alterHandle, `
		<h4>Note Rename: Prefix/Suffix</h4>
		<form name="rename">
			<fieldset style="margin-bottom: 1rem;">
					<legend>Select a mode:</legend>
					<input type="radio" id="prefix" name="mode" value="prefix" checked>
					<label for="prefix">Prefix</label>
					<br />
					<input type="radio" id="suffix" name="mode" value="suffix">
					<label for="suffix">Suffix</label>
			</fieldset>
			Text: <input type="text" name="input" style="margin-bottom: 1rem;" />
		</form>
		`);

		const replaceHandle = await joplin.views.dialogs.create('noteNameReplace');
		await joplin.views.dialogs.setHtml(replaceHandle, `
		<h4>Note Rename: Search and Replace</h4>
		<form name="replace">
			Search: <input type="text" name="search" style="margin-bottom: 1rem;" />
			Replace: <input type="text" name="replace" style="margin-bottom: 1rem;" />
		</form>
		`);

		await joplin.commands.register({
			name: 'noteNameAlter',
			label: "Prefix / Suffix",
			execute: async () => {
				console.info("Note Rename: Executing alter command");
				const result = await joplin.views.dialogs.open(alterHandle);
				if (result["id"] != "ok") {
					return;
				}
				const formData = result["formData"]["rename"];
				if (formData["mode"] == "suffix") {
					await suffixNoteNames(formData["input"]);
				} else {
					await prefixNoteNames(formData["input"]);
				}
			}
		});

		await joplin.commands.register({
			name: 'noteNameReplace',
			label: "Search and Replace",
			execute: async () => {
				console.info("Note Rename: Executing replace command");
				const result = await joplin.views.dialogs.open(replaceHandle);
				if (result["id"] != "ok") {
					return;
				}
				const formData = result["formData"]["replace"];
				await searchAndReplaceNoteNames(formData["search"], formData["replace"]);
			}
		});

		await joplin.views.toolbarButtons.create('noteRenameAlterButton', 'noteNameAlter', ToolbarButtonLocation.NoteToolbar);
		await joplin.views.toolbarButtons.create('noteRenameReplaceButton', 'noteNameReplace', ToolbarButtonLocation.NoteToolbar);

		// FIXME: Creating a menu instead of a menuItem at NoteListContextMenu won't work and breaks toolbar buttons
		await joplin.views.menuItems.create('noteRenameAlterContextItem', 'noteNameAlter', MenuItemLocation.NoteListContextMenu);
		await joplin.views.menuItems.create('noteRenameReplaceContextItem', 'noteNameReplace', MenuItemLocation.NoteListContextMenu);

		const menuItems = [{commandName: 'noteNameAlter'}, {commandName: 'noteNameReplace'}];
		await joplin.views.menus.create('noteRenameToolsMenu', 'Note Rename', menuItems);
	},
});
