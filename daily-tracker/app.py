import os
import sys
import json
import time
import threading
import datetime
import tkinter as tk
from tkinter import ttk, messagebox

import pystray
from PIL import Image, ImageDraw

from scheduler_logic import due_break, due_reminder

try:
    from win11toast import notify as _win_notify
except Exception:
    _win_notify = None


def get_data_dir():
    base = os.getenv('APPDATA') or os.path.expanduser('~')
    d = os.path.join(base, 'DailyTracker')
    os.makedirs(d, exist_ok=True)
    return d


SETTINGS_PATH = os.path.join(get_data_dir(), 'settings.json')

DEFAULT_SETTINGS = {
    "notes": "",
    "reminders": [],
    "breaks": {
        "breathe": {"label": "Breathing break", "enabled": True, "interval_min": 20,
                    "message": "Take a breath. Relax your shoulders and eyes for a moment.", "last_fired_ts": 0},
        "rest": {"label": "Rest break", "enabled": True, "interval_min": 60,
                 "message": "Time to rest for about 15 minutes.", "last_fired_ts": 0},
        "stand": {"label": "Stand break", "enabled": True, "interval_min": 30,
                  "message": "Stand up and stretch for about 10 minutes.", "last_fired_ts": 0},
    },
}


def load_settings():
    if os.path.exists(SETTINGS_PATH):
        try:
            with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
            merged = json.loads(json.dumps(DEFAULT_SETTINGS))
            merged.update({k: v for k, v in data.items() if k != 'breaks'})
            if 'breaks' in data:
                for k, v in data['breaks'].items():
                    merged['breaks'].setdefault(k, {}).update(v)
            return merged
        except Exception:
            pass
    return json.loads(json.dumps(DEFAULT_SETTINGS))


def save_settings(settings):
    tmp = SETTINGS_PATH + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=2)
    os.replace(tmp, SETTINGS_PATH)


COLORS = {
    'bg': '#ECFEFF',
    'surface': '#FFFFFF',
    'primary': '#0891B2',
    'primary_dark': '#0E7490',
    'primary_tint': '#CFFAFE',
    'success': '#059669',
    'success_dark': '#047857',
    'text': '#164E63',
    'text_muted': '#475569',
    'border': '#A5F3FC',
    'border_light': '#E2E8F0',
}
FONT = 'Segoe UI'


def apply_theme(root):
    style = ttk.Style(root)
    if 'clam' in style.theme_names():
        style.theme_use('clam')  # only theme that lets us fully recolor ttk widgets
    root.configure(bg=COLORS['bg'])

    style.configure('.', background=COLORS['bg'], foreground=COLORS['text'], font=(FONT, 10))
    style.configure('TFrame', background=COLORS['bg'])
    style.configure('Surface.TFrame', background=COLORS['surface'])
    style.configure('TLabel', background=COLORS['bg'], foreground=COLORS['text_muted'], font=(FONT, 10))
    style.configure('Surface.TLabel', background=COLORS['surface'], foreground=COLORS['text_muted'], font=(FONT, 10))
    style.configure('Title.TLabel', background=COLORS['bg'], foreground=COLORS['text'], font=(FONT, 17, 'bold'))
    style.configure('Subtitle.TLabel', background=COLORS['bg'], foreground=COLORS['text_muted'], font=(FONT, 10))
    style.configure('CardTitle.TLabel', background=COLORS['surface'], foreground=COLORS['text'], font=(FONT, 11, 'bold'))

    style.configure('Header.TFrame', background=COLORS['bg'])

    style.configure('TNotebook', background=COLORS['bg'], borderwidth=0)
    style.configure('TNotebook.Tab', background=COLORS['bg'], foreground=COLORS['text_muted'],
                     font=(FONT, 10, 'bold'), padding=(18, 10), borderwidth=0)
    style.map('TNotebook.Tab',
              background=[('selected', COLORS['surface'])],
              foreground=[('selected', COLORS['primary'])])

    style.configure('TButton', background=COLORS['primary'], foreground='white',
                     font=(FONT, 10), padding=(14, 8), borderwidth=0, focuscolor=COLORS['primary'])
    style.map('TButton', background=[('active', COLORS['primary_dark']), ('disabled', COLORS['border_light'])])

    style.configure('Secondary.TButton', background=COLORS['surface'], foreground=COLORS['primary'],
                     bordercolor=COLORS['primary'], borderwidth=1, padding=(14, 8))
    style.map('Secondary.TButton', background=[('active', COLORS['bg'])])

    style.configure('Success.TButton', background=COLORS['success'], foreground='white',
                     borderwidth=0, padding=(14, 8))
    style.map('Success.TButton', background=[('active', COLORS['success_dark'])])

    style.configure('TEntry', fieldbackground=COLORS['surface'], bordercolor=COLORS['border'],
                     lightcolor=COLORS['border'], darkcolor=COLORS['border'], padding=6)
    style.configure('TCombobox', fieldbackground=COLORS['surface'], padding=6)
    style.configure('TSpinbox', fieldbackground=COLORS['surface'], bordercolor=COLORS['border'], padding=6)
    style.configure('TCheckbutton', background=COLORS['bg'], foreground=COLORS['text'], font=(FONT, 10))
    style.configure('Surface.TCheckbutton', background=COLORS['surface'], foreground=COLORS['text'], font=(FONT, 10))
    style.map('TCheckbutton', background=[('active', COLORS['bg'])])
    style.map('Surface.TCheckbutton', background=[('active', COLORS['surface'])])

    style.configure('Treeview', background=COLORS['surface'], fieldbackground=COLORS['surface'],
                     foreground=COLORS['text'], rowheight=28, borderwidth=0, font=(FONT, 10))
    style.configure('Treeview.Heading', background=COLORS['bg'], foreground=COLORS['text'],
                     font=(FONT, 10, 'bold'), borderwidth=0, relief='flat')
    style.map('Treeview.Heading', background=[('active', COLORS['bg'])])
    style.map('Treeview', background=[('selected', COLORS['primary'])], foreground=[('selected', 'white')])


def notify(title, message):
    if _win_notify:
        try:
            _win_notify(title, message)
            return
        except Exception:
            pass
    print(f"[NOTIFY] {title}: {message}")  # ponytail: dev/non-Windows fallback


class Scheduler(threading.Thread):
    def __init__(self, settings, lock):
        super().__init__(daemon=True)
        self.settings = settings
        self.lock = lock
        self.running = True

    def run(self):
        while self.running:
            now = datetime.datetime.now()
            now_ts = time.time()
            changed = False
            with self.lock:
                for key, b in self.settings['breaks'].items():
                    if b.get('enabled') and due_break(b.get('last_fired_ts', 0), b.get('interval_min', 0), now_ts):
                        notify(b.get('label', key.title()), b.get('message', ''))
                        b['last_fired_ts'] = now_ts
                        changed = True
                for r in self.settings['reminders']:
                    if r.get('enabled') and due_reminder(r.get('time', ''), r.get('last_fired_date'), now):
                        notify(f"{r.get('category', 'Reminder')}: {r.get('title', '')}", r.get('title', ''))
                        r['last_fired_date'] = now.strftime('%Y-%m-%d')
                        changed = True
                if changed:
                    save_settings(self.settings)
            time.sleep(15)

    def stop(self):
        self.running = False


class App:
    def __init__(self, root, settings, lock):
        self.root = root
        self.settings = settings
        self.lock = lock
        root.title("Daily Tracker")
        root.geometry("720x560")
        root.minsize(560, 420)
        root.protocol('WM_DELETE_WINDOW', self.hide)
        apply_theme(root)

        header = ttk.Frame(root, style='Header.TFrame', padding=(20, 16, 20, 8))
        header.pack(fill='x')
        ttk.Label(header, text='Daily Tracker', style='Title.TLabel').pack(anchor='w')
        ttk.Label(header, text='Notes, reminders and healthy break nudges', style='Subtitle.TLabel').pack(anchor='w')

        nb = ttk.Notebook(root)
        nb.pack(fill='both', expand=True, padx=20, pady=(4, 20))

        self.notes_tab = ttk.Frame(nb, style='Surface.TFrame')
        self.reminders_tab = ttk.Frame(nb, style='Surface.TFrame')
        self.breaks_tab = ttk.Frame(nb, style='Surface.TFrame')
        nb.add(self.notes_tab, text='Notes')
        nb.add(self.reminders_tab, text='Reminders')
        nb.add(self.breaks_tab, text='Breaks')

        self.build_notes_tab()
        self.build_reminders_tab()
        self.build_breaks_tab()

    # --- Notes ---
    def build_notes_tab(self):
        frame = self.notes_tab
        self.notes_text = tk.Text(
            frame, wrap='word', undo=True, font=(FONT, 11), relief='flat',
            bg=COLORS['surface'], fg=COLORS['text'], insertbackground=COLORS['primary'],
            selectbackground=COLORS['primary_tint'], selectforeground=COLORS['text'],
            highlightthickness=1, highlightbackground=COLORS['border_light'], highlightcolor=COLORS['primary'],
            padx=12, pady=12,
        )
        self.notes_text.pack(fill='both', expand=True, padx=16, pady=(16, 0))
        self.notes_text.insert('1.0', self.settings.get('notes', ''))
        self.notes_status = ttk.Label(frame, text='', style='Surface.TLabel')
        self.notes_status.pack(anchor='e', padx=16, pady=8)
        self._notes_after_id = None
        self.notes_text.bind('<KeyRelease>', self.on_notes_change)

    def on_notes_change(self, event=None):
        if self._notes_after_id:
            self.root.after_cancel(self._notes_after_id)
        self._notes_after_id = self.root.after(800, self.save_notes)

    def save_notes(self):
        with self.lock:
            self.settings['notes'] = self.notes_text.get('1.0', 'end-1c')
            save_settings(self.settings)
        self.notes_status.config(text=f"Saved {datetime.datetime.now().strftime('%H:%M:%S')}")

    # --- Reminders ---
    def build_reminders_tab(self):
        frame = self.reminders_tab
        cols = ('title', 'category', 'time', 'enabled')
        self.rem_tree = ttk.Treeview(frame, columns=cols, show='headings', height=12)
        for c, w in zip(cols, (280, 90, 80, 80)):
            self.rem_tree.heading(c, text=c.title())
            self.rem_tree.column(c, width=w)
        self.rem_tree.tag_configure('on', foreground=COLORS['success'])
        self.rem_tree.tag_configure('off', foreground=COLORS['text_muted'])
        self.rem_tree.pack(fill='both', expand=True, padx=16, pady=16)

        btns = ttk.Frame(frame, style='Surface.TFrame')
        btns.pack(fill='x', padx=16, pady=(0, 16))
        ttk.Button(btns, text='Add reminder', command=self.add_reminder).pack(side='left')
        ttk.Button(btns, text='Edit', style='Secondary.TButton', command=self.edit_reminder).pack(side='left', padx=6)
        ttk.Button(btns, text='Delete', style='Secondary.TButton', command=self.delete_reminder).pack(side='left')

        self.refresh_reminders()

    def refresh_reminders(self):
        self.rem_tree.delete(*self.rem_tree.get_children())
        for i, r in enumerate(self.settings['reminders']):
            tag = 'on' if r['enabled'] else 'off'
            self.rem_tree.insert('', 'end', iid=str(i), tags=(tag,),
                                  values=(r['title'], r['category'], r['time'], 'Yes' if r['enabled'] else 'No'))

    def add_reminder(self):
        self.reminder_dialog()

    def edit_reminder(self):
        sel = self.rem_tree.selection()
        if not sel:
            return
        self.reminder_dialog(int(sel[0]))

    def delete_reminder(self):
        sel = self.rem_tree.selection()
        if not sel:
            return
        idx = int(sel[0])
        with self.lock:
            del self.settings['reminders'][idx]
            save_settings(self.settings)
        self.refresh_reminders()

    def reminder_dialog(self, idx=None):
        data = self.settings['reminders'][idx] if idx is not None else \
            {'title': '', 'category': 'Work', 'time': '09:00', 'enabled': True, 'last_fired_date': None}
        win = tk.Toplevel(self.root, bg=COLORS['surface'])
        win.title('Reminder')
        win.resizable(False, False)
        win.grab_set()

        ttk.Label(win, text='Title', style='Surface.TLabel').grid(row=0, column=0, sticky='w', padx=12, pady=(12, 4))
        title_var = tk.StringVar(value=data['title'])
        ttk.Entry(win, textvariable=title_var, width=30).grid(row=0, column=1, padx=12, pady=(12, 4))

        ttk.Label(win, text='Category', style='Surface.TLabel').grid(row=1, column=0, sticky='w', padx=12, pady=4)
        cat_var = tk.StringVar(value=data['category'])
        ttk.Combobox(win, textvariable=cat_var, values=['Work', 'Health', 'Other'],
                     state='readonly', width=27).grid(row=1, column=1, padx=12, pady=4)

        ttk.Label(win, text='Time (HH:MM, 24h)', style='Surface.TLabel').grid(row=2, column=0, sticky='w', padx=12, pady=4)
        time_var = tk.StringVar(value=data['time'])
        ttk.Entry(win, textvariable=time_var, width=30).grid(row=2, column=1, padx=12, pady=4)

        enabled_var = tk.BooleanVar(value=data['enabled'])
        ttk.Checkbutton(win, text='Enabled', variable=enabled_var, style='Surface.TCheckbutton') \
            .grid(row=3, column=1, sticky='w', padx=12, pady=4)

        def on_save():
            t = time_var.get().strip()
            try:
                datetime.datetime.strptime(t, '%H:%M')
            except ValueError:
                messagebox.showerror('Invalid time', 'Please use HH:MM 24-hour format, e.g. 09:30')
                return
            new = {'title': title_var.get().strip() or 'Reminder', 'category': cat_var.get(), 'time': t,
                   'enabled': enabled_var.get(), 'last_fired_date': data.get('last_fired_date')}
            with self.lock:
                if idx is not None:
                    self.settings['reminders'][idx] = new
                else:
                    self.settings['reminders'].append(new)
                save_settings(self.settings)
            self.refresh_reminders()
            win.destroy()

        ttk.Button(win, text='Save', command=on_save).grid(row=4, column=0, columnspan=2, pady=12)

    # --- Breaks ---
    def build_breaks_tab(self):
        frame = self.breaks_tab
        outer = ttk.Frame(frame, style='Surface.TFrame', padding=16)
        outer.pack(fill='both', expand=True)

        self.break_vars = {}
        for key, b in self.settings['breaks'].items():
            card = tk.Frame(outer, bg=COLORS['surface'], highlightthickness=1,
                             highlightbackground=COLORS['border_light'])
            card.pack(fill='x', pady=(0, 12))
            accent = tk.Frame(card, bg=COLORS['primary'], width=4)
            accent.pack(side='left', fill='y')
            body = ttk.Frame(card, style='Surface.TFrame', padding=(14, 12))
            body.pack(side='left', fill='both', expand=True)
            body.columnconfigure(1, weight=1)

            ttk.Label(body, text=b['label'], style='CardTitle.TLabel').grid(row=0, column=0, sticky='w', columnspan=2)

            enabled_var = tk.BooleanVar(value=b['enabled'])
            ttk.Checkbutton(body, text='Enabled', variable=enabled_var, style='Surface.TCheckbutton') \
                .grid(row=1, column=0, sticky='w', pady=(8, 4))

            interval_row = ttk.Frame(body, style='Surface.TFrame')
            interval_row.grid(row=1, column=1, sticky='e', pady=(8, 4))
            ttk.Label(interval_row, text='Every', style='Surface.TLabel').pack(side='left')
            interval_var = tk.IntVar(value=b['interval_min'])
            ttk.Spinbox(interval_row, from_=1, to=480, textvariable=interval_var, width=5) \
                .pack(side='left', padx=6)
            ttk.Label(interval_row, text='minutes', style='Surface.TLabel').pack(side='left')

            msg_var = tk.StringVar(value=b['message'])
            ttk.Entry(body, textvariable=msg_var).grid(row=2, column=0, columnspan=2, sticky='we', pady=(0, 4))

            ttk.Button(body, text='Test now', style='Secondary.TButton',
                       command=lambda mv=msg_var, lbl=b['label']: notify(lbl, mv.get())) \
                .grid(row=3, column=0, sticky='w', pady=(6, 0))

            self.break_vars[key] = (enabled_var, interval_var, msg_var)

        ttk.Button(outer, text='Save break settings', style='Success.TButton', command=self.save_breaks) \
            .pack(anchor='w', pady=(4, 0))

    def save_breaks(self):
        with self.lock:
            for key, (ev, iv, mv) in self.break_vars.items():
                b = self.settings['breaks'][key]
                b['enabled'] = ev.get()
                b['interval_min'] = max(1, iv.get())
                b['message'] = mv.get()
            save_settings(self.settings)
        messagebox.showinfo('Saved', 'Break settings saved.')

    def hide(self):
        self.root.withdraw()

    def show(self):
        self.root.deiconify()
        self.root.lift()


def make_icon_image():
    img = Image.new('RGB', (64, 64), 'white')
    d = ImageDraw.Draw(img)
    d.ellipse((8, 8, 56, 56), fill=(8, 145, 178))  # matches COLORS['primary']
    d.text((22, 24), 'DT', fill='white')
    return img


def run_tray(app, scheduler):
    def on_open(icon, item):
        app.root.after(0, app.show)

    def do_quit():
        app.save_notes()
        scheduler.stop()
        app.root.destroy()

    def on_quit(icon, item):
        icon.stop()
        app.root.after(0, do_quit)

    menu = pystray.Menu(
        pystray.MenuItem('Open Daily Tracker', on_open, default=True),
        pystray.MenuItem('Quit', on_quit),
    )
    icon = pystray.Icon('DailyTracker', make_icon_image(), 'Daily Tracker', menu)
    icon.run()


def main():
    settings = load_settings()
    lock = threading.Lock()
    scheduler = Scheduler(settings, lock)
    scheduler.start()

    root = tk.Tk()
    app = App(root, settings, lock)

    threading.Thread(target=run_tray, args=(app, scheduler), daemon=True).start()

    root.mainloop()


if __name__ == '__main__':
    main()
