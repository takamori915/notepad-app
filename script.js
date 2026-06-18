const STORAGE_KEY = 'notepad-notes';

class Notepad {
    constructor() {
        this.notes = this.loadNotes();
        this.activeId = null;

        this.noteList = document.getElementById('noteList');
        this.titleInput = document.getElementById('titleInput');
        this.bodyInput = document.getElementById('bodyInput');
        this.previewPane = document.getElementById('previewPane');
        this.formatSelect = document.getElementById('formatSelect');
        this.updatedAt = document.getElementById('updatedAt');
        this.newNoteBtn = document.getElementById('newNoteBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.importInput = document.getElementById('importInput');
        this.calGrid = document.getElementById('calGrid');
        this.calTitle = document.getElementById('calTitle');
        this.calPrevBtn = document.getElementById('calPrevBtn');
        this.calNextBtn = document.getElementById('calNextBtn');
        this.calClearBtn = document.getElementById('calClearBtn');

        this.tagInput = document.getElementById('tagInput');
        this.tagList = document.getElementById('tagList');
        this.tagFilterList = document.getElementById('tagFilterList');
        this.tagClearBtn = document.getElementById('tagClearBtn');

        this.calYear = new Date().getFullYear();
        this.calMonth = new Date().getMonth();
        this.filterDate = null;
        this.filterTag = null;

        this.newNoteBtn.addEventListener('click', () => this.createNote());
        this.deleteBtn.addEventListener('click', () => this.deleteActiveNote());
        this.exportBtn.addEventListener('click', () => this.exportCsv());
        this.importInput.addEventListener('change', (e) => this.importCsv(e));
        this.titleInput.addEventListener('input', () => this.saveActiveNote());
        this.bodyInput.addEventListener('input', () => {
            this.saveActiveNote();
            this.updatePreview();
        });
        this.formatSelect.addEventListener('change', () => {
            this.saveActiveNote();
            this.updateFormatView();
        });
        this.calPrevBtn.addEventListener('click', () => {
            this.calMonth--;
            if (this.calMonth < 0) { this.calMonth = 11; this.calYear--; }
            this.renderCalendar();
        });
        this.calNextBtn.addEventListener('click', () => {
            this.calMonth++;
            if (this.calMonth > 11) { this.calMonth = 0; this.calYear++; }
            this.renderCalendar();
        });
        this.calClearBtn.addEventListener('click', () => {
            this.filterDate = null;
            this.calClearBtn.hidden = true;
            this.renderCalendar();
            this.renderList();
        });
        this.tagInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const tag = this.tagInput.value.trim();
            if (!tag) return;
            const note = this.notes.find(n => n.id === this.activeId);
            if (!note) return;
            if (!note.tags) note.tags = [];
            if (!note.tags.includes(tag)) {
                note.tags.push(tag);
                this.persist();
                this.renderTagEditor(note);
                this.renderTagFilter();
            }
            this.tagInput.value = '';
        });
        this.tagClearBtn.addEventListener('click', () => {
            this.filterTag = null;
            this.tagClearBtn.hidden = true;
            this.renderTagFilter();
            this.renderList();
        });

        this.renderCalendar();
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
            format: 'text',
            tags: [],
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
        this.formatSelect.value = note.format || 'text';
        this.updatedAt.textContent = this.formatDate(note.updatedAt);
        this.updateFormatView();
        this.renderTagEditor(note);
        this.render();
    }

    saveActiveNote() {
        const note = this.notes.find(n => n.id === this.activeId);
        if (!note) return;
        note.title = this.titleInput.value;
        note.body = this.bodyInput.value;
        note.format = this.formatSelect.value;
        note.updatedAt = Date.now();
        this.updatedAt.textContent = this.formatDate(note.updatedAt);
        this.persist();
        this.renderList();
    }

    updateFormatView() {
        const isMarkdown = this.formatSelect.value === 'markdown';
        this.previewPane.hidden = !isMarkdown;
        if (isMarkdown) {
            this.updatePreview();
        }
    }

    updatePreview() {
        if (this.formatSelect.value !== 'markdown') return;
        this.previewPane.innerHTML = window.marked
            ? marked.parse(this.bodyInput.value)
            : this.escapeHtml(this.bodyInput.value);
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
            this.formatSelect.value = 'text';
            this.updatedAt.textContent = '';
            this.previewPane.hidden = true;
            this.tagList.innerHTML = '';
            this.render();
        }
    }

    formatDate(timestamp) {
        const d = new Date(timestamp);
        return d.toLocaleString('ja-JP');
    }

    render() {
        this.renderCalendar();
        this.renderTagFilter();
        this.renderList();
    }

    renderCalendar() {
        const y = this.calYear, m = this.calMonth;
        this.calTitle.textContent = `${y}年${m + 1}月`;

        const noteDates = new Set(this.notes.map(n => {
            const d = new Date(n.updatedAt);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        }));

        const today = new Date();
        const firstDay = new Date(y, m, 1).getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        const dows = ['日','月','火','水','木','金','土'];
        let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');
        for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const key = `${y}-${m}-${d}`;
            const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
            const hasNote = noteDates.has(key);
            const isSelected = this.filterDate === key;
            let cls = 'cal-day';
            if (hasNote) cls += ' has-note';
            if (isToday) cls += ' today';
            if (isSelected) cls += ' selected';
            html += `<div class="${cls}" data-key="${key}">${d}</div>`;
        }

        this.calGrid.innerHTML = html;
        this.calGrid.querySelectorAll('.cal-day.has-note').forEach(el => {
            el.addEventListener('click', () => {
                this.filterDate = el.dataset.key;
                this.calClearBtn.hidden = false;
                this.renderCalendar();
                this.renderList();
            });
        });
    }

    renderList() {
        this.noteList.innerHTML = '';
        let notes = this.notes.slice().sort((a, b) => b.updatedAt - a.updatedAt);

        if (this.filterDate) {
            const [fy, fm, fd] = this.filterDate.split('-').map(Number);
            notes = notes.filter(n => {
                const d = new Date(n.updatedAt);
                return d.getFullYear() === fy && d.getMonth() === fm && d.getDate() === fd;
            });
        }

        if (this.filterTag) {
            notes = notes.filter(n => n.tags && n.tags.includes(this.filterTag));
        }

        notes.forEach(note => {
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

    renderTagEditor(note) {
        this.tagList.innerHTML = '';
        (note.tags || []).forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `${this.escapeHtml(tag)}<button class="tag-chip-remove" title="削除">×</button>`;
            chip.querySelector('.tag-chip-remove').addEventListener('click', () => {
                note.tags = note.tags.filter(t => t !== tag);
                this.persist();
                this.renderTagEditor(note);
                this.renderTagFilter();
                this.renderList();
            });
            this.tagList.appendChild(chip);
        });
    }

    renderTagFilter() {
        const allTags = [...new Set(this.notes.flatMap(n => n.tags || []))].sort();
        this.tagFilterList.innerHTML = '';
        allTags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tag-filter-chip' + (this.filterTag === tag ? ' active' : '');
            chip.textContent = tag;
            chip.addEventListener('click', () => {
                this.filterTag = this.filterTag === tag ? null : tag;
                this.tagClearBtn.hidden = !this.filterTag;
                this.renderTagFilter();
                this.renderList();
            });
            this.tagFilterList.appendChild(chip);
        });
        this.tagClearBtn.hidden = !this.filterTag;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    csvEscape(str) {
        const s = String(str ?? '');
        return '"' + s.replace(/"/g, '""') + '"';
    }

    exportCsv() {
        const header = ['id', 'title', 'body', 'format', 'updatedAt'];
        const rows = this.notes.map(n => [
            this.csvEscape(n.id),
            this.csvEscape(n.title),
            this.csvEscape(n.body),
            this.csvEscape(n.format || 'text'),
            this.csvEscape(new Date(n.updatedAt).toISOString()),
        ].join(','));

        const csv = '﻿' + [header.join(','), ...rows].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'notes.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    importCsv(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result.replace(/^﻿/, '');
                const lines = this.parseCsvLines(text);
                if (lines.length < 2) return;
                const header = lines[0];
                const idIdx = header.indexOf('id');
                const titleIdx = header.indexOf('title');
                const bodyIdx = header.indexOf('body');
                const formatIdx = header.indexOf('format');
                const updatedIdx = header.indexOf('updatedAt');

                const imported = lines.slice(1).map(cols => ({
                    id: cols[idIdx] || Date.now().toString(),
                    title: cols[titleIdx] || '',
                    body: cols[bodyIdx] || '',
                    format: cols[formatIdx] || 'text',
                    updatedAt: cols[updatedIdx] ? new Date(cols[updatedIdx]).getTime() : Date.now(),
                }));

                const existingIds = new Set(this.notes.map(n => n.id));
                const newNotes = imported.filter(n => !existingIds.has(n.id));
                this.notes = [...newNotes, ...this.notes];
                this.persist();
                this.render();
                if (newNotes.length > 0) {
                    this.selectNote(newNotes[0].id);
                    alert(`${newNotes.length}件のメモを取り込みました。`);
                } else {
                    alert('新規のメモはありませんでした（重複はスキップしました）。');
                }
            } catch (err) {
                alert('CSVの読み込みに失敗しました。');
            }
            e.target.value = '';
        };
        reader.readAsText(file, 'UTF-8');
    }

    parseCsvLines(text) {
        const lines = [];
        let cur = [];
        let field = '';
        let inQuote = false;
        let i = 0;
        while (i < text.length) {
            const ch = text[i];
            if (inQuote) {
                if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
                if (ch === '"') { inQuote = false; i++; continue; }
                field += ch;
            } else {
                if (ch === '"') { inQuote = true; i++; continue; }
                if (ch === ',') { cur.push(field); field = ''; i++; continue; }
                if (ch === '\r' || ch === '\n') {
                    cur.push(field); field = '';
                    lines.push(cur); cur = [];
                    if (ch === '\r' && text[i + 1] === '\n') i++;
                    i++; continue;
                }
                field += ch;
            }
            i++;
        }
        if (field || cur.length) { cur.push(field); lines.push(cur); }
        return lines;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Notepad();
});
