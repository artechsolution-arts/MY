import datetime
from scheduler_logic import due_break, due_reminder

assert due_break(0, 20, 20 * 60) is True
assert due_break(0, 20, 19 * 60) is False
assert due_break(100, 0, 999999) is False  # interval 0 = disabled

now = datetime.datetime(2026, 8, 12, 9, 30)
assert due_reminder("09:30", None, now) is True
assert due_reminder("09:30", "2026-08-12", now) is False  # already fired today
assert due_reminder("09:31", None, now) is False

print("OK")
