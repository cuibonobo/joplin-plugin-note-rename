import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		console.info('Note Rename plugin started!');

		const addPrefix = async (prefix: string) => {
			const noteIds = await joplin.workspace.selectedNoteIds();
			const notes: any[] = [];
			for (let noteId of noteIds) {
				console.info(noteId);
				notes.push(await joplin.data.get(["notes", noteId]))
			}
			// FIXME: Reversing order of notes to preserve original modified order,
			// but we should look at the actual dates of the notes instead
			notes.reverse();
			for (let note of notes) {
				await joplin.data.put(["notes", note.id], null, {title: prefix + note.title})
			}
		};

		const handle = await joplin.views.dialogs.create('noteRenamePrefix');
		await joplin.views.dialogs.setHtml(handle, `
		<h2>Note Rename: Prefix</h2>
		<form name="prefix">
		Prefix: <input type="text" name="input"/>
		</form>
		`);

		await joplin.commands.register({
			name: 'noteRenamePrefix',
			label: "Note rename: Prefix",
			iconName: "fas fa-music",
			execute: async () => {
				console.info("Executing prefix command");
				const result = await joplin.views.dialogs.open(handle);
				// {"id":"ok","formData":{"prefix":{"input":"foo"}}}
				if (result["id"] != "ok") {
					return;
				}
				await addPrefix(result["formData"]["prefix"]["input"]);
			}
		});

		await joplin.views.toolbarButtons.create('noteRenameButton1', 'noteRenamePrefix', ToolbarButtonLocation.NoteToolbar);
		await joplin.views.menuItems.create('noteRenameContextItem1', 'noteRenamePrefix', MenuItemLocation.NoteListContextMenu);
		await joplin.views.menuItems.create('noteRenameMenuItem1', 'noteRenamePrefix', MenuItemLocation.Tools);
	},
});
