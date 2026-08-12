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
        root.geometry("640x480")
        root.protocol('WM_DELETE_WINDOW', self.hide)

        nb = ttk.Notebook(root)
        nb.pack(fill='both', expand=True)

        self.notes_tab = ttk.Frame(nb)
        self.reminders_tab = ttk.Frame(nb)
        self.breaks_tab = ttk.Frame(nb)
        nb.add(self.notes_tab, text='Notes')
        nb.add(self.reminders_tab, text='Reminders')
        nb.add(self.breaks_tab, text='Breaks')

        self.build_notes_tab()
        self.build_reminders_tab()
        self.build_breaks_tab()

    # --- Notes ---
    def build_notes_tab(self):
        frame = self.notes_tab
        self.notes_text = tk.Text(frame, wrap='word', undo=True)
        self.notes_text.pack(fill='both', expand=True, padx=8, pady=(8, 0))
        self.notes_text.insert('1.0', self.settings.get('notes', ''))
        self.notes_status = ttk.Label(frame, text='')
        self.notes_status.pack(anchor='e', padx=8, pady=4)
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
        for c, w in zip(cols, (240, 80, 70, 70)):
            self.rem_tree.heading(c, text=c.title())
            self.rem_tree.column(c, width=w)
        self.rem_tree.pack(fill='both', expand=True, padx=8, pady=8)

        btns = ttk.Frame(frame)
        btns.pack(fill='x', padx=8, pady=(0, 8))
        ttk.Button(btns, text='Add', command=self.add_reminder).pack(side='left')
        ttk.Button(btns, text='Edit', command=self.edit_reminder).pack(side='left', padx=4)
        ttk.Button(btns, text='Delete', command=self.delete_reminder).pack(side='left')

        self.refresh_reminders()

    def refresh_reminders(self):
        self.rem_tree.delete(*self.rem_tree.get_children())
        for i, r in enumerate(self.settings['reminders']):
            self.rem_tree.insert('', 'end', iid=str(i),
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
        win = tk.Toplevel(self.root)
        win.title('Reminder')
        win.grab_set()

        ttk.Label(win, text='Title').grid(row=0, column=0, sticky='w', padx=6, pady=4)
        title_var = tk.StringVar(value=data['title'])
        ttk.Entry(win, textvariable=title_var, width=30).grid(row=0, column=1, padx=6, pady=4)

        ttk.Label(win, text='Category').grid(row=1, column=0, sticky='w', padx=6, pady=4)
        cat_var = tk.StringVar(value=data['category'])
        ttk.Combobox(win, textvariable=cat_var, values=['Work', 'Health', 'Other'],
                     state='readonly', width=27).grid(row=1, column=1, padx=6, pady=4)

        ttk.Label(win, text='Time (HH:MM, 24h)').grid(row=2, column=0, sticky='w', padx=6, pady=4)
        time_var = tk.StringVar(value=data['time'])
        ttk.Entry(win, textvariable=time_var, width=30).grid(row=2, column=1, padx=6, pady=4)

        enabled_var = tk.BooleanVar(value=data['enabled'])
        ttk.Checkbutton(win, text='Enabled', variable=enabled_var).grid(row=3, column=1, sticky='w', padx=6, pady=4)

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

        ttk.Button(win, text='Save', command=on_save).grid(row=4, column=0, columnspan=2, pady=8)

    # --- Breaks ---
    def build_breaks_tab(self):
        frame = self.breaks_tab
        self.break_vars = {}
        for key, b in self.settings['breaks'].items():
            lf = ttk.LabelFrame(frame, text=b['label'])
            lf.pack(fill='x', padx=8, pady=6)

            enabled_var = tk.BooleanVar(value=b['enabled'])
            ttk.Checkbutton(lf, text='Enabled', variable=enabled_var).grid(row=0, column=0, sticky='w', padx=6, pady=4)

            ttk.Label(lf, text='Every (minutes)').grid(row=0, column=1, sticky='e', padx=6)
            interval_var = tk.IntVar(value=b['interval_min'])
            ttk.Spinbox(lf, from_=1, to=480, textvariable=interval_var, width=6).grid(row=0, column=2, padx=6)

            ttk.Label(lf, text='Message').grid(row=1, column=0, sticky='w', padx=6, pady=4)
            msg_var = tk.StringVar(value=b['message'])
            ttk.Entry(lf, textvariable=msg_var, width=50).grid(row=1, column=1, columnspan=2, padx=6, pady=4, sticky='we')

            ttk.Button(lf, text='Test now', command=lambda mv=msg_var, lbl=b['label']: notify(lbl, mv.get())) \
                .grid(row=0, column=3, rowspan=2, padx=6)

            self.break_vars[key] = (enabled_var, interval_var, msg_var)

        ttk.Button(frame, text='Save break settings', command=self.save_breaks).pack(pady=8)

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
    d.ellipse((8, 8, 56, 56), fill=(37, 99, 235))
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
