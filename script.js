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
        this.tagSuggestions = document.getElementById('tagSuggestions');
        this.todoPane = document.getElementById('todoPane');
        this.todoItems = document.getElementById('todoItems');
        this.todoInput = document.getElementById('todoInput');
        this.favoritePane = document.getElementById('favoritePane');
        this.favoriteUrlInput = document.getElementById('favoriteUrlInput');
        this.favoriteCheckBtn = document.getElementById('favoriteCheckBtn');
        this.favoriteStatus = document.getElementById('favoriteStatus');
        this.favoriteSiteInfo = document.getElementById('favoriteSiteInfo');
        this.favoriteSiteImage = document.getElementById('favoriteSiteImage');
        this.favoriteSiteTitle = document.getElementById('favoriteSiteTitle');
        this.favoriteSiteDesc = document.getElementById('favoriteSiteDesc');
        this.favoriteSiteLink = document.getElementById('favoriteSiteLink');
        this.favoriteNotifyCheck = document.getElementById('favoriteNotifyCheck');
        this.favoriteLastChecked = document.getElementById('favoriteLastChecked');

        this.calYear = new Date().getFullYear();
        this.calMonth = new Date().getMonth();
        this.filterDate = null;
        this.filterMonth = null;
        this.filterTag = null;
        this.filterFormat = null;
        this.exportCount = 0;

        this.sidebar = document.querySelector('.sidebar');
        this.filterTab = document.querySelector('.sidebar-tab[data-tab="filter"]');
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        document.getElementById('openMenuBtn').addEventListener('click', () => this.openSidebar());
        document.getElementById('closeMenuBtn').addEventListener('click', () => this.closeSidebar());

        const storageInfoBtn = document.getElementById('storageInfoBtn');
        const storageInfoPanel = document.getElementById('storageInfoPanel');
        storageInfoBtn.addEventListener('click', () => {
            const open = !storageInfoPanel.hidden;
            storageInfoPanel.hidden = open;
            storageInfoBtn.classList.toggle('active', !open);
        });

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
            this.filterMonth = null;
            this.calClearBtn.hidden = true;
            this.renderCalendar();
            this.renderList();
        });
        this.calTitle.style.cursor = 'pointer';
        this.calTitle.addEventListener('click', () => {
            const key = `${this.calYear}-${this.calMonth}`;
            this.filterMonth = this.filterMonth === key ? null : key;
            this.filterDate = null;
            this.calClearBtn.hidden = !this.filterMonth;
            this.renderCalendar();
            this.renderList();
        });
        this.tagInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            this.addTag();
        });
        document.getElementById('tagAddBtn').addEventListener('click', () => this.addTag());
        this.tagClearBtn.addEventListener('click', () => {
            this.filterTag = null;
            this.tagClearBtn.hidden = true;
            this.renderTagFilter();
            this.renderList();
        });
        this.todoInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            this.addTodo();
        });
        document.getElementById('todoAddBtn').addEventListener('click', () => this.addTodo());
        document.querySelectorAll('.format-filter-section .tag-filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const fmt = chip.dataset.format;
                this.filterFormat = this.filterFormat === fmt ? null : fmt;
                document.getElementById('formatClearBtn').hidden = !this.filterFormat;
                document.querySelectorAll('.format-filter-section .tag-filter-chip').forEach(c => {
                    c.classList.toggle('active', c.dataset.format === this.filterFormat);
                });
                this.renderList();
            });
        });
        document.getElementById('formatClearBtn').addEventListener('click', () => {
            this.filterFormat = null;
            document.getElementById('formatClearBtn').hidden = true;
            document.querySelectorAll('.format-filter-section .tag-filter-chip').forEach(c => c.classList.remove('active'));
            this.renderList();
        });

        this.favoriteCheckBtn.addEventListener('click', () => this.checkFavoriteUrl());
        this.favoriteUrlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.checkFavoriteUrl();
        });
        this.favoriteNotifyCheck.addEventListener('change', () => {
            if (this.favoriteNotifyCheck.checked) {
                Notification.requestPermission();
            }
            const note = this.notes.find(n => n.id === this.activeId);
            if (note) {
                note.favoriteNotify = this.favoriteNotifyCheck.checked;
                this.persist();
            }
        });

        this.renderCalendar();
        this.render();
        if (this.notes.length > 0) {
            this.selectNote(this.notes[0].id);
        } else {
            this.createNote();
        }
        this.checkAllFavoriteUpdates();
    }

    switchTab(tabName) {
        document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        document.querySelectorAll('.sidebar-tab-panel').forEach(p => p.hidden = p.dataset.panel !== tabName);
    }

    addTag() {
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
    }

    addTodo() {
        const text = this.todoInput.value.trim();
        if (!text) return;
        const note = this.notes.find(n => n.id === this.activeId);
        if (!note) return;
        if (!note.todos) note.todos = [];
        note.todos.push({ id: Date.now().toString(), text, done: false });
        note.updatedAt = Date.now();
        this.persist();
        this.renderTodoPane(note);
        this.todoInput.value = '';
    }

    openSidebar() {
        this.sidebar.classList.add('open');
    }

    closeSidebar() {
        this.sidebar.classList.remove('open');
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
            todos: [],
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
        this.closeSidebar();
        const note = this.notes.find(n => n.id === id);
        if (!note) return;
        this.titleInput.value = note.title;
        this.bodyInput.value = note.body;
        this.formatSelect.value = note.format || 'text';
        this.updatedAt.textContent = this.formatDate(note.updatedAt);
        this.updateFormatView();
        this.renderTagEditor(note);
        this.renderTodoPane(note);
        this.renderFavoritePane(note);
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
        const fmt = this.formatSelect.value;
        const isMd = fmt === 'markdown';
        const isTodo = fmt === 'todo';
        this.bodyInput.hidden = isTodo;
        this.previewPane.hidden = !isMd;
        this.todoPane.hidden = !isTodo;
        if (isMd) this.updatePreview();
        if (isTodo) {
            const note = this.notes.find(n => n.id === this.activeId);
            if (note) this.renderTodoPane(note);
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
            this.todoPane.hidden = true;
            this.tagList.innerHTML = '';
            this.todoItems.innerHTML = '';
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
        if (this.activeId) this.updateFormatView();
    }

    renderCalendar() {
        const y = this.calYear, m = this.calMonth;
        const isMonthSelected = this.filterMonth === `${y}-${m}`;
        this.calTitle.textContent = `${y}年${m + 1}月`;
        this.calTitle.classList.toggle('selected', isMonthSelected);

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

    getFilteredNotes() {
        let notes = this.notes.slice().sort((a, b) => b.updatedAt - a.updatedAt);

        if (this.filterDate) {
            const [fy, fm, fd] = this.filterDate.split('-').map(Number);
            notes = notes.filter(n => {
                const d = new Date(n.updatedAt);
                return d.getFullYear() === fy && d.getMonth() === fm && d.getDate() === fd;
            });
        } else if (this.filterMonth) {
            const [fy, fm] = this.filterMonth.split('-').map(Number);
            notes = notes.filter(n => {
                const d = new Date(n.updatedAt);
                return d.getFullYear() === fy && d.getMonth() === fm;
            });
        }

        if (this.filterTag) {
            notes = notes.filter(n => n.tags && n.tags.includes(this.filterTag));
        }

        if (this.filterFormat) {
            notes = notes.filter(n => (n.format || 'text') === this.filterFormat);
        }

        return notes;
    }

    renderList() {
        this.noteList.innerHTML = '';
        const notes = this.getFilteredNotes();
        const filterCount = [this.filterDate || this.filterMonth, this.filterTag, this.filterFormat].filter(Boolean).length;
        this.exportBtn.textContent = filterCount ? `↓ CSV出力 (${notes.length}件)` : '↓ CSV出力';
        const badge = filterCount ? `<span class="filter-badge">${filterCount}</span>` : '';
        this.filterTab.innerHTML = `フィルター${badge}`;

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

    renderTodoPane(note) {
        this.todoItems.innerHTML = '';
        (note.todos || []).forEach(todo => {
            const li = document.createElement('li');
            li.className = 'todo-item' + (todo.done ? ' done' : '');
            li.innerHTML = `
                <input type="checkbox" ${todo.done ? 'checked' : ''}>
                <input type="text" class="todo-item-text" value="${this.escapeHtml(todo.text)}">
                <button class="todo-item-delete">×</button>
            `;
            li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                todo.done = e.target.checked;
                li.classList.toggle('done', todo.done);
                note.updatedAt = Date.now();
                this.persist();
                this.renderList();
            });
            li.querySelector('.todo-item-text').addEventListener('input', (e) => {
                todo.text = e.target.value;
                note.updatedAt = Date.now();
                this.persist();
            });
            li.querySelector('.todo-item-delete').addEventListener('click', () => {
                note.todos = note.todos.filter(t => t.id !== todo.id);
                note.updatedAt = Date.now();
                this.persist();
                this.renderTodoPane(note);
                this.renderList();
            });
            this.todoItems.appendChild(li);
        });
    }

    renderFavoritePane(note) {
        this.favoriteUrlInput.value = note.favoriteUrl || '';
        this.favoriteNotifyCheck.checked = !!note.favoriteNotify;
        this.favoriteStatus.textContent = '';
        this.favoriteStatus.className = 'favorite-status';
        if (note.favoriteSiteTitle || note.favoriteSiteDesc) {
            this.showFavoriteSiteInfo(note);
        } else {
            this.favoriteSiteInfo.hidden = true;
        }
        this.favoriteLastChecked.textContent = note.favoriteLastChecked
            ? `最終確認: ${this.formatDate(note.favoriteLastChecked)}`
            : '';
    }

    showFavoriteSiteInfo(note) {
        this.favoriteSiteTitle.textContent = note.favoriteSiteTitle || '';
        this.favoriteSiteDesc.textContent = note.favoriteSiteDesc || '';
        if (note.favoriteSiteImage) {
            this.favoriteSiteImage.src = note.favoriteSiteImage;
            this.favoriteSiteImage.hidden = false;
            this.favoriteSiteImage.onerror = () => { this.favoriteSiteImage.hidden = true; };
        } else {
            this.favoriteSiteImage.hidden = true;
        }
        const url = note.favoriteUrl || '';
        this.favoriteSiteLink.textContent = url;
        this.favoriteSiteLink.href = url;
        this.favoriteSiteInfo.hidden = false;
    }

    async checkFavoriteUrl() {
        let url = this.favoriteUrlInput.value.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        this.favoriteUrlInput.value = url;
        const note = this.notes.find(n => n.id === this.activeId);
        if (!note) return;

        this.favoriteCheckBtn.disabled = true;
        this.favoriteStatus.textContent = '取得中...';
        this.favoriteStatus.className = 'favorite-status';

        try {
            const info = await this.fetchSiteInfo(url);
            note.favoriteUrl = url;
            note.favoriteSiteTitle = info.title;
            note.favoriteSiteDesc = info.description;
            note.favoriteSiteImage = info.image;
            note.favoriteSiteHash = info.hash;
            note.favoriteLastChecked = Date.now();
            if (!note.title) {
                note.title = info.title;
                this.titleInput.value = info.title;
            }
            note.updatedAt = Date.now();
            this.persist();
            this.renderList();
            this.showFavoriteSiteInfo(note);
            this.favoriteLastChecked.textContent = `最終確認: ${this.formatDate(note.favoriteLastChecked)}`;
            this.favoriteStatus.textContent = '取得完了';
            this.favoriteStatus.className = 'favorite-status success';
        } catch (e) {
            this.favoriteStatus.textContent = '取得に失敗しました。URLを確認してください。';
            this.favoriteStatus.className = 'favorite-status error';
        } finally {
            this.favoriteCheckBtn.disabled = false;
        }
    }

    async fetchSiteInfo(url) {
        // まず microlink.io API で取得を試みる（YouTube等に対応）
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 10000);
            const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: ctrl.signal });
            clearTimeout(timer);
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success') {
                    const d = json.data;
                    const title = d.title || '';
                    const description = d.description || '';
                    const image = d.image?.url || d.logo?.url || '';
                    const hash = await this.hashString(JSON.stringify(d));
                    return { title, description, image, hash };
                }
            }
        } catch (_) { /* フォールバックへ */ }

        // フォールバック: CORSプロキシ経由でHTMLを取得してOGP解析
        const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        ];
        let html = null;
        for (const proxyUrl of proxies) {
            try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 8000);
                const res = await fetch(proxyUrl, { signal: ctrl.signal });
                clearTimeout(timer);
                if (res.ok) { html = await res.text(); break; }
            } catch (_) { /* 次のプロキシを試す */ }
        }
        if (!html) throw new Error('fetch failed');

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const getMeta = (...props) => {
            for (const p of props) {
                const el = doc.querySelector(`meta[property="${p}"], meta[name="${p}"]`);
                if (el && el.getAttribute('content')) return el.getAttribute('content');
            }
            return '';
        };

        const base = new URL(url);
        const title = getMeta('og:title', 'twitter:title') || doc.title || '';
        const description = getMeta('og:description', 'twitter:description', 'description') || '';
        let image = getMeta('og:image', 'twitter:image') || '';
        if (image && !image.startsWith('http')) {
            image = image.startsWith('/') ? `${base.origin}${image}` : `${base.origin}/${image}`;
        }
        if (!image) image = `${base.origin}/favicon.ico`;

        const hash = await this.hashString(html.slice(0, 50000));
        return { title, description, image, hash };
    }

    async hashString(str) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async checkAllFavoriteUpdates() {
        const favNotes = this.notes.filter(n => n.format === 'favorite' && n.favoriteUrl && n.favoriteNotify && n.favoriteSiteHash);
        if (favNotes.length === 0) return;
        if (Notification.permission !== 'granted') return;

        for (const note of favNotes) {
            try {
                const info = await this.fetchSiteInfo(note.favoriteUrl);
                if (info.hash !== note.favoriteSiteHash) {
                    note.favoriteSiteHash = info.hash;
                    note.favoriteLastChecked = Date.now();
                    this.persist();
                    new Notification('Kakumee - サイト更新通知', {
                        body: `「${note.title || note.favoriteUrl}」が更新されました`,
                        icon: '/favicon.ico',
                    });
                }
            } catch (_) { /* 取得失敗は無視 */ }
        }
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

        this.tagSuggestions.innerHTML = allTags
            .map(t => `<option value="${this.escapeHtml(t)}">`)
            .join('');

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
        const rows = this.getFilteredNotes().map(n => [
            this.csvEscape(n.id),
            this.csvEscape(n.title),
            this.csvEscape(n.body),
            this.csvEscape(n.format || 'text'),
            this.csvEscape(new Date(n.updatedAt).toISOString()),
        ].join(','));

        const csv = '﻿' + [header.join(','), ...rows].join('\r\n');
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        this.exportCount++;
        const seq = String(this.exportCount).padStart(2, '0');
        const filename = `note_${dateStr}_${timeStr}_${seq}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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
