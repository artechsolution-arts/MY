"""Pure timing logic, kept dependency-free so it can be tested without tkinter/tray/toast imports."""


def due_break(last_fired_ts, interval_min, now_ts):
    if interval_min <= 0:
        return False
    return (now_ts - last_fired_ts) >= interval_min * 60


def due_reminder(time_str, last_fired_date, now):
    return now.strftime('%H:%M') == time_str and last_fired_date != now.strftime('%Y-%m-%d')
