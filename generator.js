const NOTES_KEY = 'notepad-notes';
const SITES_KEY = 'kakumee-sites';
const API_KEY_KEY = 'kakumee-anthropic-key';
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.131.0/+esm';
const MODEL = 'claude-opus-5-5';
const MAX_HISTORY = 20;

const TYPE_LABELS = {
    blog: 'ブログ',
    portfolio: 'ポートフォリオ',
    website: 'ウェブサイト',
};

const TYPE_GUIDES = {
    blog: `ブログサイトを作成してください。
- メモ1件を基本的に1記事とし、内容を読みやすい記事に整えてください（見出し・段落・リストを適切に使う）。
- トップに記事一覧（タイトル・日付・タグ・抜粋）を置き、クリックで各記事を表示できるようにしてください（1ファイル内でハッシュリンクやJSによる切り替え）。
- タグ別の絞り込みやサイドバーのタグ一覧があると望ましいです。`,
    portfolio: `ポートフォリオサイトを作成してください。
- メモから、作者の人物像・スキル・制作物/実績・経歴・関心分野を読み取り、構成してください。
- ヒーローセクション（名前/肩書き/一言紹介）、About、Skills、Works（カード形式）、Contact などのセクションを想定してください。
- メモに書かれていない実績や経歴を創作しないでください。情報が足りない項目はセクションごと省くか、「ここに〇〇を追加」といった控えめなプレースホルダーにしてください。`,
    website: `一般的なウェブサイト（お店・サービス・団体・個人活動などの紹介サイト）を作成してください。
- メモの内容から、サイトの目的と対象読者を推測し、それにふさわしいページ構成（例: トップ、概要、サービス/メニュー、お知らせ、アクセス/お問い合わせ）にしてください。
- ナビゲーションから各セクションへスクロールできる1ページ構成を基本としてください。`,
};

const SYSTEM_PROMPT = `あなたは優秀なWebデザイナー兼フロントエンドエンジニアです。
ユーザーが書きためたメモをもとに、公開できる品質のWebサイトを1つのHTMLファイルとして作成します。

出力ルール:
- 出力は完成したHTMLドキュメントのみとし、<!DOCTYPE html> で始めて </html> で終えてください。前置きや説明、コードフェンス(\`\`\`)は付けないでください。
- CSSとJavaScriptはすべて <style> / <script> タグでHTML内に埋め込み、外部のCSS・JSファイルやフレームワークは読み込まないでください（Google Fonts の読み込みのみ可）。
- 画像ファイルは用意されていません。メモ内に画像URLがある場合のみ使用し、それ以外はCSSのグラデーション・図形・絵文字・インラインSVGで装飾してください。
- スマートフォンからPCまで崩れないレスポンシブデザインにしてください。
- 本文はメモと同じ言語（通常は日本語）で書いてください。lang属性も合わせてください。

内容のルール:
- メモに書かれている事実をもとに構成してください。誤字や読みにくい表現は整えて構いませんが、メモにない固有の事実（経歴、数値、受賞歴、連絡先など）を創作しないでください。
- 個人的すぎる情報（パスワード、住所、電話番号など公開に適さないもの）がメモに含まれていても、ユーザーが明示的に求めない限りサイトに載せないでください。
- TODOリストの未完了タスクなど、サイトの目的に合わないメモは無理に使わず省いて構いません。`;

class SiteGenerator {
    constructor() {
        this.notes = this.load(NOTES_KEY, []);
        this.sites = this.load(SITES_KEY, []);
        this.selected = new Set(this.notes.map(n => n.id));
        this.current = null; // { id, type, title, html, createdAt, noteIds }
        this.busy = false;

        this.$ = id => document.getElementById(id);
        this.notePicker = this.$('notePicker');
        this.tagFilter = this.$('tagFilter');
        this.statusEl = this.$('genStatus');
        this.generateBtn = this.$('generateBtn');
        this.previewFrame = this.$('previewFrame');
        this.codeOutput = this.$('codeOutput');
        this.apiKeyInput = this.$('apiKeyInput');
        this.rememberKey = this.$('rememberKey');

        const savedKey = this.loadRaw(API_KEY_KEY);
        if (savedKey) {
            this.apiKeyInput.value = savedKey;
            this.rememberKey.checked = true;
        }

        this.bindEvents();
        this.renderTagFilter();
        this.renderNotePicker();
        this.renderHistory();
        if (this.sites.length > 0) this.showSite(this.sites[0]);
    }

    load(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    loadRaw(key) {
        try { return localStorage.getItem(key) || ''; } catch (_) { return ''; }
    }

    bindEvents() {
        this.$('selectAllBtn').addEventListener('click', () => {
            this.visibleNotes().forEach(n => this.selected.add(n.id));
            this.renderNotePicker();
        });
        this.$('selectNoneBtn').addEventListener('click', () => {
            this.visibleNotes().forEach(n => this.selected.delete(n.id));
            this.renderNotePicker();
        });
        this.tagFilter.addEventListener('change', () => this.renderNotePicker());

        this.$('toggleKeyBtn').addEventListener('click', (e) => {
            const show = this.apiKeyInput.type === 'password';
            this.apiKeyInput.type = show ? 'text' : 'password';
            e.target.textContent = show ? '隠す' : '表示';
        });
        this.rememberKey.addEventListener('change', () => this.persistKey());
        this.apiKeyInput.addEventListener('change', () => this.persistKey());

        this.generateBtn.addEventListener('click', () => this.generate());
        this.$('refineBtn').addEventListener('click', () => this.refine());
        this.$('refineInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.isComposing) this.refine();
        });

        document.querySelectorAll('.result-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchView(tab.dataset.view));
        });
        this.$('downloadBtn').addEventListener('click', () => this.download());
        this.$('copyBtn').addEventListener('click', () => this.copy());
        this.$('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('preview-fullscreen')) this.toggleFullscreen();
        });
    }

    persistKey() {
        try {
            if (this.rememberKey.checked && this.apiKeyInput.value.trim()) {
                localStorage.setItem(API_KEY_KEY, this.apiKeyInput.value.trim());
            } else {
                localStorage.removeItem(API_KEY_KEY);
            }
        } catch (_) { /* 保存できなくても動作は継続 */ }
    }

    // ---------- メモ選択 ----------

    visibleNotes() {
        const tag = this.tagFilter.value;
        return this.notes
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .filter(n => !tag || (n.tags || []).includes(tag));
    }

    renderTagFilter() {
        const tags = [...new Set(this.notes.flatMap(n => n.tags || []))].sort();
        tags.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            this.tagFilter.appendChild(opt);
        });
    }

    renderNotePicker() {
        this.notePicker.innerHTML = '';
        const notes = this.visibleNotes();
        if (this.notes.length === 0) {
            this.notePicker.innerHTML = '<li class="picker-empty">メモがありません。<a href="index.html">メモ画面</a>で書いてから戻ってきてください。</li>';
        }
        notes.forEach(note => {
            const li = document.createElement('li');
            li.className = 'picker-item';
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = this.selected.has(note.id);
            cb.addEventListener('change', () => {
                if (cb.checked) this.selected.add(note.id);
                else this.selected.delete(note.id);
                this.updateSelectedCount();
            });
            const text = document.createElement('span');
            text.className = 'picker-text';
            const title = document.createElement('span');
            title.className = 'picker-title';
            title.textContent = note.title || '無題のメモ';
            const meta = document.createElement('span');
            meta.className = 'picker-meta';
            const tags = (note.tags || []).map(t => `#${t}`).join(' ');
            meta.textContent = [new Date(note.updatedAt).toLocaleDateString('ja-JP'), tags].filter(Boolean).join('  ');
            text.append(title, meta);
            label.append(cb, text);
            li.appendChild(label);
            this.notePicker.appendChild(li);
        });
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        this.$('selectedCount').textContent = `${this.selected.size} / ${this.notes.length} 件選択中`;
    }

    // ---------- プロンプト組み立て ----------

    serializeNotes(notes) {
        return notes.map((n, i) => {
            const lines = [`<memo index="${i + 1}">`];
            lines.push(`タイトル: ${n.title || '(無題)'}`);
            lines.push(`更新日: ${new Date(n.updatedAt).toLocaleDateString('ja-JP')}`);
            if (n.tags && n.tags.length) lines.push(`タグ: ${n.tags.join(', ')}`);
            const fmt = n.format || 'text';
            lines.push(`形式: ${fmt === 'markdown' ? 'Markdown' : fmt === 'todo' ? 'TODOリスト' : 'テキスト'}`);
            if (n.favoriteUrl) {
                lines.push(`関連URL: ${n.favoriteUrl}`);
                if (n.favoriteSiteTitle) lines.push(`URLのページタイトル: ${n.favoriteSiteTitle}`);
                if (n.favoriteSiteDesc) lines.push(`URLの説明: ${n.favoriteSiteDesc}`);
                if (n.favoriteSiteImage) lines.push(`URLの画像: ${n.favoriteSiteImage}`);
            }
            if (fmt === 'todo' && n.todos && n.todos.length) {
                lines.push('内容:');
                n.todos.forEach(t => lines.push(`- [${t.done ? 'x' : ' '}] ${t.text}`));
            } else {
                lines.push('内容:');
                lines.push(n.body || '');
            }
            lines.push('</memo>');
            return lines.join('\n');
        }).join('\n\n');
    }

    buildRequest() {
        const type = document.querySelector('input[name="siteType"]:checked').value;
        const notes = this.notes
            .filter(n => this.selected.has(n.id))
            .sort((a, b) => b.updatedAt - a.updatedAt);
        const siteName = this.$('siteName').value.trim();
        const style = this.$('styleSelect').value;
        const color = this.$('colorInput').value;
        const extra = this.$('extraInput').value.trim();

        const prompt = [
            `以下のメモ（${notes.length}件）をもとに、${TYPE_LABELS[type]}を作ってください。`,
            '',
            TYPE_GUIDES[type],
            '',
            'デザインの希望:',
            `- 雰囲気: ${style}`,
            `- メインカラー: ${color}`,
            siteName ? `- サイト名: ${siteName}` : '- サイト名: メモの内容から適切なものを考えてください',
            extra ? `\nユーザーからの追加の要望:\n${extra}` : '',
            '',
            '<memos>',
            this.serializeNotes(notes),
            '</memos>',
        ].join('\n');

        return { type, notes, prompt, siteName };
    }

    // ---------- 生成 ----------

    async getClient() {
        const apiKey = this.apiKeyInput.value.trim();
        if (!apiKey) throw new UserError('Claude API キーを入力してください。');
        this.persistKey();
        let Anthropic;
        try {
            ({ default: Anthropic } = await import(SDK_URL));
        } catch (_) {
            throw new UserError('AIライブラリの読み込みに失敗しました。ネットワーク接続を確認してください。');
        }
        return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    }

    async generate() {
        if (this.busy) return;
        const req = this.buildRequest();
        if (req.notes.length === 0) {
            this.setStatus('メモを1件以上選択してください。', 'error');
            return;
        }
        const html = await this.runClaude([{ role: 'user', content: req.prompt }]);
        if (!html) return;
        const site = {
            id: Date.now().toString(),
            type: req.type,
            title: this.extractTitle(html) || req.siteName || TYPE_LABELS[req.type],
            html,
            createdAt: Date.now(),
            noteIds: req.notes.map(n => n.id),
            prompt: req.prompt,
        };
        this.saveSite(site);
        this.showSite(site);
        this.switchView('preview');
    }

    async refine() {
        if (this.busy || !this.current) return;
        const input = this.$('refineInput');
        const request = input.value.trim();
        if (!request) return;

        const messages = [];
        if (this.current.prompt) {
            messages.push({ role: 'user', content: this.current.prompt });
            messages.push({ role: 'assistant', content: this.current.html });
            messages.push({ role: 'user', content: `次の修正をして、修正後のHTMLドキュメント全体を出力してください。\n\n修正内容: ${request}` });
        } else {
            messages.push({
                role: 'user',
                content: `次のHTMLサイトに修正を加えて、修正後のHTMLドキュメント全体を出力してください。\n\n修正内容: ${request}\n\n<current_html>\n${this.current.html}\n</current_html>`,
            });
        }
        const html = await this.runClaude(messages);
        if (!html) return;
        const site = {
            ...this.current,
            id: Date.now().toString(),
            title: this.extractTitle(html) || this.current.title,
            html,
            createdAt: Date.now(),
            prompt: this.current.prompt
                ? `${this.current.prompt}\n\n(追加の修正: ${request})`
                : undefined,
        };
        this.saveSite(site);
        this.showSite(site);
        input.value = '';
        this.switchView('preview');
    }

    async runClaude(messages) {
        this.setBusy(true);
        this.setStatus('AIの準備中...', 'progress');
        try {
            const client = await this.getClient();
            const stream = client.beta.messages.stream({
                model: MODEL,
                max_tokens: 64000,
                thinking: { type: 'adaptive' },
                output_config: { effort: 'medium' },
                // 安全分類器による誤検知でリクエストが止まった場合、別モデルで自動再試行する
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default',
                system: SYSTEM_PROMPT,
                messages,
            });

            let text = '';
            let thinkingShown = false;
            this.codeOutput.textContent = '';
            stream.on('streamEvent', (event) => {
                if (event.type === 'content_block_start' && event.content_block.type === 'thinking' && !thinkingShown) {
                    thinkingShown = true;
                    this.setStatus('AIがメモを読んで構成を考えています...', 'progress');
                }
            });
            stream.on('text', (delta) => {
                text += delta;
                this.setStatus(`サイトを書いています... (${text.length.toLocaleString()} 文字)`, 'progress');
                this.codeOutput.textContent = text;
                this.codeOutput.scrollTop = this.codeOutput.scrollHeight;
            });

            const message = await stream.finalMessage();

            if (message.stop_reason === 'refusal') {
                this.setStatus('この内容ではサイトを生成できませんでした。使うメモや要望を変えて再度お試しください。', 'error');
                return null;
            }
            const finalText = message.content
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('');
            const html = this.extractHtml(finalText);
            if (!html) {
                this.setStatus('HTMLを取り出せませんでした。もう一度お試しください。', 'error');
                return null;
            }
            if (message.stop_reason === 'max_tokens') {
                this.setStatus('サイトが長すぎて途中で終わりました。メモの数を減らすと改善します。', 'error');
            } else {
                this.setStatus('サイトができました！', 'success');
            }
            return html;
        } catch (err) {
            this.setStatus(this.describeError(err), 'error');
            return null;
        } finally {
            this.setBusy(false);
        }
    }

    describeError(err) {
        if (err instanceof UserError) return err.message;
        const status = err && err.status;
        if (status === 401) return 'API キーが正しくありません。キーを確認してください。';
        if (status === 403) return 'この API キーではこの操作が許可されていません。';
        if (status === 429) return 'リクエストが多すぎます。しばらく待ってから再度お試しください。';
        if (status === 529 || (status && status >= 500)) return 'AIサービスが混み合っています。しばらく待ってから再度お試しください。';
        if (status === 400) return `リクエストが受け付けられませんでした: ${err.message || ''}`;
        if (err && err.name === 'APIConnectionError') return 'AIサービスに接続できませんでした。ネットワークを確認してください。';
        return `エラーが発生しました: ${(err && err.message) || err}`;
    }

    extractHtml(text) {
        let t = text.trim();
        const fence = t.match(/```(?:html)?\s*([\s\S]*?)```/i);
        if (fence && !/^<!DOCTYPE|^<html/i.test(t)) t = fence[1].trim();
        const start = t.search(/<!DOCTYPE html|<html/i);
        if (start === -1) return null;
        t = t.slice(start);
        const end = t.toLowerCase().lastIndexOf('</html>');
        return end === -1 ? t : t.slice(0, end + '</html>'.length);
    }

    extractTitle(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return (doc.title || '').trim();
    }

    // ---------- 表示・保存 ----------

    saveSite(site) {
        this.sites.unshift(site);
        this.sites = this.sites.slice(0, MAX_HISTORY);
        // 容量オーバー時は古い履歴から削って保存を試みる
        while (this.sites.length > 0) {
            try {
                localStorage.setItem(SITES_KEY, JSON.stringify(this.sites));
                break;
            } catch (_) {
                if (this.sites.length === 1) break;
                this.sites.pop();
            }
        }
        this.renderHistory();
    }

    showSite(site) {
        this.current = site;
        this.$('emptyState').hidden = true;
        this.previewFrame.hidden = false;
        this.previewFrame.srcdoc = site.html;
        this.codeOutput.textContent = site.html;
        ['downloadBtn', 'copyBtn', 'fullscreenBtn'].forEach(id => { this.$(id).disabled = false; });
        this.$('refineBar').hidden = false;
        this.renderHistory();
    }

    renderHistory() {
        const list = this.$('historyList');
        list.innerHTML = '';
        if (this.sites.length === 0) {
            list.innerHTML = '<li class="history-empty">まだ生成したサイトはありません。</li>';
            return;
        }
        this.sites.forEach(site => {
            const li = document.createElement('li');
            li.className = 'history-item' + (this.current && this.current.id === site.id ? ' active' : '');
            const info = document.createElement('button');
            info.className = 'history-open';
            const badge = document.createElement('span');
            badge.className = `history-badge ${site.type}`;
            badge.textContent = TYPE_LABELS[site.type] || site.type;
            const title = document.createElement('span');
            title.className = 'history-title';
            title.textContent = site.title;
            const date = document.createElement('span');
            date.className = 'history-date';
            date.textContent = new Date(site.createdAt).toLocaleString('ja-JP');
            info.append(badge, title, date);
            info.addEventListener('click', () => {
                this.showSite(site);
                this.switchView('preview');
            });
            const del = document.createElement('button');
            del.className = 'history-delete';
            del.title = '削除';
            del.textContent = '×';
            del.addEventListener('click', () => {
                if (!confirm(`「${site.title}」を履歴から削除しますか？`)) return;
                this.sites = this.sites.filter(s => s.id !== site.id);
                try { localStorage.setItem(SITES_KEY, JSON.stringify(this.sites)); } catch (_) { /* noop */ }
                this.renderHistory();
            });
            li.append(info, del);
            list.appendChild(li);
        });
    }

    switchView(view) {
        document.querySelectorAll('.result-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
        this.$('previewView').hidden = view !== 'preview';
        this.$('codeView').hidden = view !== 'code';
        this.$('historyView').hidden = view !== 'history';
    }

    setBusy(busy) {
        this.busy = busy;
        this.generateBtn.disabled = busy;
        this.$('refineBtn').disabled = busy;
        this.generateBtn.textContent = busy ? '生成中...' : '✨ サイトを生成する';
        if (busy) this.switchView('code');
    }

    setStatus(text, kind) {
        this.statusEl.textContent = text;
        this.statusEl.className = `gen-status ${kind || ''}`;
    }

    fileName() {
        const base = (this.current.title || 'site')
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 40) || 'site';
        return `${base}.html`;
    }

    download() {
        if (!this.current) return;
        const blob = new Blob([this.current.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileName();
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async copy() {
        if (!this.current) return;
        try {
            await navigator.clipboard.writeText(this.current.html);
            this.setStatus('HTMLをコピーしました。', 'success');
        } catch (_) {
            this.setStatus('コピーできませんでした。HTMLタブから手動でコピーしてください。', 'error');
        }
    }

    toggleFullscreen() {
        // 生成されたHTMLはこのアプリと同じオリジンで開かず、サンドボックス化した iframe のまま拡大表示する
        const on = document.body.classList.toggle('preview-fullscreen');
        this.$('fullscreenBtn').textContent = on ? '✕ 閉じる' : '⛶ 全画面';
        if (on) this.switchView('preview');
    }
}

class UserError extends Error {}

new SiteGenerator();
