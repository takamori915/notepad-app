const STORAGE_KEY = 'notepad-notes';

class Notepad {
    constructor() {
        this.notes = this.loadNotes();
        this.activeId = null;

        this.noteList = document.getElementById('noteList');
        this.titleInput = document.getElementById('titleInput');
        this.bodyInput = document.getElementById('bodyInput');
        this.updatedAt = document.getElementById('updatedAt');
        this.newNoteBtn = document.getElementById('newNoteBtn');
        this.deleteBtn = document.getElementById('deleteBtn');

        this.newNoteBtn.addEventListener('click', () => this.createNote());
        this.deleteBtn.addEventListener('click', () => this.deleteActiveNote());
        this.titleInput.addEventListener('input', () => this.saveActiveNote());
        this.bodyInput.addEventListener('input', () => this.saveActiveNote());

        this.render();
        if (this.notes.length > 0) {
            this.selectNote(this.notes[0].id);
        } else {
            this.createNote();
        }
    }

    loadNotes() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    persist() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes));
    }

    createNote() {
        const note = {
            id: Date.now().toString(),
            title: '',
            body: '',
            updatedAt: Date.now(),
        };
        this.notes.unshift(note);
        this.persist();
        this.render();
        this.selectNote(note.id);
        this.titleInput.focus();
    }

    selectNote(id) {
        this.activeId = id;
        const note = this.notes.find(n => n.id === id);
        if (!note) return;
        this.titleInput.value = note.title;
        this.bodyInput.value = note.body;
        this.updatedAt.textContent = this.formatDate(note.updatedAt);
        this.render();
    }

    saveActiveNote() {
        const note = this.notes.find(n => n.id === this.activeId);
        if (!note) return;
        note.title = this.titleInput.value;
        note.body = this.bodyInput.value;
        note.updatedAt = Date.now();
        this.updatedAt.textContent = this.formatDate(note.updatedAt);
        this.persist();
        this.renderList();
    }

    deleteActiveNote() {
        if (!this.activeId) return;
        this.notes = this.notes.filter(n => n.id !== this.activeId);
        this.persist();
        if (this.notes.length > 0) {
            this.selectNote(this.notes[0].id);
        } else {
            this.activeId = null;
            this.titleInput.value = '';
            this.bodyInput.value = '';
            this.updatedAt.textContent = '';
            this.render();
        }
    }

    formatDate(timestamp) {
        const d = new Date(timestamp);
        return d.toLocaleString('ja-JP');
    }

    render() {
        this.renderList();
    }

    renderList() {
        this.noteList.innerHTML = '';
        this.notes
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .forEach(note => {
                const li = document.createElement('li');
                li.className = 'note-item' + (note.id === this.activeId ? ' active' : '');
                li.innerHTML = `
                    <div class="note-title">${this.escapeHtml(note.title) || '無題のメモ'}</div>
                    <div class="note-preview">${this.escapeHtml(note.body.slice(0, 40))}</div>
                `;
                li.addEventListener('click', () => this.selectNote(note.id));
                this.noteList.appendChild(li);
            });
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Notepad();
});
